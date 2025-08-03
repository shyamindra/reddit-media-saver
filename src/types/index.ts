// Reddit API Types
export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  created_utc: number;
  score: number;
  num_comments: number;
  is_video: boolean;
  media?: {
    reddit_video?: {
      fallback_url: string;
    };
  };
  preview?: {
    images: Array<{
      source: {
        url: string;
        width: number;
        height: number;
      };
    }>;
  };
  post_hint?: string;
  domain: string;
  selftext?: string;
}

export interface RedditComment {
  id: string;
  body: string;
  author: string;
  subreddit: string;
  link_id: string;
  parent_id: string;
  created_utc: number;
  score: number;
  permalink: string;
}

export interface SavedContent {
  kind: 't1' | 't3'; // t1 = comment, t3 = post
  data: RedditPost | RedditComment;
}

// Authentication Types
export interface AuthState {
  isAuthenticated: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: {
    name: string;
    id: string;
  };
}

// Download Types
export interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
  status: 'idle' | 'downloading' | 'completed' | 'error';
}

export interface DownloadItem {
  id: string;
  type: 'post' | 'comment';
  title: string;
  subreddit: string;
  url: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
  localPath?: string;
  metadata?: unknown;
}

// File System Types
export interface ContentMetadata {
  id: string;
  type: 'post' | 'comment';
  mediaType: 'image' | 'video' | 'note';
  title: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  created_utc: number;
  score: number;
  localPath: string;
  mediaFiles: string[];
  folderPath: string;
  category?: string; // For notes categorization
  downloadedAt: number;
}

export interface FolderStructure {
  images: {
    [subfolder: string]: string[]; // filename -> filepath mapping
  };
  videos: {
    [subfolder: string]: string[]; // filename -> filepath mapping
  };
  notes: {
    [category: string]: string[]; // category -> filepath mapping
  };
}

// App State Types
export interface AppState {
  auth: AuthState;
  downloads: {
    progress: DownloadProgress;
    items: DownloadItem[];
  };
  settings: {
    downloadPath: string;
    organizeBySubreddit: boolean;
    downloadMedia: boolean;
    maxConcurrentDownloads: number;
  };
}

// Electron API Types
export interface ElectronAPI {
  redditAuth: (...args: unknown[]) => Promise<unknown>;
  downloadContent: (...args: unknown[]) => Promise<unknown>;
  getSavedContent: (...args: unknown[]) => Promise<unknown>;
  selectDirectory: (...args: unknown[]) => Promise<unknown>;
  saveFile: (...args: unknown[]) => Promise<unknown>;
  onMainProcessMessage: (callback: (message: string) => void) => void;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
  onAuthStatus: (callback: (status: AuthState) => void) => void;
}
