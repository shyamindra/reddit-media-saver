export interface MediaInfo {
  type: 'image' | 'video' | 'gif' | 'text' | 'link';
  url?: string;
  extension?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export class MediaUtils {
  private static readonly IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  private static readonly VIDEO_EXTENSIONS = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv'];
  private static readonly GIF_EXTENSIONS = ['.gif'];

  /**
   * Detect media type from URL
   */
  public static detectMediaType(url: string): MediaInfo {
    const lowerUrl = url.toLowerCase();
    
    // Check for GIFs first (they can be both image and video)
    if (this.isGifUrl(lowerUrl)) {
      return {
        type: 'gif',
        url,
        extension: '.gif',
        mimeType: 'image/gif'
      };
    }

    // Check for images
    if (this.isImageUrl(lowerUrl)) {
      const extension = this.getImageExtension(lowerUrl);
      return {
        type: 'image',
        url,
        extension,
        mimeType: this.getMimeType(extension)
      };
    }

    // Check for videos
    if (this.isVideoUrl(lowerUrl)) {
      const extension = this.getVideoExtension(lowerUrl);
      return {
        type: 'video',
        url,
        extension,
        mimeType: this.getMimeType(extension)
      };
    }

    // Default to link
    return {
      type: 'link',
      url
    };
  }

  /**
   * Check if URL is an image
   */
  public static isImageUrl(url: string): boolean {
    return this.IMAGE_EXTENSIONS.some(ext => url.includes(ext)) ||
           url.includes('imgur.com') ||
           url.includes('i.redd.it') ||
           url.includes('preview.redd.it');
  }

  /**
   * Check if URL is a video
   */
  public static isVideoUrl(url: string): boolean {
    return this.VIDEO_EXTENSIONS.some(ext => url.includes(ext)) ||
           url.includes('v.redd.it') ||
           url.includes('youtube.com') ||
           url.includes('youtu.be') ||
           url.includes('vimeo.com');
  }

  /**
   * Check if URL is a GIF
   */
  public static isGifUrl(url: string): boolean {
    return this.GIF_EXTENSIONS.some(ext => url.includes(ext)) ||
           url.includes('gfycat.com') ||
           url.includes('imgur.com') && url.includes('.gif');
  }

  /**
   * Get image extension from URL
   */
  public static getImageExtension(url: string): string {
    for (const ext of this.IMAGE_EXTENSIONS) {
      if (url.includes(ext)) {
        return ext;
      }
    }
    
    // Default to .jpg for image URLs without clear extension
    if (url.includes('imgur.com') || url.includes('i.redd.it')) {
      return '.jpg';
    }
    
    return '.jpg';
  }

  /**
   * Get video extension from URL
   */
  public static getVideoExtension(url: string): string {
    for (const ext of this.VIDEO_EXTENSIONS) {
      if (url.includes(ext)) {
        return ext;
      }
    }
    
    // Default to .mp4 for video URLs without clear extension
    if (url.includes('v.redd.it')) {
      return '.mp4';
    }
    
    return '.mp4';
  }

  /**
   * Get MIME type from file extension
   */
  public static getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
      '.flv': 'video/x-flv',
      '.wmv': 'video/x-ms-wmv'
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Generate descriptive filename from content item
   * Uses the Reddit post title as the primary filename
   */
  public static generateFilename(
    title: string,
    subreddit: string,
    author: string,
    mediaType: 'image' | 'video' | 'note' | 'text',
    extension: string,
    url?: string
  ): string {
    // For RedGIFs URLs, extract the original filename
    if (url && url.includes('redgifs.com') && mediaType === 'video') {
      const match = url.match(/https:\/\/media\.redgifs\.com\/([^\/]+)/);
      if (match) {
        let filename = match[1];
        // Remove .mp4 extension if it's already in the filename
        if (filename.endsWith('.mp4')) {
          filename = filename.slice(0, -4);
        }
        return `${filename}.mp4`;
      }
    }
    
    // Sanitize the title for filesystem compatibility
    const sanitizedTitle = title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w\-_]/g, '') // Remove any remaining special characters
      .substring(0, 100); // Allow longer titles for better descriptiveness

    // Add a short identifier to avoid conflicts and provide context
    const sanitizedSubreddit = subreddit.replace(/[<>:"/\\|?*]/g, '').substring(0, 20);
    
    // Use the provided extension (which should be based on detected content type)
    // This ensures HTML content gets saved as .txt, not .mp4
    const finalExtension = extension || '.txt';
    
    // Use format: title_subreddit.extension
    return `${sanitizedTitle}_${sanitizedSubreddit}${finalExtension}`;
  }

  /**
   * Check if content is downloadable
   */
  public static isDownloadable(mediaType: string): boolean {
    return ['image', 'video', 'gif'].includes(mediaType);
  }

  /**
   * Get file size in human readable format
   */
  public static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate URL format
   */
  public static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract domain from URL
   */
  public static getDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
} 