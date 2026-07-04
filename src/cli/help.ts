import type { HelpScope } from './types';

const ROOT_HELP = `reddit-media-saver CLI

Usage:
  npx tsx src/cli.ts <subcommand> [options]

Subcommands:
  download         Download media from a CSV link batch (Firefox cookies + yt-dlp)
  subreddit-top    Scrape subreddit listing and download posts
  queue            Run multiple subreddit-top jobs in parallel waves
  organize         Organize downloaded files (stub — see repair scripts)
  repair           Fix corrupted downloads and transcode GIFs (stub until #15)

Global:
  --help, -h       Show help for a subcommand

Examples:
  npx tsx src/cli.ts download --posts-only --limit 5
  npx tsx src/cli.ts subreddit-top --subreddit WatchItForThePlot --scrape-only
  npx tsx src/cli.ts queue --subs a,b,c --parallel 2

Smoke test (no Reddit requests):
  npm test -- --testPathPatterns="cli|downloadRunner|subredditTopWorkflow"
`;

const DOWNLOAD_HELP = `download — CSV link batch via download runner

Usage:
  npx tsx src/cli.ts download [options]

Options:
  --input, -i <path>              CSV file or directory (default: reddit-links)
  --limit, -l <n>                 Process only N URLs
  --offset, -o <n>                Skip first N URLs
  --delay, -d <ms>                Delay between URLs
  --batch-pause <n>               Pause after every N URLs
  --batch-pause-ms <ms>           Pause duration in ms
  --browser, -b <name>            Browser for cookies (default: firefox)
  --posts-only                    Skip comment URLs
  --chain, -c <n>                 Run N consecutive batches
  --cooldown-between-batches <ms> Pause between chained batches
  --per-url-timeout <ms>          Per-URL yt-dlp timeout
  --help, -h                      Show this help
`;

const SUBREDDIT_TOP_HELP = `subreddit-top — scrape listing and download posts

Usage:
  npx tsx src/cli.ts subreddit-top [options]

Options:
  --subreddit, -s <name>          Subreddit name (default: WatchItForThePlot)
  --sort <top|hot|new>            Listing sort (default: top)
  --time, -t <period>             top time filter: hour|day|week|month|year|all
  --limit, -l <n>                 Number of posts (default: 100)
  --method, -m <json|browser>     Discovery method (default: json)
  --browser                       Alias for --method browser
  --site <old|new>                Reddit UI for browser method
  --firefox-profile               Use real Firefox profile (browser method)
  --headless                      Run browser headless
  --scrape-only                   Collect URLs to CSV only
  --output, -o <file>             CSV output path
  --delay, -d <ms>                Delay between downloads
  --batch-pause <n>               Pause after every N URLs
  --batch-pause-ms <ms>           Pause duration in ms
  --help, -h                      Show this help
`;

const QUEUE_HELP = `queue — multi-subreddit batch queue

Usage:
  npx tsx src/cli.ts queue [options]

Options:
  --subs <a,b,c>                  Comma-separated subreddit list
  --subreddit, -s <name>          Single subreddit (overrides default list)
  --parallel, -p <n>              Subreddits per wave (default: 3)
  --cooldown-minutes <n>          Minutes between waves
  --cooldown-ms <ms>              Milliseconds between waves
  --stagger-minutes <n>           Stagger subs within a wave
  --stagger-ms <ms>               Stagger in milliseconds
  --batch-pause-ms <ms>           Pause after every 15 URLs
  --limit, -l <n>                 Posts per subreddit (default: 100)
  --delay, -d <ms>                Delay between post downloads
  --wait-pid <pid>                Wait for process before starting (repeatable)
  --wait-poll-minutes <n>         Minutes between wait checks
  --dry-run                       Print plan without downloading
  --help, -h                      Show this help
`;

const ORGANIZE_HELP = `organize — file organization (stub until #15)

This subcommand will consolidate organize-downloads scripts in slice #15.

For now, use legacy scripts directly:
  npm run organize-downloads
  npm run organize-downloads-advanced
  npm run organize-videos-custom
  npm run move-gifs
`;

const REPAIR_HELP = `repair — fix and transcode downloaded media (stub until #15)

This subcommand will consolidate repair scripts in slice #15.

For now, use legacy scripts directly:
  npm run fix-corrupted-files
  npm run fix-corrupted-videos
  npm run transcode-gifs
  npm run extract-videos-from-text
`;

export function getHelpText(scope: HelpScope): string {
  switch (scope) {
    case 'root':
      return ROOT_HELP;
    case 'download':
      return DOWNLOAD_HELP;
    case 'subreddit-top':
      return SUBREDDIT_TOP_HELP;
    case 'queue':
      return QUEUE_HELP;
    case 'organize':
      return ORGANIZE_HELP;
    case 'repair':
      return REPAIR_HELP;
  }
}

export function printHelp(scope: HelpScope): void {
  console.log(getHelpText(scope));
}
