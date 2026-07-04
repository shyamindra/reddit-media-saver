import { spawn, spawnSync } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { loadAppConfig } from '../config/appConfig';
import { FileInputService } from '../services/fileInputService';

interface CliOptions {
  inputDir: string;
  limit?: number;
  offset?: number;
  delayMs: number;
  batchPauseEvery: number;
  batchPauseMs: number;
  cooldownBetweenBatchesMs: number;
  chainBatches: number;
  perUrlTimeoutMs: number;
  browser: string;
  archiveFile: string;
  postsOnly: boolean;
}

interface DownloadResult {
  url: string;
  success: boolean;
  filePath?: string;
  error?: string;
}

const MEDIA_HOSTS =
  /https?:\/\/(?:[a-z0-9-]+\.)?(?:redd\.it|redditmedia\.com|redgifs\.com|imgur\.com|gfycat\.com)\/[^\s"'<>]+/gi;

function resolveYtdlpBinary(): string {
  const candidates = ['/opt/homebrew/bin/yt-dlp', '/usr/local/bin/yt-dlp', 'yt-dlp'];
  for (const candidate of candidates) {
    if (candidate.includes('/')) {
      if (existsSync(candidate)) return candidate;
      continue;
    }
    const found = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (found.status === 0 && found.stdout.trim()) {
      return found.stdout.trim();
    }
  }
  return 'yt-dlp';
}

function getYtdlpVersion(binary: string): string {
  const result = spawnSync(binary, ['--version'], { encoding: 'utf8' });
  return result.stdout.trim() || 'unknown';
}

class FirefoxBatchDownloader {
  private config = loadAppConfig();
  private videoDir = this.config.paths.output.videos;
  private mediaDir = this.config.paths.output.media;
  private notesDir = this.config.paths.output.notes;
  private options: CliOptions;
  private ytdlpBin: string;

  constructor(options: CliOptions) {
    this.options = options;
    this.ytdlpBin = resolveYtdlpBinary();
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    for (const dir of [this.videoDir, this.mediaDir, this.notesDir, this.config.paths.failedRequestsDir]) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 180);
  }

  private async runYtdlp(args: string[], retriesOn429 = 3): Promise<{ code: number; stdout: string; stderr: string; timedOut?: boolean }> {
    for (let attempt = 0; attempt <= retriesOn429; attempt++) {
      const result = await new Promise<{ code: number; stdout: string; stderr: string; timedOut?: boolean }>((resolve, reject) => {
        const child = spawn(this.ytdlpBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        let redirectLoopCount = 0;

        // Hard cap on how long a single URL may run before we kill it.
        const timeout = setTimeout(() => {
          timedOut = true;
          console.log(`\n   ⏱️  URL exceeded ${this.options.perUrlTimeoutMs / 1000}s — killing yt-dlp and moving on.`);
          child.kill('SIGKILL');
        }, this.options.perUrlTimeoutMs);

        const checkRedirectLoop = (text: string): void => {
          const loopHits = (text.match(/Following redirect to|Downloading JSON metadata/g) ?? []).length;
          redirectLoopCount += loopHits;
          if (redirectLoopCount > 8) {
            timedOut = true;
            console.log(`\n   🔁 Redirect loop detected — killing yt-dlp and moving on.`);
            child.kill('SIGKILL');
          }
        };

        child.stdout.on('data', (chunk) => {
          const text = chunk.toString();
          stdout += text;
          process.stdout.write(text);
          checkRedirectLoop(text);
        });

        child.stderr.on('data', (chunk) => {
          const text = chunk.toString();
          stderr += text;
          process.stderr.write(text);
          checkRedirectLoop(text);
        });

        child.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        child.on('close', (code) => {
          clearTimeout(timeout);
          resolve({ code: code ?? 1, stdout, stderr, timedOut });
        });
      });

      if (result.timedOut) {
        return result;
      }

      const combined = `${result.stdout}\n${result.stderr}`;
      const is429 = combined.includes('429') || combined.includes('Too Many Requests');

      if (result.code === 0 || !is429 || attempt === retriesOn429) {
        return result;
      }

      const waitMs = [90_000, 180_000, 300_000][attempt] ?? 300_000;
      console.log(`\n   ⏳ Rate limited (429). Waiting ${waitMs / 1000}s before retry ${attempt + 1}/${retriesOn429}...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    return { code: 1, stdout: '', stderr: 'Rate limit retries exhausted' };
  }

  private extractMediaUrls(output: string): string[] {
    const found = new Set<string>();

    const mediaRedirect = /reddit\.com\/media\?url=([^&\s"'<>]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = mediaRedirect.exec(output)) !== null) {
      try {
        found.add(decodeURIComponent(match[1]));
      } catch {
        // ignore malformed URLs
      }
    }

    const directMatches = output.match(MEDIA_HOSTS) ?? [];
    for (const url of directMatches) {
      found.add(url.replace(/[),.;]+$/, ''));
    }

    return [...found];
  }

  private titleFromUrl(url: string): string {
    const match = url.match(/\/comments\/[^/]+\/([^/?]+)/);
    if (match?.[1] && match[1] !== 'comment') {
      return this.sanitizeFilename(match[1].replace(/_/g, ' '));
    }
    return 'reddit_post';
  }

  private pickOutputDir(mediaUrl: string): string {
    if (/\.gif$/i.test(mediaUrl)) return this.config.paths.output.gifs;
    return this.mediaDir;
  }

  private async downloadDirectMedia(mediaUrl: string, title: string): Promise<string> {
    const extMatch = mediaUrl.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
    const ext = extMatch ? extMatch[1] : 'bin';
    const outputDir = this.pickOutputDir(mediaUrl);
    mkdirSync(outputDir, { recursive: true });

    const filePath = join(outputDir, `${title}.${ext}`);
    if (existsSync(filePath)) {
      return filePath;
    }

    const response = await axios.get(mediaUrl, {
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': this.config.userAgent,
      }
    });

    await new Promise<void>((resolve, reject) => {
      const writer = createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    return filePath;
  }

  private async downloadWithYtdlp(url: string): Promise<DownloadResult> {
    const outputTemplate = join(this.videoDir, '%(title)s.%(ext)s');
    const args = [
      '--cookies-from-browser',
      this.options.browser,
      '-o',
      outputTemplate,
      '--no-playlist',
      '--no-warnings',
      '--retries',
      '3',
      '--merge-output-format',
      'mp4',
      '--sleep-interval',
      '2',
      '--max-sleep-interval',
      '6',
      '--download-archive',
      this.options.archiveFile,
      url
    ];

    const { code, stdout, stderr } = await this.runYtdlp(args);
    const combined = `${stdout}\n${stderr}`;

    if (code === 0) {
      const destination = combined.match(/Destination: (.+)/)?.[1];
      const merged = combined.match(/Merging formats into "(.+?)"/)?.[1];
      return { url, success: true, filePath: merged ?? destination };
    }

    return { url, success: false, error: combined };
  }

  private async downloadCommentText(url: string, title: string): Promise<DownloadResult> {
    try {
      const { stdout, stderr, code } = await this.runYtdlp([
        '--cookies-from-browser',
        this.options.browser,
        '--print',
        'description',
        '--no-download',
        '--no-warnings',
        url
      ]);

      const text = stdout.trim() || stderr.trim();
      if (!text || code !== 0) {
        return { url, success: false, error: 'Could not extract comment text' };
      }

      const filePath = join(this.notesDir, `${title}.txt`);
      writeFileSync(filePath, `${url}\n\n${text}`, 'utf8');
      return { url, success: true, filePath };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { url, success: false, error: message };
    }
  }

  async downloadUrl(url: string, type: 'post' | 'comment' | 'media'): Promise<DownloadResult> {
    const fallbackTitle = this.titleFromUrl(url);
    console.log(`\n📥 ${type}: ${fallbackTitle}`);
    console.log(`   🔗 ${url}`);

    const ytdlpResult = await this.downloadWithYtdlp(url);
    if (ytdlpResult.success) {
      console.log(`   ✅ Saved: ${ytdlpResult.filePath}`);
      return ytdlpResult;
    }

    const mediaUrls = this.extractMediaUrls(ytdlpResult.error ?? '');
    if (mediaUrls.length > 0) {
      for (const mediaUrl of mediaUrls) {
        try {
          const filePath = await this.downloadDirectMedia(mediaUrl, fallbackTitle);
          console.log(`   ✅ Image fallback: ${filePath}`);
          return { url, success: true, filePath };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Direct download failed';
          console.log(`   ⚠️  Direct download failed for ${mediaUrl}: ${message}`);
        }
      }
    }

    if (type === 'comment') {
      const commentResult = await this.downloadCommentText(url, fallbackTitle);
      if (commentResult.success) {
        console.log(`   ✅ Comment saved: ${commentResult.filePath}`);
        return commentResult;
      }
    }

    console.log(`   ❌ Failed`);
    return { url, success: false, error: ytdlpResult.error ?? 'Download failed' };
  }

  async run(urls: { url: string; type: 'post' | 'comment' | 'media' }[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    failedUrls: string[];
  }> {
    let successful = 0;
    let failed = 0;
    const failedUrls: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      console.log(`\n[${i + 1}/${urls.length}]`);
      const result = await this.downloadUrl(urls[i].url, urls[i].type);

      if (result.success) {
        successful++;
      } else {
        failed++;
        failedUrls.push(urls[i].url);
      }

      if (i < urls.length - 1 && this.options.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.options.delayMs));
      }

      const processed = i + 1;
      if (
        this.options.batchPauseEvery > 0 &&
        this.options.batchPauseMs > 0 &&
        processed < urls.length &&
        processed % this.options.batchPauseEvery === 0
      ) {
        console.log(
          `\n⏸️  Processed ${processed} URLs. Pausing ${this.options.batchPauseMs / 1000}s to avoid rate limits...\n`
        );
        await new Promise((resolve) => setTimeout(resolve, this.options.batchPauseMs));
      }
    }

    return { total: urls.length, successful, failed, failedUrls };
  }
}

function parseArgs(): CliOptions {
  const config = loadAppConfig();
  const args = process.argv.slice(2);
  const options: CliOptions = {
    inputDir: config.paths.redditLinksDir,
    delayMs: config.batch.delayBetweenUrlsMs,
    batchPauseEvery: config.batch.batchPauseEvery,
    batchPauseMs: config.batch.batchPauseMs,
    cooldownBetweenBatchesMs: config.batch.cooldownBetweenBatchesMs,
    chainBatches: 1,
    perUrlTimeoutMs: config.batch.perUrlTimeoutMs,
    browser: 'firefox',
    archiveFile: config.paths.downloadArchiveFile,
    postsOnly: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        options.inputDir = args[++i];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--offset':
      case '-o':
        options.offset = parseInt(args[++i], 10);
        break;
      case '--delay':
      case '-d':
        options.delayMs = parseInt(args[++i], 10);
        break;
      case '--batch-pause':
        options.batchPauseEvery = parseInt(args[++i], 10);
        break;
      case '--batch-pause-ms':
        options.batchPauseMs = parseInt(args[++i], 10);
        break;
      case '--browser':
      case '-b':
        options.browser = args[++i];
        break;
      case '--posts-only':
        options.postsOnly = true;
        break;
      case '--chain':
      case '-c':
        options.chainBatches = parseInt(args[++i], 10);
        break;
      case '--cooldown-between-batches':
        options.cooldownBetweenBatchesMs = parseInt(args[++i], 10);
        break;
      case '--per-url-timeout':
        options.perUrlTimeoutMs = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Firefox Batch Downloader

Downloads Reddit posts from CSV files using your Firefox session (Tampermonkey / NSFW access).
No Reddit API login required. Close Firefox before running so yt-dlp can read cookies.

Usage:
  npm run download-firefox [options]

Options:
  --input, -i <dir>     CSV input directory (default: reddit-links)
  --limit, -l <n>       Process only N URLs
  --offset, -o <n>      Skip first N URLs
  --delay, -d <ms>      Delay between URLs (default: 8000)
  --batch-pause <n>     Pause after every N URLs (default: 15)
  --batch-pause-ms <ms> Pause duration in ms (default: 180000 = 3 min)
  --browser, -b <name>  Browser for cookies (default: firefox)
  --posts-only          Skip comment URLs (text-only saved comments)
  --chain, -c <n>       Run N consecutive batches (uses --limit per batch)
  --cooldown-between-batches <ms>  Pause between chained batches (default: 600000 = 10 min)
  --help, -h            Show this help

Examples:
  npm run download-firefox:test          # Test with 5 URLs
  npm run download-firefox -- --limit 50
  npm run download-firefox -- --offset 50 --limit 50
`);
}

function dedupeUrls<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSingleBatch(
  options: CliOptions,
  urls: { url: string; type: 'post' | 'comment' | 'media' }[],
  batchLabel: string
): Promise<{ total: number; successful: number; failed: number; failedUrls: string[] }> {
  if (urls.length === 0) {
    console.log('❌ No URLs to process.');
    return { total: 0, successful: 0, failed: 0, failedUrls: [] };
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${batchLabel}: ${urls.length} URLs`);
  console.log(`${'='.repeat(60)}\n`);

  const downloader = new FirefoxBatchDownloader(options);
  const summary = await downloader.run(urls);

  console.log('\n📊 Batch Summary');
  console.log(`   Total:      ${summary.total}`);
  console.log(`   Successful: ${summary.successful}`);
  console.log(`   Failed:     ${summary.failed}`);

  return summary;
}

async function main(): Promise<void> {
  const options = parseArgs();
  const ytdlpBin = resolveYtdlpBinary();

  console.log('🦊 Firefox Batch Downloader\n');
  console.log(`   yt-dlp:  ${ytdlpBin} (${getYtdlpVersion(ytdlpBin)})`);
  console.log(`   Browser: ${options.browser}`);
  console.log(`   Input:   ${options.inputDir}/`);
  console.log(`   Delay:   ${options.delayMs}ms between URLs`);
  console.log(`   Pause:   ${options.batchPauseMs / 1000}s every ${options.batchPauseEvery} URLs`);
  if (options.limit) console.log(`   Limit:   ${options.limit}`);
  if (options.offset) console.log(`   Offset:  ${options.offset}`);
  if (options.chainBatches > 1) {
    console.log(`   Chain:   ${options.chainBatches} batches`);
    console.log(`   Cooldown between batches: ${options.cooldownBetweenBatchesMs / 1000}s`);
  }
  console.log('\n⚠️  Close Firefox before starting so yt-dlp can read your cookies.\n');

  const { valid } = FileInputService.processRedditUrlsFromCsv(options.inputDir);
  const allUnique = dedupeUrls(valid);
  const postCount = allUnique.filter((u) => u.type === 'post' || u.type === 'media').length;
  const commentCount = allUnique.filter((u) => u.type === 'comment').length;

  console.log('📋 URL inventory:');
  console.log(`   Posts:    ${postCount}`);
  console.log(`   Comments: ${commentCount}`);
  console.log(`   Total:    ${allUnique.length} unique URLs`);
  if (options.postsOnly) {
    console.log(`   Mode:     posts only (${postCount} URLs)`);
  }
  console.log('');

  let urls = allUnique.sort((a, b) => {
    const order = { post: 0, media: 1, comment: 2, invalid: 3 };
    return order[a.type] - order[b.type];
  });

  if (options.postsOnly) {
    urls = urls.filter((u) => u.type === 'post' || u.type === 'media');
  }

  const totalAvailable = urls.length;
  const batchSize = options.limit ?? 50;
  const startOffset = options.offset ?? 0;
  const batchesToRun = options.chainBatches;

  let totalSuccessful = 0;
  let totalFailed = 0;
  let totalProcessed = 0;
  const allFailedUrls: string[] = [];

  for (let batchIndex = 0; batchIndex < batchesToRun; batchIndex++) {
    const batchOffset = startOffset + batchIndex * batchSize;
    if (batchOffset >= totalAvailable) {
      console.log(`\n✅ All URLs processed (reached end at offset ${batchOffset}).`);
      break;
    }

    if (batchIndex > 0) {
      console.log(
        `\n🧊 Cooling down ${options.cooldownBetweenBatchesMs / 1000}s before next batch...\n`
      );
      await sleep(options.cooldownBetweenBatchesMs);
    }

    const batchUrls = urls.slice(batchOffset, batchOffset + batchSize);
    const summary = await runSingleBatch(
      options,
      batchUrls,
      `Batch ${batchIndex + 1} (offset ${batchOffset}, ${batchUrls.length} URLs)`
    );

    totalSuccessful += summary.successful;
    totalFailed += summary.failed;
    totalProcessed += summary.total;
    allFailedUrls.push(...summary.failedUrls);
  }

  if (batchesToRun > 1) {
    console.log('\n📊 Chain Summary');
    console.log(`   Total processed: ${totalProcessed}`);
    console.log(`   Successful: ${totalSuccessful}`);
    console.log(`   Failed:     ${totalFailed}`);
  }

  if (allFailedUrls.length > 0) {
    const failedFile = loadAppConfig().paths.failedDownloadsFile;
    writeFileSync(failedFile, allFailedUrls.join('\n'), 'utf8');
    console.log(`\n📝 Failed URLs saved to: ${failedFile}`);
  }

  const nextOffset = startOffset + totalProcessed;
  if (nextOffset < totalAvailable) {
    const postsOnlyFlag = options.postsOnly ? ' --posts-only' : '';
    console.log(
      `\n🔄 Next batch: npm run download-firefox --${postsOnlyFlag} --offset ${nextOffset} --limit ${batchSize}`
    );
    console.log(`   (${totalAvailable - nextOffset} URLs remaining of ${totalAvailable})`);
  }

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { FirefoxBatchDownloader, main };
