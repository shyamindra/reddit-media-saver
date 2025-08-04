export interface ExtractionConfig {
  // File paths
  files: {
    extractedFilesDir: string;
    failedRequestsDir: string;
    downloadsDir: string;
    redditLinksDir: string;
    videoUrls: {
      all: string;
      deduplicated: string;
      deduplicatedList: string;
      failedExtraction: string;
      failedDownloads: string;
    };
    mediaUrls: {
      all: string;
      deduplicated: string;
      deduplicatedList: string;
      failedExtraction: string;
      failedDownloads: string;
    };
  };
  
  // Timing settings
  timing: {
    delayBetweenRequests: number; // milliseconds
    delayBetweenBatches: number; // milliseconds
    retryDelay: number; // milliseconds
  };
  
  // Batch settings
  batch: {
    size: number;
    saveInterval: number; // Save progress every N iterations
  };
  
  // User agent
  userAgent: string;
}

export const extractionConfig: ExtractionConfig = {
  files: {
    extractedFilesDir: 'extracted_files',
    failedRequestsDir: 'extracted_files/failed_requests',
    downloadsDir: 'downloads',
    redditLinksDir: 'reddit-links',
    videoUrls: {
      all: 'extracted_files/all-extracted-video-urls.txt',
      deduplicated: 'extracted_files/deduplicated-video-urls.txt',
      deduplicatedList: 'extracted_files/deduplicated-video-urls-list.txt',
      failedExtraction: 'extracted_files/failed_requests/failed-extraction-requests.txt',
      failedDownloads: 'extracted_files/failed_requests/failed-video-downloads.txt'
    },
    mediaUrls: {
      all: 'extracted_files/all-extracted-media-urls.txt',
      deduplicated: 'extracted_files/deduplicated-media-urls.txt',
      deduplicatedList: 'extracted_files/deduplicated-media-urls-list.txt',
      failedExtraction: 'extracted_files/failed_requests/failed-media-extraction-requests.txt',
      failedDownloads: 'extracted_files/failed_requests/failed-media-downloads.txt'
    }
  },
  
  timing: {
    delayBetweenRequests: 2000, // 2 seconds
    delayBetweenBatches: 180000, // 3 minutes
    retryDelay: 240000 // 4 minutes
  },
  
  batch: {
    size: 50,
    saveInterval: 10 // Save progress every 10 iterations
  },
  
  userAgent: 'RedditSaverApp/1.0.0 (by /u/reddit_user)'
};

export default extractionConfig; 