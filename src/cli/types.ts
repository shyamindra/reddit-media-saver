import type { LinkBatchDownloadJobOptions } from '../workflows/linkBatchDownloadJob';
import type { SubredditTopWorkflowOptions } from '../workflows/subredditTopWorkflow';

export type HelpScope = 'root' | 'download' | 'subreddit-top' | 'queue' | 'organize' | 'repair';

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

export type CliCommand =
  | { type: 'help'; scope: HelpScope }
  | { type: 'download'; options: LinkBatchDownloadJobOptions }
  | { type: 'subreddit-top'; options: SubredditTopCliOptions }
  | { type: 'queue'; options: QueueCliOptions }
  | { type: 'organize'; passthrough: string[] }
  | { type: 'repair'; passthrough: string[] }
  | { type: 'unknown'; message: string };
