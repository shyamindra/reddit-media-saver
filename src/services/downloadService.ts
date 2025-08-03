import axios from 'axios';
import type { ContentItem, DownloadProgress } from './contentService';

export interface DownloadOptions {
  destination?: string;
  filename?: string;
  overwrite?: boolean;
  timeout?: number;
  retries?: number;
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  bytesDownloaded?: number;
  contentType?: string;
}

export class DownloadService {
  private activeDownloads: Map<string, AbortController> = new Map();
  private defaultTimeout = 30000;
  private defaultRetries = 3;

  /**
   * Download image from URL
   */
  public async downloadImage(item: ContentItem, options: DownloadOptions = {}): Promise<DownloadResult> {
    if (!item.media?.url) {
      return { success: false, error: 'No image URL available' };
    }

    try {
      const filename = options.filename || this.generateImageFilename(item);
      const filePath = options.destination ? `${options.destination}/${filename}` : filename;

      const abortController = new AbortController();
      this.activeDownloads.set(item.id, abortController);

      const response = await axios.get(item.media.url, {
        responseType: 'arraybuffer',
        timeout: options.timeout || this.defaultTimeout,
        signal: abortController.signal,
        headers: { 'User-Agent': 'RedditSaverApp/1.0.0' }
      });

      // TODO: Implement actual file writing
      // For now, simulate successful download
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.activeDownloads.delete(item.id);
      return {
        success: true,
        filePath,
        bytesDownloaded: response.data.byteLength,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      this.activeDownloads.delete(item.id);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Download failed' 
      };
    }
  }

  /**
   * Download video from URL
   */
  public async downloadVideo(item: ContentItem, options: DownloadOptions = {}): Promise<DownloadResult> {
    if (!item.media?.url) {
      return { success: false, error: 'No video URL available' };
    }

    try {
      const filename = options.filename || this.generateVideoFilename(item);
      const filePath = options.destination ? `${options.destination}/${filename}` : filename;

      const abortController = new AbortController();
      this.activeDownloads.set(item.id, abortController);

      // TODO: Implement actual video download with streaming
      // For now, simulate successful download
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.activeDownloads.delete(item.id);
      return {
        success: true,
        filePath,
        bytesDownloaded: 0,
        contentType: 'video/mp4'
      };
    } catch (error) {
      this.activeDownloads.delete(item.id);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Download failed' 
      };
    }
  }

  /**
   * Download any media file
   */
  public async downloadMedia(item: ContentItem, options: DownloadOptions = {}): Promise<DownloadResult> {
    if (!item.media?.url) {
      return { success: false, error: 'No media URL available' };
    }

    switch (item.media.type) {
      case 'image':
      case 'gif':
        return this.downloadImage(item, options);
      case 'video':
        return this.downloadVideo(item, options);
      default:
        return { success: false, error: `Unsupported media type: ${item.media.type}` };
    }
  }

  /**
   * Generate filename for image
   */
  private generateImageFilename(item: ContentItem): string {
    const timestamp = new Date(item.created_utc * 1000).toISOString().split('T')[0];
    const safeTitle = this.sanitizeFilename(item.title);
    const extension = this.getImageExtension(item.media?.url || '');
    return `${timestamp}_${safeTitle}_${item.id}.${extension}`;
  }

  /**
   * Generate filename for video
   */
  private generateVideoFilename(item: ContentItem): string {
    const timestamp = new Date(item.created_utc * 1000).toISOString().split('T')[0];
    const safeTitle = this.sanitizeFilename(item.title);
    const extension = this.getVideoExtension(item.media?.url || '');
    return `${timestamp}_${safeTitle}_${item.id}.${extension}`;
  }

  /**
   * Get image extension from URL
   */
  private getImageExtension(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) return 'jpg';
    if (lowerUrl.includes('.png')) return 'png';
    if (lowerUrl.includes('.gif')) return 'gif';
    if (lowerUrl.includes('.webp')) return 'webp';
    return 'jpg';
  }

  /**
   * Get video extension from URL
   */
  private getVideoExtension(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.mp4')) return 'mp4';
    if (lowerUrl.includes('.webm')) return 'webm';
    if (lowerUrl.includes('.avi')) return 'avi';
    return 'mp4';
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  /**
   * Cancel active download
   */
  public cancelDownload(itemId: string): boolean {
    const abortController = this.activeDownloads.get(itemId);
    if (abortController) {
      abortController.abort();
      this.activeDownloads.delete(itemId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all active downloads
   */
  public cancelAllDownloads(): void {
    for (const [itemId, abortController] of this.activeDownloads) {
      abortController.abort();
    }
    this.activeDownloads.clear();
  }

  /**
   * Get active download count
   */
  public getActiveDownloadCount(): number {
    return this.activeDownloads.size;
  }

  /**
   * Check if download is active
   */
  public isDownloadActive(itemId: string): boolean {
    return this.activeDownloads.has(itemId);
  }
}

// Export singleton instance
export const downloadService = new DownloadService(); 