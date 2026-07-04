import type { HelpScope } from './types';

const ROOT_HELP = `reddit-media-saver CLI

Usage:
  npx tsx src/cli.ts <subcommand> [options]

Subcommands:
  download         Download media from a CSV link batch (Firefox cookies + yt-dlp)
  subreddit-top    Scrape subreddit listing and download posts
  queue            Run multiple subreddit-top jobs in parallel waves
  organize         Group downloaded files by filename similarity
  repair           Fix corrupted media and recover videos from HTML notes

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

const ORGANIZE_HELP = `organize — group downloads by filename similarity

Usage:
  npx tsx src/cli.ts organize [options]

Options:
  --dry-run           Show grouping plan without moving files
  --help, -h          Show this help
`;

const REPAIR_HELP = `repair — fix corrupted downloads and recover embedded videos

Usage:
  npx tsx src/cli.ts repair <operation> [options]

Operations:
  fix-corrupt         Rename HTML-as-media files to .txt (Images/Videos/Gifs)
  recover-html        Extract and download video URLs from HTML Notes files
  transcode-gifs      Convert local .gif / .gifv files to .mp4 in Videos/

Options (transcode-gifs):
  --dry-run           List targets without converting
  --delete-original   Delete source files after successful conversion
  --source-dirs       Comma-separated scan folders (default: Gifs,Media,Videos)

Options:
  --help, -h          Show this help

Examples:
  npx tsx src/cli.ts repair fix-corrupt
  npx tsx src/cli.ts repair recover-html
  npx tsx src/cli.ts repair transcode-gifs --dry-run
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
