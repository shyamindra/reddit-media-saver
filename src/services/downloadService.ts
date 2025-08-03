import axios from 'axios';
import type { ContentItem, DownloadProgress } from '../types';
import { MediaUtils } from '../utils/mediaUtils';

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
   * Download image from URL using Electron API
   */
  public async downloadImage(item: ContentItem, options: DownloadOptions = {}): Promise<DownloadResult> {
    if (!item.media?.url) {
      return { success: false, error: 'No image URL available' };
    }

    try {
      const mediaInfo = MediaUtils.detectMediaType(item.media.url);
      const filename = options.filename || this.generateImageFilename(item, mediaInfo.extension);

      const abortController = new AbortController();
      this.activeDownloads.set(item.id, abortController);

      const response = await axios.get(item.media.url, {
        responseType: 'arraybuffer',
        timeout: options.timeout || this.defaultTimeout,
        signal: abortController.signal,
        headers: { 'User-Agent': 'RedditSaverApp/1.0.0' }
      });

      // Use Electron API to save file
      if (window.electronAPI?.saveFile) {
        const result = await window.electronAPI.saveFile(
          filename,
          Buffer.from(response.data),
          options.destination
        );
        
        this.activeDownloads.delete(item.id);
        
        if (result && typeof result === 'object' && 'success' in result) {
          return {
            success: result.success as boolean,
            filePath: result.filePath as string,
            bytesDownloaded: response.data.byteLength,
            contentType: response.headers['content-type']
          };
        }
      }

      this.activeDownloads.delete(item.id);
      return {
        success: false,
        error: 'Electron API not available'
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
   * Download video from URL using Electron API
   */
  public async downloadVideo(item: ContentItem, options: DownloadOptions = {}): Promise<DownloadResult> {
    if (!item.media?.url) {
      return { success: false, error: 'No video URL available' };
    }

    try {
      const mediaInfo = MediaUtils.detectMediaType(item.media.url);
      const filename = options.filename || this.generateVideoFilename(item, mediaInfo.extension);

      const abortController = new AbortController();
      this.activeDownloads.set(item.id, abortController);

      const response = await axios.get(item.media.url, {
        responseType: 'arraybuffer',
        timeout: options.timeout || this.defaultTimeout,
        signal: abortController.signal,
        headers: { 'User-Agent': 'RedditSaverApp/1.0.0' }
      });

      // Use Electron API to save file
      if (window.electronAPI?.saveFile) {
        const result = await window.electronAPI.saveFile(
          filename,
          Buffer.from(response.data),
          options.destination
        );
        
        this.activeDownloads.delete(item.id);
        
        if (result && typeof result === 'object' && 'success' in result) {
          return {
            success: result.success as boolean,
            filePath: result.filePath as string,
            bytesDownloaded: response.data.byteLength,
            contentType: response.headers['content-type']
          };
        }
      }

      this.activeDownloads.delete(item.id);
      return {
        success: false,
        error: 'Electron API not available'
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
   * Download media (image or video) from URL
   */
  public async downloadMedia(item: ContentItem, options: DownloadOptions = {}): Promise<DownloadResult> {
    if (!item.media?.url) {
      return { success: false, error: 'No media URL available' };
    }

    const mediaInfo = MediaUtils.detectMediaType(item.media.url);
    
    switch (mediaInfo.type) {
      case 'image':
        return this.downloadImage(item, options);
      case 'video':
      case 'gif':
        return this.downloadVideo(item, options);
      default:
        return { success: false, error: `Unsupported media type: ${mediaInfo.type}` };
    }
  }

  private generateImageFilename(item: ContentItem, extension?: string): string {
    const ext = extension || this.getImageExtension(item.media!.url!);
    const baseName = this.sanitizeFilename(item.title || item.id);
    return `${baseName}.${ext}`;
  }

  private generateVideoFilename(item: ContentItem, extension?: string): string {
    const ext = extension || this.getVideoExtension(item.media!.url!);
    const baseName = this.sanitizeFilename(item.title || item.id);
    return `${baseName}.${ext}`;
  }

  private getImageExtension(url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpg';
    if (urlLower.includes('.png')) return 'png';
    if (urlLower.includes('.gif')) return 'gif';
    if (urlLower.includes('.webp')) return 'webp';
    return 'jpg'; // default
  }

  private getVideoExtension(url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.mp4')) return 'mp4';
    if (urlLower.includes('.webm')) return 'webm';
    if (urlLower.includes('.mov')) return 'mov';
    if (urlLower.includes('.avi')) return 'avi';
    return 'mp4'; // default
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  public cancelDownload(itemId: string): boolean {
    const controller = this.activeDownloads.get(itemId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(itemId);
      return true;
    }
    return false;
  }

  public cancelAllDownloads(): void {
    this.activeDownloads.forEach(controller => controller.abort());
    this.activeDownloads.clear();
  }

  public getActiveDownloadCount(): number {
    return this.activeDownloads.size;
  }

  public isDownloadActive(itemId: string): boolean {
    return this.activeDownloads.has(itemId);
  }
}

export const downloadService = new DownloadService(); 