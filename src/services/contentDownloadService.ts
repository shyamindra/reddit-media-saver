import axios from 'axios';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { MediaUtils } from '../utils/mediaUtils';
import type { RedditUrlInfo } from './fileInputService';

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  contentType?: string;
  title?: string;
  subreddit?: string;
}

export interface DownloadSummary {
  total: number;
  successful: number;
  failed: number;
  failedUrls: string[];
}

export class ContentDownloadService {
  private outputDir = 'downloads';
  private userAgent = 'RedditSaverApp/1.0.0 (by /u/reddit_user)';

  constructor(outputDir?: string) {
    if (outputDir) {
      this.outputDir = outputDir;
    }
    this.ensureOutputDirectories();
  }

  /**
   * Ensure output directories exist
   */
  private ensureOutputDirectories(): void {
    const dirs = [
      join(this.outputDir, 'Images'),
      join(this.outputDir, 'Videos'),
      join(this.outputDir, 'Gifs'),
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
   * Download content from a Reddit URL
   */
  async downloadFromUrl(urlInfo: RedditUrlInfo): Promise<DownloadResult> {
    try {
      console.log(`📥 Processing: ${urlInfo.url}`);

      if (urlInfo.type === 'post') {
        return await this.downloadPost(urlInfo);
      } else if (urlInfo.type === 'comment') {
        return await this.downloadComment(urlInfo);
      } else {
        return { success: false, error: 'Unsupported URL type' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error processing ${urlInfo.url}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Download a Reddit post
   */
  private async downloadPost(urlInfo: RedditUrlInfo): Promise<DownloadResult> {
    try {
      // Convert Reddit URL to JSON API endpoint
      const jsonUrl = urlInfo.url.replace(/\/$/, '') + '.json';
      const response = await axios.get(jsonUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      // Reddit JSON API returns an array: [postData, commentsData]
      const postData = response.data?.[0]?.data?.children?.[0]?.data;
      if (!postData) {
        return { success: false, error: 'No post data found' };
      }

      const title = postData.title || 'Untitled Post';
      const subreddit = postData.subreddit || urlInfo.subreddit || 'unknown';
      const selftext = postData.selftext || '';
      const url = postData.url;

      // Check if it's a media post
      if (this.isMediaUrl(url)) {
        return await this.downloadMedia(url, title, subreddit);
      } else {
        // Save as text content
        return await this.saveTextContent(title, subreddit, selftext || 'No content available');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch post';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Download a Reddit comment
   */
  private async downloadComment(urlInfo: RedditUrlInfo): Promise<DownloadResult> {
    try {
      // Convert Reddit URL to JSON API endpoint
      const jsonUrl = urlInfo.url.replace(/\/$/, '') + '.json';
      
      const response = await axios.get(jsonUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      // Find the specific comment in the response
      const commentData = this.findCommentInResponse(response.data, urlInfo.commentId);
      if (!commentData) {
        return { success: false, error: 'Comment not found' };
      }

      const title = `Comment by ${commentData.author || 'unknown'}`;
      const subreddit = commentData.subreddit || urlInfo.subreddit || 'unknown';
      const body = commentData.body || 'No content available';

      return await this.saveTextContent(title, subreddit, body);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch comment';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Find a specific comment in the Reddit API response
   */
  private findCommentInResponse(data: any, commentId?: string): any {
    if (!commentId) return null;

    const findComment = (items: any[]): any => {
      for (const item of items) {
        if (item.data?.id === commentId) {
          return item.data;
        }
        if (item.data?.replies?.data?.children) {
          const found = findComment(item.data.replies.data.children);
          if (found) return found;
        }
      }
      return null;
    };

    // Look in the second element (comments) of the response
    const comments = data?.[1]?.data?.children;
    return comments ? findComment(comments) : null;
  }

  /**
   * Check if URL is a media file
   */
  private isMediaUrl(url: string): boolean {
    if (!url) return false;
    
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.gifv'];
    const lowerUrl = url.toLowerCase();
    
    return mediaExtensions.some(ext => lowerUrl.includes(ext)) ||
           lowerUrl.includes('imgur.com') ||
           lowerUrl.includes('i.redd.it') ||
           lowerUrl.includes('v.redd.it');
  }

  /**
   * Download media file
   */
  private async downloadMedia(url: string, title: string, subreddit: string): Promise<DownloadResult> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const mediaInfo = MediaUtils.detectMediaType(url);
      const mediaType = mediaInfo.type === 'image' ? 'image' : mediaInfo.type === 'video' ? 'video' : 'note';
      const filename = MediaUtils.generateFilename(title, subreddit, 'unknown', mediaType, mediaInfo.extension || '');
      
      let outputPath: string;
      if (mediaInfo.type === 'gif') {
        outputPath = join(this.outputDir, 'Gifs', filename);
      } else if (mediaInfo.type === 'image') {
        outputPath = join(this.outputDir, 'Images', filename);
      } else if (mediaInfo.type === 'video') {
        outputPath = join(this.outputDir, 'Videos', filename);
      } else {
        outputPath = join(this.outputDir, 'Notes', filename);
      }

      // Ensure directory exists
      mkdirSync(dirname(outputPath), { recursive: true });

      // Save file
      writeFileSync(outputPath, response.data);

      console.log(`✅ Downloaded: ${filename}`);
      return {
        success: true,
        filePath: outputPath,
        contentType: response.headers['content-type'],
        title,
        subreddit
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download media';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Save text content
   */
  private async saveTextContent(title: string, subreddit: string, content: string): Promise<DownloadResult> {
    try {
      const filename = MediaUtils.generateFilename(title, subreddit, '.txt');
      const outputPath = join(this.outputDir, 'Notes', filename);

      // Ensure directory exists
      mkdirSync(dirname(outputPath), { recursive: true });

      // Save text file
      writeFileSync(outputPath, content, 'utf-8');

      console.log(`✅ Saved: ${filename}`);
      return {
        success: true,
        filePath: outputPath,
        contentType: 'text/plain',
        title,
        subreddit
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save text content';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process multiple URLs and return summary
   */
  async processUrls(urlInfos: RedditUrlInfo[]): Promise<DownloadSummary> {
    const summary: DownloadSummary = {
      total: urlInfos.length,
      successful: 0,
      failed: 0,
      failedUrls: []
    };

    console.log(`🚀 Starting download of ${urlInfos.length} URLs...\n`);

    for (let i = 0; i < urlInfos.length; i++) {
      const urlInfo = urlInfos[i];
      console.log(`[${i + 1}/${urlInfos.length}] `);
      
      const result = await this.downloadFromUrl(urlInfo);
      
      if (result.success) {
        summary.successful++;
      } else {
        summary.failed++;
        summary.failedUrls.push(urlInfo.url);
      }

      // Small delay to be respectful to Reddit's servers
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return summary;
  }
} 