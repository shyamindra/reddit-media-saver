import type { LinkBatchDownloadJobOptions } from '../workflows/linkBatchDownloadJob';
import type { SubredditTopWorkflowOptions } from '../workflows/subredditTopWorkflow';

export type HelpScope = 'root' | 'download' | 'subreddit-top' | 'queue' | 'organize' | 'repair' | 'batch';

export type BatchOperation =
  | 'compile-saved-remaining'
  | 'compile-partial-remaining'
  | 'analyze-dead';

export interface BatchCliOptions {
  dryRun: boolean;
}

export interface QueueCliOptions {
  subreddits: string[];
  parallel: number;
  cooldownMs: number;
  staggerMs: number;
  batchPauseMs: number;
  limit: number;
  sort: SubredditTopWorkflowOptions['sort'];
  time: SubredditTopWorkflowOptions['time'];
  delayMs: number;
  waitPids: number[];
  waitPollMs: number;
  dryRun: boolean;
}

export interface SubredditTopCliOptions extends SubredditTopWorkflowOptions {
  batchPauseEvery: number;
}

export interface OrganizeCliOptions {
  dryRun: boolean;
}

export type RepairOperation =
  | 'fix-corrupt'
  | 'recover-html'
  | 'transcode-gifs'
  | 'organize-by-pattern'
  | 'integrity-scan';

export interface TranscodeGifsCliOptions {
  dryRun: boolean;
  deleteOriginal: boolean;
  sourceDirs?: string[];
}

export type CliCommand =
  | { type: 'help'; scope: HelpScope }
  | { type: 'download'; options: LinkBatchDownloadJobOptions }
  | { type: 'subreddit-top'; options: SubredditTopCliOptions }
  | { type: 'queue'; options: QueueCliOptions }
  | { type: 'organize'; options: OrganizeCliOptions }
  | { type: 'repair'; operation: RepairOperation; transcodeOptions?: TranscodeGifsCliOptions; dryRun?: boolean }
  | { type: 'batch'; operation: BatchOperation; options: BatchCliOptions }
  | { type: 'unknown'; message: string };
