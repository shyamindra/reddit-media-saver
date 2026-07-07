import { join } from 'path';
import { loadAppConfig } from '../config/appConfig';
import type { LinkBatchDownloadJobOptions } from '../workflows/linkBatchDownloadJob';
import { getHelpText } from './help';
import type { CliCommand, OrganizeCliOptions, QueueCliOptions, RepairOperation, SubredditTopCliOptions, TranscodeGifsCliOptions, BatchCliOptions } from './types';

const DEFAULT_QUEUE_SUBREDDITS = [
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

function wantsHelp(args: string[]): boolean {
  return args.includes('--help') || args.includes('-h');
}

function parseDownloadArgs(args: string[]): LinkBatchDownloadJobOptions {
  const config = loadAppConfig();
  const options: LinkBatchDownloadJobOptions = {
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
    }
  }

  return options;
}

function parseSubredditTopArgs(args: string[]): SubredditTopCliOptions {
  const config = loadAppConfig();
  const options: SubredditTopCliOptions = {
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
        options.sort = args[++i] as SubredditTopCliOptions['sort'];
        break;
      case '--time':
      case '-t':
        options.time = args[++i] as SubredditTopCliOptions['time'];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--site':
        options.site = args[++i] as SubredditTopCliOptions['site'];
        break;
      case '--method':
      case '-m':
        options.method = args[++i] as SubredditTopCliOptions['method'];
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

function parseQueueArgs(args: string[]): QueueCliOptions {
  const config = loadAppConfig();
  const options: QueueCliOptions = {
    subreddits: [...DEFAULT_QUEUE_SUBREDDITS],
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
    }
  }

  return options;
}

function parseOrganizeArgs(args: string[]): OrganizeCliOptions {
  return { dryRun: args.includes('--dry-run') };
}

function parseBatchArgs(args: string[]): BatchCliOptions {
  return { dryRun: args.includes('--dry-run') };
}

function parseTranscodeGifsArgs(args: string[]): TranscodeGifsCliOptions {
  const options: TranscodeGifsCliOptions = {
    dryRun: false,
    deleteOriginal: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--delete-original':
        options.deleteOriginal = true;
        break;
      case '--source-dirs':
        options.sourceDirs = args[++i]?.split(',').map((entry) => entry.trim());
        break;
    }
  }

  return options;
}

function parseRepairOperation(
  args: string[],
): { operation: RepairOperation; transcodeOptions?: TranscodeGifsCliOptions; dryRun?: boolean } | null {
  const operation = args[0];
  if (operation === 'fix-corrupt' || operation === 'recover-html' || operation === 'integrity-scan') {
    return { operation };
  }
  if (operation === 'organize-by-pattern') {
    return { operation, dryRun: args.includes('--dry-run') };
  }
  if (operation === 'transcode-gifs') {
    return { operation, transcodeOptions: parseTranscodeGifsArgs(args.slice(1)) };
  }
  return null;
}

export function parseCli(argv: string[]): CliCommand {
  const args = [...argv];

  if (args.length === 0) {
    return { type: 'help', scope: 'root' };
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  if (wantsHelp(subArgs) || (subcommand === '--help' || subcommand === '-h')) {
    switch (subcommand) {
      case 'download':
        return { type: 'help', scope: 'download' };
      case 'subreddit-top':
        return { type: 'help', scope: 'subreddit-top' };
      case 'queue':
        return { type: 'help', scope: 'queue' };
      case 'organize':
        return { type: 'help', scope: 'organize' };
      case 'repair':
        return { type: 'help', scope: 'repair' };
      case 'batch':
        return { type: 'help', scope: 'batch' };
      default:
        return { type: 'help', scope: 'root' };
    }
  }

  switch (subcommand) {
    case 'download':
      return { type: 'download', options: parseDownloadArgs(subArgs) };
    case 'subreddit-top':
      return { type: 'subreddit-top', options: parseSubredditTopArgs(subArgs) };
    case 'queue':
      return { type: 'queue', options: parseQueueArgs(subArgs) };
    case 'organize':
      return { type: 'organize', options: parseOrganizeArgs(subArgs) };
    case 'repair': {
      if (wantsHelp(subArgs) || subArgs.length === 0) {
        return { type: 'help', scope: 'repair' };
      }
      const parsed = parseRepairOperation(subArgs);
      if (!parsed) {
        return {
          type: 'unknown',
          message: `Unknown repair operation "${subArgs[0]}".\n\n${getHelpText('repair')}`,
        };
      }
      return {
        type: 'repair',
        operation: parsed.operation,
        transcodeOptions: parsed.transcodeOptions,
        dryRun: parsed.dryRun,
      };
    }
    case 'batch': {
      if (wantsHelp(subArgs) || subArgs.length === 0) {
        return { type: 'help', scope: 'batch' };
      }
      const operation = subArgs[0];
      if (operation === 'compile-saved-remaining') {
        return {
          type: 'batch',
          operation: 'compile-saved-remaining',
          options: parseBatchArgs(subArgs.slice(1)),
        };
      }
      if (operation === 'compile-partial-remaining') {
        return {
          type: 'batch',
          operation: 'compile-partial-remaining',
          options: parseBatchArgs(subArgs.slice(1)),
        };
      }
      if (operation === 'analyze-dead') {
        return {
          type: 'batch',
          operation: 'analyze-dead',
          options: parseBatchArgs(subArgs.slice(1)),
        };
      }
      return {
        type: 'unknown',
        message: `Unknown batch operation "${operation}".\n\n${getHelpText('batch')}`,
      };
    }
    default:
      return {
        type: 'unknown',
        message: `Unknown subcommand "${subcommand}".\n\n${getHelpText('root')}`,
      };
  }
}
