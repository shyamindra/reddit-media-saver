import { join } from 'path';
import { loadAppConfig } from '../config/appConfig';
import { runSubredditTopWorkflow } from '../workflows/subredditTopWorkflow';
import type { SubredditTopWorkflowOptions } from '../workflows/subredditTopWorkflow';

interface CliOptions extends SubredditTopWorkflowOptions {
  batchPauseEvery: number;
}

function parseArgs(): CliOptions {
  const config = loadAppConfig();
  const args = process.argv.slice(2);
  const options: CliOptions = {
    subreddit: 'WatchItForThePlot',
    sort: 'top',
    time: 'all',
    limit: 100,
    method: 'json',
    site: 'old',
    useFirefoxProfile: false,
    headless: false,
    scrapeOnly: false,
    outputCsv: '',
    delayMs: config.batch.delayBetweenUrlsMs,
    batchPauseEvery: config.batch.batchPauseEvery,
    batchPauseMs: config.batch.batchPauseMs,
    perUrlTimeoutMs: config.batch.perUrlTimeoutMs,
    browser: 'firefox',
    archiveFile: config.paths.downloadArchiveFile,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--subreddit':
      case '-s':
        options.subreddit = args[++i].replace(/^r\//, '');
        break;
      case '--sort':
        options.sort = args[++i] as CliOptions['sort'];
        break;
      case '--time':
      case '-t':
        options.time = args[++i] as CliOptions['time'];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--site':
        options.site = args[++i] as CliOptions['site'];
        break;
      case '--method':
      case '-m':
        options.method = args[++i] as CliOptions['method'];
        break;
      case '--browser':
        options.method = 'browser';
        break;
      case '--firefox-profile':
        options.useFirefoxProfile = true;
        break;
      case '--headless':
        options.headless = true;
        break;
      case '--scrape-only':
        options.scrapeOnly = true;
        break;
      case '--output':
      case '-o':
        options.outputCsv = args[++i];
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
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  if (!options.outputCsv) {
    options.outputCsv = join(
      'reddit-links',
      'subreddit-scraped',
      `${options.sort}-${options.subreddit}.csv`,
    );
  }

  return options;
}

function printHelp(): void {
  console.log(`
Subreddit Top Downloader

Discovers post URLs from a subreddit listing, then downloads media via yt-dlp
using your Firefox session (Tampermonkey / NSFW cookies — no Reddit OAuth needed).

Discovery methods:
  json (default)  — Fetch /r/{sub}/{sort}.json using Firefox cookies (fast, reliable)
  browser         — Playwright HTML scrape of old/new Reddit (fallback)

Close Firefox before running so yt-dlp can read cookies.

Usage:
  npm run download-subreddit-top [options]

Options:
  --subreddit, -s <name>   Subreddit name (default: WatchItForThePlot)
  --sort <top|hot|new>     Listing sort (default: top)
  --time, -t <period>      top time filter: hour|day|week|month|year|all (default: all)
  --limit, -l <n>          Number of posts to collect (default: 100)
  --method, -m <json|browser>  Discovery method (default: json)
  --browser                Alias for --method browser
  --site <old|new>         Reddit UI for browser method only (default: old)
  --firefox-profile        Use real Firefox profile for browser method (Tampermonkey)
  --headless               Run browser headless (browser method only)
  --scrape-only            Only collect URLs to CSV, skip download
  --output, -o <file>      CSV output path (default: reddit-links/subreddit-scraped/...)
  --delay, -d <ms>         Delay between downloads (default: 8000)
  --batch-pause <n>        Pause after every N URLs (default: 15)
  --batch-pause-ms <ms>    Pause duration in ms (default: 180000 = 3 min)
  --help, -h               Show this help

Examples:
  npm run download-subreddit-top
  npm run download-subreddit-top -- --subreddit WatchItForThePlot --limit 100
  npm run download-subreddit-top -- --scrape-only
  npm run download-subreddit-top -- --method browser --firefox-profile
`);
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log('🔍 Subreddit Top Downloader\n');
  console.log(`   Subreddit: r/${options.subreddit}`);
  console.log(`   Sort:      ${options.sort} (t=${options.time})`);
  console.log(`   Limit:     ${options.limit}`);
  console.log(`   Method:    ${options.method}`);
  if (options.method === 'browser') {
    console.log(`   Site:      ${options.site}.reddit.com`);
  }
  if (options.scrapeOnly) console.log('   Mode:      scrape only');
  console.log('\n⚠️  Close Firefox before starting so cookies can be read.\n');

  await runSubredditTopWorkflow(options);

  if (options.scrapeOnly) {
    console.log('\n💡 To download later:');
    console.log(
      `   npm run download-firefox -- --input ${options.outputCsv} --posts-only --limit ${options.limit}`,
    );
  }

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export { main };
