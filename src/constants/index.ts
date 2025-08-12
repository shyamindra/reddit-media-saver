// Reddit API Constants
export const REDDIT_API_BASE = 'https://oauth.reddit.com';
export const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/authorize';
export const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';

// OAuth2 Configuration
export const REDDIT_CLIENT_ID = import.meta.env.VITE_REDDIT_CLIENT_ID || '';
export const REDDIT_REDIRECT_URI = 'reddit-saver://auth';
export const REDDIT_SCOPE = 'history read';

// App Constants
export const APP_NAME = 'Reddit Media Saver';
export const APP_VERSION = '1.0.0';
export const DEFAULT_DOWNLOAD_PATH = '~/Downloads/RedditSaver';
export const MAX_CONCURRENT_DOWNLOADS = 3;

// Folder Organization
export const FOLDER_STRUCTURE = {
  IMAGES: 'Images',
  VIDEOS: 'Videos',
  NOTES: 'Notes',
} as const;

export const SIMILARITY_THRESHOLD = 0.7; // For filename similarity grouping
export const MAX_SUBFOLDER_LENGTH = 50; // Maximum characters for subfolder names

// File Extensions
export const SUPPORTED_IMAGE_FORMATS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
];
export const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.webm', '.gifv'];

// Database
export const DATABASE_NAME = 'reddit-saver.db';
export const DATABASE_VERSION = 1;

// UI Constants
export const DOWNLOAD_PROGRESS_UPDATE_INTERVAL = 100; // ms
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // ms

// Error Messages
export const ERROR_MESSAGES = {
  AUTH_FAILED: 'Authentication failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  RATE_LIMIT: 'Rate limit exceeded. Please wait before trying again.',
  DOWNLOAD_FAILED: 'Download failed. Please try again.',
  INVALID_PATH: 'Invalid download path. Please select a valid directory.',
} as const;
