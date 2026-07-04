export interface AppPaths {
  redditLinksDir: string;
  downloadsDir: string;
  extractedFilesDir: string;
  failedRequestsDir: string;
  downloadArchiveFile: string;
  failedDownloadsFile: string;
  output: {
    videos: string;
    media: string;
    gifs: string;
    notes: string;
    images: string;
  };
}

export interface AppAuthConfig {
  devServerPort: number;
  redirectUri: string;
  scope: string;
}

export interface AppBatchConfig {
  delayBetweenUrlsMs: number;
  batchPauseEvery: number;
  batchPauseMs: number;
  perUrlTimeoutMs: number;
  cooldownBetweenBatchesMs: number;
}

export interface AppConfig {
  paths: AppPaths;
  auth: AppAuthConfig;
  batch: AppBatchConfig;
  userAgent: string;
}

const DEV_SERVER_PORT = 5173;

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildOutputPaths(downloadsDir: string): AppPaths['output'] {
  return {
    videos: `${downloadsDir}/Videos`,
    media: `${downloadsDir}/Media`,
    gifs: `${downloadsDir}/Gifs`,
    notes: `${downloadsDir}/Notes`,
    images: `${downloadsDir}/Images`,
  };
}

function resolveDownloadsDir(): string {
  return process.env.REDDIT_SAVER_DOWNLOADS_DIR?.trim() || 'downloads';
}

export function createAppConfig(): AppConfig {
  const downloadsDir = resolveDownloadsDir();
  const extractedFilesDir = 'extracted_files';
  const failedRequestsDir = `${extractedFilesDir}/failed_requests`;

  return {
    paths: {
      redditLinksDir: 'reddit-links',
      downloadsDir,
      extractedFilesDir,
      failedRequestsDir,
      downloadArchiveFile: `${extractedFilesDir}/downloaded-archive.txt`,
      failedDownloadsFile: `${failedRequestsDir}/failed-firefox-downloads.txt`,
      output: buildOutputPaths(downloadsDir),
    },
    auth: {
      devServerPort: DEV_SERVER_PORT,
      redirectUri: `http://localhost:${DEV_SERVER_PORT}/auth/callback`,
      scope: 'history read',
    },
    batch: {
      delayBetweenUrlsMs: 8000,
      batchPauseEvery: 15,
      batchPauseMs: 180_000,
      perUrlTimeoutMs: 120_000,
      cooldownBetweenBatchesMs: 600_000,
    },
    userAgent: DEFAULT_USER_AGENT,
  };
}

let cachedConfig: AppConfig | undefined;

export function loadAppConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = createAppConfig();
  }
  return cachedConfig;
}

/** @internal test helper */
export function resetAppConfigForTests(): void {
  cachedConfig = undefined;
}

export const appConfig = loadAppConfig();
