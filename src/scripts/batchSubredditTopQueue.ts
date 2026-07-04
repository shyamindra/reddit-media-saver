import { loadAppConfig } from '../config/appConfig';
import { chunk, sleep, waitForProcess } from '../utils/processUtils';
import { runSubredditQueue } from '../workflows/subredditQueueWorkflow';

const DEFAULT_SUBREDDITS = [
  'softcorenights2',
  'BGradeQueens',
  'indian_item_songs',
  'SouthIndianAngels',
  'SuperModelIndia',
  'MoviePornIndia',
  'NavelNSFW',
  'Sareebeauties',
  'hottamilcelebs',
  'DesiDivaGallery',
  'KoreanActressFAP',
  'KoreanCelebrityFap',
  'JizzedToThis',
  'celebnsfw',
];

interface CliOptions {
  subreddits: string[];
  parallel: number;
  cooldownMs: number;
  staggerMs: number;
  batchPauseMs: number;
  limit: number;
  sort: 'top' | 'hot' | 'new';
  time: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  delayMs: number;
  waitPids: number[];
  waitPollMs: number;
  dryRun: boolean;
}

function parseArgs(): CliOptions {
  const config = loadAppConfig();
  const args = process.argv.slice(2);
  const options: CliOptions = {
    subreddits: [...DEFAULT_SUBREDDITS],
    parallel: 3,
    cooldownMs: config.batch.cooldownBetweenBatchesMs,
    staggerMs: 0,
    batchPauseMs: 0,
    limit: 100,
    sort: 'top',
    time: 'all',
    delayMs: config.batch.delayBetweenUrlsMs,
    waitPids: [],
    waitPollMs: 900_000,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--subreddit':
      case '-s':
        options.subreddits = [args[++i].replace(/^r\//, '')];
        break;
      case '--subs':
        options.subreddits = args[++i]
          .split(',')
          .map((s) => s.trim().replace(/^r\//, ''))
          .filter(Boolean);
        break;
      case '--parallel':
      case '-p':
        options.parallel = parseInt(args[++i], 10);
        break;
      case '--cooldown':
      case '--cooldown-ms':
        options.cooldownMs = parseInt(args[++i], 10);
        break;
      case '--cooldown-minutes':
        options.cooldownMs = parseInt(args[++i], 10) * 60_000;
        break;
      case '--stagger-minutes':
        options.staggerMs = parseInt(args[++i], 10) * 60_000;
        break;
      case '--stagger-ms':
        options.staggerMs = parseInt(args[++i], 10);
        break;
      case '--batch-pause-ms':
        options.batchPauseMs = parseInt(args[++i], 10);
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--delay':
      case '-d':
        options.delayMs = parseInt(args[++i], 10);
        break;
      case '--wait-pid':
        options.waitPids.push(parseInt(args[++i], 10));
        break;
      case '--wait-poll-minutes':
        options.waitPollMs = parseInt(args[++i], 10) * 60_000;
        break;
      case '--dry-run':
        options.dryRun = true;
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
Batch Subreddit Top Queue

Runs top-N downloads for multiple subreddits in parallel waves, with a cooldown
between each wave. Uses JSON discovery + download runner (no OAuth, no npm spawn).

Close Firefox before starting so yt-dlp can read cookies.

Usage:
  npm run download-subreddit-queue [options]

Options:
  --subs <a,b,c>         Comma-separated subreddit list
  --subreddit, -s <name> Single subreddit (overrides default list)
  --parallel, -p <n>     Subreddits per wave (default: 3)
  --cooldown-minutes <n> Minutes between waves (default: 10)
  --cooldown-ms <ms>     Milliseconds between waves (overrides --cooldown-minutes)
  --stagger-minutes <n>  Delay each additional sub in a wave by N min (default: 0)
  --stagger-ms <ms>      Stagger in milliseconds (overrides --stagger-minutes)
  --batch-pause-ms <ms>  Pause after every 15 URLs, forwarded to downloader
  --limit, -l <n>        Posts per subreddit (default: 100)
  --delay, -d <ms>       Delay between post downloads (default: 8000)
  --wait-pid <pid>       Wait for a running process before starting (repeatable)
  --wait-poll-minutes <n>  Minutes between wait checks (default: 15)
  --dry-run              Print the plan without downloading
  --help, -h             Show this help

Default subreddits:
  ${DEFAULT_SUBREDDITS.join(', ')}

Examples:
  npm run download-subreddit-queue
  npm run download-subreddit-queue -- --cooldown-minutes 15
  npm run download-subreddit-queue -- --wait-pid 12345 --wait-pid 12346
  npm run download-subreddit-queue -- --subs softcorenights2,BGradeQueens --parallel 2
`);
}

async function main(): Promise<void> {
  const options = parseArgs();
  const config = loadAppConfig();
  const waves = chunk(options.subreddits, options.parallel);

  console.log('📋 Subreddit Top Batch Queue\n');
  console.log(`   Subreddits:  ${options.subreddits.length}`);
  console.log(`   Per wave:    ${options.parallel}`);
  console.log(`   Waves:       ${waves.length}`);
  console.log(`   Per sub:     ${options.limit} (${options.sort}, t=${options.time})`);
  console.log(`   Cooldown:    ${options.cooldownMs / 60_000} min between waves`);
  if (options.staggerMs > 0) {
    console.log(`   Stagger:     ${options.staggerMs / 60_000} min between subs in a wave`);
  }
  if (options.batchPauseMs > 0) {
    console.log(`   Batch pause: ${options.batchPauseMs / 1000}s every 15 URLs`);
  }
  if (options.waitPids.length > 0) {
    console.log(`   Wait PIDs:   ${options.waitPids.join(', ')}`);
  }
  console.log('\n⚠️  Close Firefox before starting so cookies can be read.\n');

  if (options.dryRun) {
    waves.forEach((wave, index) => {
      console.log(`Wave ${index + 1}: ${wave.map((s) => `r/${s}`).join(', ')}`);
      if (index < waves.length - 1) {
        console.log(`   then wait ${options.cooldownMs / 60_000} min`);
      }
    });
    return;
  }

  for (const pid of options.waitPids) {
    console.log(`⏳ Waiting for PID ${pid} to finish (checking every ${options.waitPollMs / 60_000} min)...`);
    await waitForProcess(pid, options.waitPollMs, (activePid) => {
      console.log(`   PID ${activePid} still running (${new Date().toLocaleTimeString()})`);
    });
    console.log(`✅ PID ${pid} finished.`);
  }

  const summary = await runSubredditQueue({
    subreddits: options.subreddits,
    parallel: options.parallel,
    cooldownMs: options.cooldownMs,
    staggerMs: options.staggerMs,
    limit: options.limit,
    sort: options.sort,
    time: options.time,
    delayMs: options.delayMs,
    batchPauseEvery: config.batch.batchPauseEvery,
    batchPauseMs: options.batchPauseMs > 0 ? options.batchPauseMs : config.batch.batchPauseMs,
    perUrlTimeoutMs: config.batch.perUrlTimeoutMs,
    browser: 'firefox',
    archiveFile: config.paths.downloadArchiveFile,
    scrapeOnly: false,
  });

  const failed = summary.results.filter((r) => !r.success);
  console.log('\n📊 Queue Summary');
  console.log(`   Total:      ${summary.total}`);
  console.log(`   Successful: ${summary.successful}`);
  console.log(`   Failed:     ${summary.failed}`);
  if (failed.length > 0) {
    console.log(`   Failed subs: ${failed.map((r) => r.subreddit).join(', ')}`);
  }
  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
