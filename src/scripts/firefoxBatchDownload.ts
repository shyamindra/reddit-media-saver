import { loadAppConfig } from '../config/appConfig';
import { runLinkBatchDownloadJob } from '../workflows/linkBatchDownloadJob';
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

  await runLinkBatchDownloadJob(options);

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { main };
