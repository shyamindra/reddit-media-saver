export type LinkBatchItemType = 'post' | 'comment' | 'media';

export interface LinkBatchItem {
  url: string;
  type: LinkBatchItemType;
}

export interface DownloadItemResult {
  url: string;
  success: boolean;
  filePath?: string;
  error?: string;
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
}

export interface DownloadStrategy {
  downloadUrl(url: string, type: LinkBatchItemType): Promise<DownloadItemResult>;
}
