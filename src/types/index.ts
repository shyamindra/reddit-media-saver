// Re-export all types from reddit.ts
export type {
  RedditPost,
  RedditComment,
  RedditApiResponse,
  OAuthToken,
  AuthConfig,
  AuthState
} from './reddit';

// Database types
export interface DatabaseConfig {
  dbPath: string;
  verbose?: boolean;
}

export interface DatabaseServiceConfig {
  dbPath: string;
  verbose?: boolean;
}

export interface ContentRecord {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  author: string;
  url: string;
  permalink: string;
  created_utc: number;
  score: number;
  num_comments?: number;
  upvote_ratio?: number;
  selftext?: string;
  body?: string;
  domain?: string;
  is_video: boolean;
  saved_at: number;
  created_at: number;
  updated_at: number;
}

export interface MediaRecord {
  id: number;
  content_id: string;
  type: string;
  url?: string;
  thumbnail_url?: string;
  local_path?: string;
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration?: number;
  extension?: string;
  downloaded_at?: number;
  download_status: string;
  error_message?: string;
  created_at: number;
}

export interface SearchFilters {
  subreddit?: string;
  author?: string;
  mediaType?: string;
  dateFrom?: number;
  dateTo?: number;
  minScore?: number;
  tags?: string[];
}

export interface SearchResult {
  content: ContentRecord;
  media: MediaRecord[];
  tags: string[];
  relevance: number;
}

// Storage types
export interface StorageConfig {
  basePath: string;
  organizeBySubreddit?: boolean;
  organizeByAuthor?: boolean;
  createSubfolders?: boolean;
  generateHtmlFiles?: boolean;
  maxConcurrentDownloads?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  subreddits: number;
  authors: number;
  lastUpdated: number;
}

// Content types
export interface ContentItem {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  author: string;
  url: string;
  permalink: string;
  created_utc: number;
  saved: boolean;
  media?: {
    type: 'image' | 'video' | 'gif' | 'text' | 'link';
    url?: string;
    thumbnail?: string;
    preview?: any;
  };
  metadata: {
    score: number;
    num_comments?: number;
    upvote_ratio?: number;
    body?: string; // For comments
    selftext?: string; // For text posts
  };
}

export interface ContentFetchOptions {
  limit?: number;
  after?: string;
  before?: string;
  type?: 'posts' | 'comments' | 'all';
}

export interface ContentFetchResult {
  items: ContentItem[];
  pagination: {
    after: string | null;
    before: string | null;
    hasMore: boolean;
  };
  totalFetched: number;
}

export interface DownloadProgress {
  itemId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'skipped';
  progress: number; // 0-100
  downloadedBytes?: number;
  totalBytes?: number;
  error?: string;
  startTime?: number;
  endTime?: number;
}

// Download types
export interface DownloadOptions {
  url: string;
  outputPath: string;
  filename?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  onProgress?: (progress: number) => void;
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  fileSize?: number;
  downloadTime?: number;
}

// App types
export interface AppConfig {
  auth: AuthConfig;
  storage: StorageConfig;
}

// Utility types
export interface MediaInfo {
  type: 'image' | 'video' | 'gif' | 'text' | 'link' | 'unknown';
  extension: string;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface SimilarityResult {
  similarity: number;
  filename: string;
}

export interface FolderConfig {
  basePath: string;
  subreddit?: string;
  author?: string;
  createSubfolders?: boolean;
}

export interface FolderGroup {
  name: string;
  path: string;
  count: number;
  size: number;
}

export interface OrganizerConfig {
  basePath: string;
  groupBy: 'subreddit' | 'author' | 'date' | 'type';
  createSubfolders: boolean;
  maxDepth: number;
}

export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  output: 'console' | 'file' | 'both';
  filePath?: string;
}

// Legacy types for backward compatibility
export interface SavedContent {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  url: string;
  permalink: string;
  created_utc: number;
  saved: boolean;
}

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface ContentMetadata {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  author: string;
  url: string;
  permalink: string;
  created_utc: number;
  score: number;
  num_comments?: number;
  upvote_ratio?: number;
  selftext?: string;
  body?: string;
  domain?: string;
  is_video: boolean;
  mediaType: 'image' | 'video' | 'gif' | 'text' | 'link';
  mediaFiles: string[];
  downloadedAt: number;
  tags: string[];
}

export interface FolderStructure {
  name: string;
  path: string;
  type: 'folder' | 'file';
  size?: number;
  children?: FolderStructure[];
}

export interface AppState {
  isAuthenticated: boolean;
  user: any | null;
  currentView: 'auth' | 'content' | 'downloads' | 'settings';
  contentItems: ContentItem[];
  downloadQueue: DownloadItem[];
  isLoading: boolean;
  error: string | null;
}

export interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  ipcRenderer: {
    send: (channel: string, data: any) => void;
    on: (channel: string, func: (...args: any[]) => void) => void;
    once: (channel: string, func: (...args: any[]) => void) => void;
  };
}
