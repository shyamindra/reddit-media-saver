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

      // Enhanced media detection and download
      const mediaResult = await this.tryDownloadMedia(postData, title, subreddit);
      if (mediaResult.success) {
        return mediaResult;
      }

      // If no media found, save as text content
      const textContent = selftext || 'No content available';
      if (textContent === 'No content available') {
        // Try to extract media URLs from the post data
        const extractedMediaUrl = this.extractMediaUrlFromPost(postData);
        if (extractedMediaUrl) {
          console.log(`🔍 Found media URL in post data: ${extractedMediaUrl}`);
          return await this.downloadMedia(extractedMediaUrl, title, subreddit);
        }
      }

      return await this.saveTextContent(title, subreddit, textContent);
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
    
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.gifv', '.mov', '.avi'];
    const lowerUrl = url.toLowerCase();
    
    // Check for file extensions
    if (mediaExtensions.some(ext => lowerUrl.includes(ext))) {
      return true;
    }
    
    // Check for Reddit media domains
    if (lowerUrl.includes('i.redd.it') || 
        lowerUrl.includes('v.redd.it') ||
        lowerUrl.includes('preview.redd.it') ||
        lowerUrl.includes('reddit.com/media')) {
      return true;
    }
    
    // Check for common media hosting sites
    if (lowerUrl.includes('imgur.com') ||
        lowerUrl.includes('gfycat.com') ||
        lowerUrl.includes('redgifs.com') ||
        lowerUrl.includes('youtube.com') ||
        lowerUrl.includes('youtu.be') ||
        lowerUrl.includes('vimeo.com') ||
        lowerUrl.includes('streamable.com')) {
      return true;
    }
    
    // Check for data URLs (base64 encoded media)
    if (lowerUrl.startsWith('data:image/') || lowerUrl.startsWith('data:video/')) {
      return true;
    }
    
    return false;
  }

  /**
   * Download media with enhanced quality detection
   */
  private async downloadMedia(url: string, title: string, subreddit: string): Promise<DownloadResult> {
    try {
      // Handle Reddit video URLs - try to get the best quality
      let downloadUrl = url;
      if (url.includes('v.redd.it')) {
        // For Reddit videos, try to get the highest quality version
        downloadUrl = url.replace('DASH_96', 'DASH_720').replace('DASH_480', 'DASH_720');
      }

      // Clean up Reddit preview URLs
      if (url.includes('preview.redd.it')) {
        // Remove query parameters that might cause issues
        downloadUrl = url.split('?')[0];
        // Try to get the original image URL
        downloadUrl = downloadUrl.replace('preview.redd.it', 'i.redd.it');
      }

      console.log(`📥 Downloading media from: ${downloadUrl}`);

      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'image/*,video/*,*/*',
          'Accept-Encoding': 'gzip, deflate',
          'Referer': 'https://www.reddit.com/',
          'Origin': 'https://www.reddit.com'
        },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // Accept redirects
      });

      // Detect media type from response headers and URL
      const contentType = response.headers['content-type'] || '';
      const mediaInfo = this.detectMediaTypeFromResponse(url, contentType, response.data);
      
      const filename = MediaUtils.generateFilename(title, subreddit, 'unknown', mediaInfo.type, mediaInfo.extension || '', url);
      
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

      // Save file based on content type
      if (mediaInfo.type === 'text') {
        // Check if this is HTML content that might contain video URLs
        const htmlContent = response.data.toString('utf8');
        
        // If this looks like a video URL that returned HTML, try to extract video
        if (url.includes('redgifs.com')) {
          console.log(`🔍 Detected HTML content from RedGIFs URL, attempting to extract video...`);
          const videoResult = await this.tryExtractVideoFromHtml(htmlContent, url, title, subreddit, 0);
        } else if (url.includes('v.redd.it')) {
          console.log(`🔍 Detected HTML content from Reddit URL, attempting to extract video...`);
          const videoResult = await this.tryExtractVideoFromHtml(htmlContent, url, title, subreddit, 0);
          
          if (videoResult.success) {
            // Video extraction succeeded, return the video result
            return videoResult;
          } else {
            // Video extraction failed, save as text file
            console.log(`⚠️  Video extraction failed, saving as text file`);
            writeFileSync(outputPath, htmlContent, 'utf8');
            console.log(`✅ Saved text content: ${filename} (${this.formatFileSize(response.data.length)})`);
            return {
              success: true,
              filePath: outputPath,
              contentType: contentType,
              title,
              subreddit
            };
          }
        } else {
          // Regular text content, save as-is
          writeFileSync(outputPath, htmlContent, 'utf8');
          console.log(`✅ Saved text content: ${filename} (${this.formatFileSize(response.data.length)})`);
        }
      } else {
        // Save binary content as-is
        writeFileSync(outputPath, response.data);
        console.log(`✅ Downloaded: ${filename} (${this.formatFileSize(response.data.length)})`);
      }
      return {
        success: true,
        filePath: outputPath,
        contentType: contentType,
        title,
        subreddit
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download media';
      console.error(`❌ Failed to download ${url}: ${errorMessage}`);
      
      // If the first attempt failed, try alternative approaches
      if (url.includes('preview.redd.it')) {
        console.log(`🔄 Trying alternative URL format for Reddit media...`);
        return await this.tryAlternativeRedditUrls(url, title, subreddit);
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Try alternative URL formats for Reddit media
   */
  private async tryAlternativeRedditUrls(originalUrl: string, title: string, subreddit: string): Promise<DownloadResult> {
    const alternatives = [
      // Try without query parameters
      originalUrl.split('?')[0],
      // Try with different domain
      originalUrl.replace('preview.redd.it', 'i.redd.it'),
      // Try with different format
      originalUrl.replace('&amp;', '&'),
      // Try with different quality
      originalUrl.replace('width=1920', 'width=1280'),
      originalUrl.replace('width=1280', 'width=800')
    ];

    for (const altUrl of alternatives) {
      try {
        console.log(`🔄 Trying alternative: ${altUrl}`);
        const response = await axios.get(altUrl, {
          responseType: 'arraybuffer',
          headers: { 
            'User-Agent': this.userAgent,
            'Accept': 'image/*,video/*,*/*',
            'Referer': 'https://www.reddit.com/'
          },
          timeout: 15000
        });

        const contentType = response.headers['content-type'] || '';
        const mediaInfo = this.detectMediaTypeFromResponse(altUrl, contentType, response.data);
        
        const filename = MediaUtils.generateFilename(title, subreddit, 'unknown', mediaInfo.type, mediaInfo.extension || '', altUrl);
        
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

        mkdirSync(dirname(outputPath), { recursive: true });
        
        // Save file based on content type
        if (mediaInfo.type === 'text') {
          // Save text content as UTF-8
          writeFileSync(outputPath, response.data.toString('utf8'), 'utf8');
          console.log(`✅ Saved text content with alternative URL: ${filename} (${this.formatFileSize(response.data.length)})`);
        } else {
          // Save binary content as-is
          writeFileSync(outputPath, response.data);
          console.log(`✅ Downloaded with alternative URL: ${filename} (${this.formatFileSize(response.data.length)})`);
        }
        return {
          success: true,
          filePath: outputPath,
          contentType: contentType,
          title,
          subreddit
        };
      } catch (error) {
        console.log(`⚠️ Alternative URL failed: ${altUrl}`);
        continue;
      }
    }

    return { success: false, error: 'All alternative URL attempts failed' };
  }

  /**
   * Detect media type from response data and headers
   */
  private detectMediaTypeFromResponse(url: string, contentType: string, data: Buffer): { type: string; extension: string } {
    const lowerUrl = url.toLowerCase();
    const lowerContentType = contentType.toLowerCase();

    // Check if the downloaded content is actually HTML/text instead of media
    if (this.isHtmlOrTextContent(data)) {
      console.log(`⚠️  Downloaded content appears to be HTML/text, not media: ${url}`);
      return { type: 'text', extension: '.txt' };
    }

    // Check content type first
    if (lowerContentType.includes('image/gif')) {
      return { type: 'gif', extension: '.gif' };
    }
    if (lowerContentType.includes('image/')) {
      const ext = this.getExtensionFromContentType(lowerContentType);
      return { type: 'image', extension: ext };
    }
    if (lowerContentType.includes('video/')) {
      const ext = this.getExtensionFromContentType(lowerContentType);
      return { type: 'video', extension: ext };
    }

    // Fallback to URL-based detection
    if (lowerUrl.includes('.gif') || lowerUrl.includes('gfycat.com')) {
      return { type: 'gif', extension: '.gif' };
    }
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') || lowerUrl.includes('.webp')) {
      const ext = this.getExtensionFromUrl(lowerUrl);
      return { type: 'image', extension: ext };
    }
    if (lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov')) {
      const ext = this.getExtensionFromUrl(lowerUrl);
      return { type: 'video', extension: ext };
    }

    // Default to text if we can't determine (safer than assuming image)
    return { type: 'text', extension: '.txt' };
  }

  /**
   * Check if downloaded content is HTML or text instead of media
   */
  private isHtmlOrTextContent(data: Buffer): boolean {
    if (data.length === 0) return true;
    
    // Convert first 1024 bytes to string for analysis
    const sample = data.slice(0, Math.min(1024, data.length)).toString('utf8', 0, Math.min(1024, data.length));
    const lowerSample = sample.toLowerCase();
    
    // Check for HTML indicators
    if (lowerSample.includes('<!doctype html') || 
        lowerSample.includes('<html') || 
        lowerSample.includes('<head') || 
        lowerSample.includes('<body') ||
        lowerSample.includes('<!DOCTYPE')) {
      return true;
    }
    
    // Check for common HTML tags
    if (lowerSample.includes('<title>') || 
        lowerSample.includes('<meta') || 
        lowerSample.includes('<script') || 
        lowerSample.includes('<style>')) {
      return true;
    }
    
    // Check for error messages or redirect pages
    if (lowerSample.includes('error') && lowerSample.includes('page') ||
        lowerSample.includes('redirect') ||
        lowerSample.includes('not found') ||
        lowerSample.includes('access denied')) {
      return true;
    }
    
    // Check if content is mostly text (not binary)
    const textRatio = this.calculateTextRatio(sample);
    if (textRatio > 0.8) { // If more than 80% is readable text
      return true;
    }
    
    return false;
  }

  /**
   * Extract video URLs from HTML content
   */
  private extractVideoUrlsFromHtml(htmlContent: string, originalUrl: string): string[] {
    const urls: string[] = [];
    
    // Decode HTML entities first
    const decodedContent = htmlContent
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    // Extract RedGIFs video URLs from meta tags
    const redgifsMatch = decodedContent.match(/<meta property="og:video" content="([^"]+)"/);
    if (redgifsMatch) {
      urls.push(redgifsMatch[1]);
    }
    
    // Extract RedGIFs video URLs from JSON-LD
    const jsonLdMatch = decodedContent.match(/"contentUrl":"([^"]+\.mp4)"/);
    if (jsonLdMatch) {
      urls.push(jsonLdMatch[1]);
    }
    
    // Extract RedGIFs URLs from various patterns
    const redgifsPatterns = [
      /https:\/\/media\.redgifs\.com\/[a-zA-Z0-9_-]+\.mp4/g,
      /https:\/\/media\.redgifs\.com\/[a-zA-Z0-9_-]+-silent\.mp4/g
    ];
    
    redgifsPatterns.forEach(pattern => {
      const matches = decodedContent.match(pattern);
      if (matches) {
        urls.push(...matches);
      }
    });
    
    // Extract v.redd.it video URLs (clean ones)
    const vredditMatches = decodedContent.match(/https:\/\/v\.redd\.it\/[a-zA-Z0-9]+/g);
    if (vredditMatches) {
      urls.push(...vredditMatches);
    }
    
    // Extract DASH audio URLs
    const dashMatches = decodedContent.match(/https:\/\/v\.redd\.it\/[a-zA-Z0-9]+\/DASH_96\.mp4/g);
    if (dashMatches) {
      urls.push(...dashMatches);
    }
    
    // Extract packaged-media URLs (clean ones)
    const packagedMatches = decodedContent.match(/https:\/\/packaged-media\.redd\.it\/[a-zA-Z0-9]+\/pb\/m2-res_[0-9]+p\.mp4\?[^"'\s]+/g);
    if (packagedMatches) {
      // Clean up the URLs by removing extra content
      const cleanPackaged = packagedMatches.map(url => {
        const cleanUrl = url.split('&quot;')[0]; // Remove everything after &quot;
        return cleanUrl;
      });
      urls.push(...cleanPackaged);
    }
    
    // Extract any other video URLs
    const videoMatches = decodedContent.match(/https:\/\/[^"'\s]+\.(mp4|webm|mov|avi|mkv)/g);
    if (videoMatches) {
      urls.push(...videoMatches);
    }
    
    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Try to extract and download video from HTML content
   */
  private async tryExtractVideoFromHtml(htmlContent: string, originalUrl: string, title: string, subreddit: string, depth: number = 0): Promise<DownloadResult> {
    // Prevent infinite recursion
    if (depth > 2) {
      console.log(`⚠️  Maximum recursion depth reached, stopping video extraction`);
      return { success: false, error: 'Maximum recursion depth reached' };
    }
    
    console.log(`🔍 Attempting to extract video URLs from HTML content: ${originalUrl} (depth: ${depth})`);
    
    const videoUrls = this.extractVideoUrlsFromHtml(htmlContent, originalUrl);
    
    if (videoUrls.length === 0) {
      console.log(`❌ No video URLs found in HTML content`);
      return { success: false, error: 'No video URLs found in HTML content' };
    }
    
    console.log(`🎬 Found ${videoUrls.length} video URL(s) in HTML content`);
    
    // Try each video URL until one works
    for (let i = 0; i < videoUrls.length; i++) {
      const videoUrl = videoUrls[i];
      console.log(`📥 Trying video URL ${i + 1}/${videoUrls.length}: ${videoUrl}`);
      
      try {
        // Use a different method to download the actual video file
        const result = await this.downloadVideoFile(videoUrl, title, subreddit, depth + 1);
        if (result.success) {
          console.log(`✅ Successfully downloaded video from extracted URL: ${result.filePath}`);
          return result;
        } else {
          console.log(`❌ Failed to download from extracted URL: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Error downloading from extracted URL: ${error}`);
      }
    }
    
    console.log(`❌ All extracted video URLs failed to download`);
    return { success: false, error: 'All extracted video URLs failed to download' };
  }

  /**
   * Download video file directly without HTML extraction recursion
   */
  private async downloadVideoFile(url: string, title: string, subreddit: string, depth: number = 0): Promise<DownloadResult> {
    try {
      console.log(`📥 Downloading video file directly: ${url}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'video/*,*/*',
          'Accept-Encoding': 'gzip, deflate',
          'Referer': 'https://www.reddit.com/',
          'Origin': 'https://www.reddit.com'
        },
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      // Check if we got actual video content
      const contentType = response.headers['content-type'] || '';
      const isVideo = contentType.includes('video/') || url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
      
      if (!isVideo && this.isHtmlOrTextContent(response.data)) {
        console.log(`⚠️  Video URL returned HTML content, skipping`);
        return { success: false, error: 'Video URL returned HTML content' };
      }

      // Generate filename for video
      const filename = MediaUtils.generateFilename(title, subreddit, 'unknown', 'video', '.mp4', url);
      const outputPath = join(this.outputDir, 'Videos', filename);
      
      // Ensure directory exists
      mkdirSync(dirname(outputPath), { recursive: true });

      // Save video file
      writeFileSync(outputPath, response.data);
      console.log(`✅ Downloaded video: ${filename} (${this.formatFileSize(response.data.length)})`);
      
      return {
        success: true,
        filePath: outputPath,
        contentType: contentType,
        title,
        subreddit
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download video file';
      console.error(`❌ Failed to download video file ${url}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Calculate the ratio of readable text characters in a string
   */
  private calculateTextRatio(text: string): number {
    if (text.length === 0) return 0;
    
    const readableChars = text.replace(/[^\w\s.,!?;:'"()-]/g, '').length;
    return readableChars / text.length;
  }

  /**
   * Get file extension from content type
   */
  private getExtensionFromContentType(contentType: string): string {
    if (contentType.includes('image/jpeg')) return '.jpg';
    if (contentType.includes('image/png')) return '.png';
    if (contentType.includes('image/webp')) return '.webp';
    if (contentType.includes('image/gif')) return '.gif';
    if (contentType.includes('video/mp4')) return '.mp4';
    if (contentType.includes('video/webm')) return '.webm';
    if (contentType.includes('video/quicktime')) return '.mov';
    return '.jpg'; // Default
  }

  /**
   * Get file extension from URL
   */
  private getExtensionFromUrl(url: string): string {
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi'];
    for (const ext of extensions) {
      if (url.includes(ext)) {
        return ext;
      }
    }
    return '.jpg'; // Default
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Save text content
   */
  private async saveTextContent(title: string, subreddit: string, content: string): Promise<DownloadResult> {
    try {
      const filename = MediaUtils.generateFilename(title, subreddit, 'unknown', 'note', '.txt', '');
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
   * Try to download media with multiple quality options
   */
  private async tryDownloadMedia(postData: any, title: string, subreddit: string): Promise<DownloadResult> {
    const mediaUrls = this.extractAllMediaUrls(postData);
    
    if (mediaUrls.length === 0) {
      return { success: false, error: 'No media URLs found' };
    }

    // Try each media URL, starting with the best quality
    for (const mediaUrl of mediaUrls) {
      try {
        console.log(`🎬 Attempting to download: ${mediaUrl}`);
        const result = await this.downloadMedia(mediaUrl, title, subreddit);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.log(`⚠️ Failed to download ${mediaUrl}: ${error}`);
        continue;
      }
    }

    return { success: false, error: 'All media download attempts failed' };
  }

  /**
   * Extract all possible media URLs from post data
   */
  private extractAllMediaUrls(postData: any): string[] {
    const urls: string[] = [];
    
    // Primary URL
    if (postData.url && this.isMediaUrl(postData.url)) {
      urls.push(postData.url);
    }

    // Media metadata
    if (postData.media?.reddit_video?.fallback_url) {
      urls.push(postData.media.reddit_video.fallback_url);
    }

    // Preview images (highest quality first)
    if (postData.preview?.images) {
      for (const image of postData.preview.images) {
        if (image.source?.url) {
          urls.push(image.source.url);
        }
        if (image.resolutions) {
          // Get highest resolution
          const highestRes = image.resolutions[image.resolutions.length - 1];
          if (highestRes?.url) {
            urls.push(highestRes.url);
          }
        }
      }
    }

    // Gallery images
    if (postData.gallery_data?.items) {
      for (const item of postData.gallery_data.items) {
        if (item.media_id && postData.media_metadata?.[item.media_id]?.s) {
          const mediaInfo = postData.media_metadata[item.media_id].s;
          if (mediaInfo.u) {
            urls.push(mediaInfo.u);
          }
        }
      }
    }

    // Secure media
    if (postData.secure_media?.reddit_video?.fallback_url) {
      urls.push(postData.secure_media.reddit_video.fallback_url);
    }

    // Remove duplicates and return
    return [...new Set(urls)];
  }

  /**
   * Extract a single media URL from post data (fallback method)
   */
  private extractMediaUrlFromPost(postData: any): string | null {
    // Try media metadata first
    if (postData.media?.reddit_video?.fallback_url) {
      return postData.media.reddit_video.fallback_url;
    }

    // Try secure media
    if (postData.secure_media?.reddit_video?.fallback_url) {
      return postData.secure_media.reddit_video.fallback_url;
    }

    // Try preview images
    if (postData.preview?.images?.[0]?.source?.url) {
      return postData.preview.images[0].source.url;
    }

    // Try URL if it looks like media
    if (postData.url && this.isMediaUrl(postData.url)) {
      return postData.url;
    }

    return null;
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