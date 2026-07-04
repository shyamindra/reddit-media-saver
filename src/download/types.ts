export type LinkBatchItemType = 'post' | 'comment' | 'media';

export interface LinkBatchItem {
  url: string;
  type: LinkBatchItemType;
}

import type { YtdlpFailureKind } from '../utils/ytdlpFailure';

export interface DownloadItemResult {
  url: string;
  success: boolean;
  filePath?: string;
  error?: string;
  failureKind?: YtdlpFailureKind;
}

export interface DownloadRunnerOptions {
  browser: string;
  archiveFile: string;
  delayMs: number;
  batchPauseEvery: number;
  batchPauseMs: number;
  perUrlTimeoutMs: number;
}

export interface BatchSummary {
  total: number;
  successful: number;
  failed: number;
  failedUrls: string[];
  failedDetails: Array<{ url: string; failureKind: YtdlpFailureKind }>;
  skipped: number;
}

export interface DownloadStrategy {
  downloadUrl(url: string, type: LinkBatchItemType): Promise<DownloadItemResult>;
}
