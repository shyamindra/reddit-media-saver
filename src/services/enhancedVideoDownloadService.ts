import snoowrap from 'snoowrap';
import { DownloaderHelper } from 'node-downloader-helper';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import axios from 'axios';

export interface VideoDownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  title?: string;
  subreddit?: string;
  url?: string;
}

export interface RedditVideoInfo {
  url: string;
  title: string;
  subreddit: string;
  author: string;
  isVideo: boolean;
  isRedGifs: boolean;
  isRedditVideo: boolean;
  fallbackUrl?: string;
  dashUrl?: string;
  audioUrl?: string;
}

export class EnhancedVideoDownloadService {
  private outputDir = 'downloads';
  private userAgent = 'RedditSaverApp/1.0.0 (by /u/reddit_user)';
  private reddit: snoowrap | null = null;

  constructor(outputDir?: string) {
    if (outputDir) {
      this.outputDir = outputDir;
    }
    this.ensureOutputDirectories();
  }

  /**
   * Initialize Reddit API client (optional - for better video extraction)
   */
  public initializeRedditAPI(clientId?: string, clientSecret?: string, refreshToken?: string): void {
    if (clientId && clientSecret && refreshToken) {
      this.reddit = new snoowrap({
        userAgent: this.userAgent,
        clientId,
        clientSecret,
        refreshToken
      });
      console.log('✅ Reddit API initialized');
    }
  }

  /**
   * Ensure output directories exist
   */
  private ensureOutputDirectories(): void {
    const dirs = [
      join(this.outputDir, 'Videos'),
      join(this.outputDir, 'Notes')
    ];

    dirs.forEach(dir => {
      try {
        mkdirSync(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    });
  }

  /**
   * Extract video information from Reddit URL using snoowrap
   */
  private async extractVideoInfoWithAPI(url: string): Promise<RedditVideoInfo | null> {
    if (!this.reddit) return null;

    try {
      // Extract post ID from URL
      const postIdMatch = url.match(/\/comments\/([a-zA-Z0-9]+)/);
      if (!postIdMatch) return null;

      const postId = postIdMatch[1];
      const submission = await this.reddit.getSubmission(postId).fetch();

      const videoInfo: RedditVideoInfo = {
        url: submission.url,
        title: submission.title,
        subreddit: submission.subreddit.display_name,
        author: submission.author.name,
        isVideo: submission.is_video,
        isRedGifs: submission.url.includes('redgifs.com'),
        isRedditVideo: submission.url.includes('v.redd.it'),
        fallbackUrl: submission.media?.reddit_video?.fallback_url,
        dashUrl: submission.media?.reddit_video?.dash_url,
        audioUrl: submission.media?.reddit_video?.hls_url
      };

      return videoInfo;
    } catch (error) {
      console.error(`❌ Error extracting video info with API: ${error}`);
      return null;
    }
  }

  /**
   * Extract video information from Reddit URL using fallback method
   */
  private async extractVideoInfoFallback(url: string): Promise<RedditVideoInfo | null> {
    try {
      // Convert Reddit URL to JSON API endpoint
      const jsonUrl = url.replace(/\/$/, '') + '.json';
      const response = await axios.get(jsonUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      const postData = response.data?.[0]?.data?.children?.[0]?.data;
      if (!postData) return null;

      const videoInfo: RedditVideoInfo = {
        url: postData.url,
        title: postData.title,
        subreddit: postData.subreddit,
        author: postData.author,
        isVideo: postData.is_video,
        isRedGifs: postData.url.includes('redgifs.com'),
        isRedditVideo: postData.url.includes('v.redd.it'),
        fallbackUrl: postData.media?.reddit_video?.fallback_url,
        dashUrl: postData.media?.reddit_video?.dash_url,
        audioUrl: postData.media?.reddit_video?.hls_url
      };

      return videoInfo;
    } catch (error) {
      console.error(`❌ Error extracting video info with fallback: ${error}`);
      return null;
    }
  }

  /**
   * Get best video URL for Reddit videos
   */
  private getBestRedditVideoUrl(videoInfo: RedditVideoInfo): string | null {
    if (videoInfo.isRedGifs) {
      return videoInfo.url;
    }

    if (videoInfo.isRedditVideo) {
      // Prefer fallback URL (usually highest quality)
      if (videoInfo.fallbackUrl) {
        return videoInfo.fallbackUrl;
      }
      
      // Fallback to original URL
      return videoInfo.url;
    }

    return null;
  }

  /**
   * Download video using node-downloader-helper
   */
  private async downloadVideoWithHelper(url: string, filename: string): Promise<VideoDownloadResult> {
    return new Promise((resolve) => {
      const outputPath = join(this.outputDir, 'Videos', filename);
      
      const dl = new DownloaderHelper(url, dirname(outputPath), {
        fileName: filename,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'video/*,*/*',
          'Referer': 'https://www.reddit.com/',
          'Origin': 'https://www.reddit.com'
        },
        retry: { maxRetries: 3, delay: 1000 },
        override: true
      });

      dl.on('end', () => {
        console.log(`✅ Downloaded: ${filename}`);
        resolve({
          success: true,
          filePath: outputPath,
          url
        });
      });

      dl.on('error', (err) => {
        console.error(`❌ Download failed: ${err.message}`);
        resolve({
          success: false,
          error: err.message,
          url
        });
      });

      dl.on('progress', (stats) => {
        const progress = ((stats.progress / stats.total) * 100).toFixed(1);
        console.log(`📥 Downloading ${filename}: ${progress}% (${(stats.downloaded / 1024 / 1024).toFixed(1)}MB)`);
      });

      dl.start();
    });
  }

  /**
   * Generate filename for video
   */
  private generateVideoFilename(videoInfo: RedditVideoInfo, url: string): string {
    // Sanitize title for filesystem compatibility
    const sanitizedTitle = videoInfo.title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w\-_]/g, '')
      .substring(0, 100);

    const sanitizedSubreddit = videoInfo.subreddit.replace(/[<>:"/\\|?*]/g, '').substring(0, 20);

    if (videoInfo.isRedGifs) {
      const match = url.match(/https:\/\/media\.redgifs\.com\/([^\/]+)/);
      if (match) {
        let filename = match[1];
        if (filename.endsWith('.mp4')) {
          filename = filename.slice(0, -4);
        }
        return `${filename}.mp4`;
      }
    }

    if (videoInfo.isRedditVideo) {
      const match = url.match(/https:\/\/v\.redd\.it\/([a-zA-Z0-9]+)/);
      if (match) {
        return `reddit_${match[1]}.mp4`;
      }
    }

    // Fallback to title-based naming
    return `${sanitizedTitle}_${sanitizedSubreddit}.mp4`;
  }

  /**
   * Download video from Reddit URL
   */
  public async downloadVideo(url: string): Promise<VideoDownloadResult> {
    try {
      console.log(`🎬 Processing video URL: ${url}`);

      // Check if this is a direct video URL (like RedGIFs)
      if (this.isDirectVideoUrl(url)) {
        console.log(`📹 Direct video URL detected: ${url}`);
        const filename = this.generateDirectVideoFilename(url);
        const result = await this.downloadVideoWithHelper(url, filename);
        
        return {
          ...result,
          title: filename.replace('.mp4', ''),
          subreddit: 'direct_video'
        };
      }

      // Extract video information for Reddit URLs
      let videoInfo = await this.extractVideoInfoWithAPI(url);
      if (!videoInfo) {
        videoInfo = await this.extractVideoInfoFallback(url);
      }

      if (!videoInfo) {
        return { success: false, error: 'Could not extract video information' };
      }

      console.log(`📋 Video Info: ${videoInfo.title} (r/${videoInfo.subreddit})`);

      // Get best video URL
      const videoUrl = this.getBestRedditVideoUrl(videoInfo);
      if (!videoUrl) {
        return { success: false, error: 'No video URL found' };
      }

      // Generate filename
      const filename = this.generateVideoFilename(videoInfo, videoUrl);

      // Download video
      const result = await this.downloadVideoWithHelper(videoUrl, filename);

      if (result.success) {
        return {
          ...result,
          title: videoInfo.title,
          subreddit: videoInfo.subreddit
        };
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error downloading video: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process multiple video URLs
   */
  public async processVideoUrls(urls: string[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: VideoDownloadResult[];
  }> {
    const results: VideoDownloadResult[] = [];
    let successful = 0;
    let failed = 0;

    console.log(`🚀 Processing ${urls.length} video URLs...\n`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[${i + 1}/${urls.length}] Processing: ${url}`);
      
      const result = await this.downloadVideo(url);
      results.push(result);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Small delay between downloads
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      total: urls.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Check if URL is a direct video URL
   */
  private isDirectVideoUrl(url: string): boolean {
    return url.includes('media.redgifs.com') || 
           url.includes('packaged-media.redd.it') ||
           url.endsWith('.mp4') ||
           url.endsWith('.webm') ||
           url.endsWith('.mov');
  }

  /**
   * Generate filename for direct video URL
   */
  private generateDirectVideoFilename(url: string): string {
    if (url.includes('redgifs.com')) {
      const match = url.match(/https:\/\/media\.redgifs\.com\/([^\/]+)/);
      if (match) {
        let filename = match[1];
        if (filename.endsWith('.mp4')) {
          filename = filename.slice(0, -4);
        }
        return `${filename}.mp4`;
      }
    }
    
    if (url.includes('packaged-media.redd.it')) {
      const match = url.match(/https:\/\/packaged-media\.redd\.it\/([a-zA-Z0-9]+)\/pb\/m2-res_([0-9]+)p\.mp4/);
      if (match) {
        return `reddit_packaged_${match[1]}_${match[2]}p.mp4`;
      }
    }
    
    // Fallback - extract filename from URL
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.split('/').pop() || 'video';
    return pathname.includes('.') ? pathname : `${pathname}.mp4`;
  }
} 