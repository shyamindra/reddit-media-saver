import { appendFileSync, writeFileSync } from 'fs';
import { existsSync } from 'fs';
import { createYtdlpCookiesStrategy } from '../adapters/ytdlpCookiesStrategy';
import { loadAppConfig } from '../config/appConfig';
import { runBatch } from '../download/downloadRunner';
import type { LinkBatchItem } from '../download/types';
import { FileInputService } from '../services/fileInputService';
import { getYtdlpVersion, resolveYtdlpBinary } from '../utils/ytdlp';

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
    postsOnly: false,
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

function appendFailedDownloads(filePath: string, urls: string[]): void {
  if (urls.length === 0) return;
  const payload = urls.join('\n') + '\n';
  if (existsSync(filePath)) {
    appendFileSync(filePath, payload, 'utf8');
  } else {
    writeFileSync(filePath, payload, 'utf8');
  }
}

function toLinkBatch(
  items: ReturnType<typeof FileInputService.processRedditUrlsFromCsv>['valid'],
): LinkBatchItem[] {
  return items.map((item) => ({ url: item.url, type: item.type }));
}

async function runSingleBatch(
  options: CliOptions,
  links: LinkBatchItem[],
  batchLabel: string,
): Promise<{ total: number; successful: number; failed: number; failedUrls: string[] }> {
  if (links.length === 0) {
    console.log('❌ No URLs to process.');
    return { total: 0, successful: 0, failed: 0, failedUrls: [] };
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${batchLabel}: ${links.length} URLs`);
  console.log(`${'='.repeat(60)}\n`);

  const strategy = createYtdlpCookiesStrategy({
    browser: options.browser,
    archiveFile: options.archiveFile,
    perUrlTimeoutMs: options.perUrlTimeoutMs,
  });

  const summary = await runBatch(
    links,
    {
      browser: options.browser,
      archiveFile: options.archiveFile,
      delayMs: options.delayMs,
      batchPauseEvery: options.batchPauseEvery,
      batchPauseMs: options.batchPauseMs,
      perUrlTimeoutMs: options.perUrlTimeoutMs,
    },
    strategy,
  );

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

  const linkBatch = toLinkBatch(urls);
  const totalAvailable = linkBatch.length;
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
        `\n🧊 Cooling down ${options.cooldownBetweenBatchesMs / 1000}s before next batch...\n`,
      );
      await sleep(options.cooldownBetweenBatchesMs);
    }

    const batchLinks = linkBatch.slice(batchOffset, batchOffset + batchSize);
    const summary = await runSingleBatch(
      options,
      batchLinks,
      `Batch ${batchIndex + 1} (offset ${batchOffset}, ${batchLinks.length} URLs)`,
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
    appendFailedDownloads(failedFile, allFailedUrls);
    console.log(`\n📝 Failed URLs appended to: ${failedFile}`);
  }

  const nextOffset = startOffset + totalProcessed;
  if (nextOffset < totalAvailable) {
    const postsOnlyFlag = options.postsOnly ? ' --posts-only' : '';
    console.log(
      `\n🔄 Next batch: npm run download-firefox --${postsOnlyFlag} --offset ${nextOffset} --limit ${batchSize}`,
    );
    console.log(`   (${totalAvailable - nextOffset} URLs remaining of ${totalAvailable})`);
  }

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { main };
