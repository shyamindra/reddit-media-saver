import { redditApi } from './redditApi';
import type { RedditPost, RedditComment, RedditApiResponse } from '../types/reddit';
import type { ContentItem, ContentFetchOptions, ContentFetchResult, DownloadProgress } from '../types';
import { authService } from './authService';

export class ContentService {
  private downloadQueue: Map<string, DownloadProgress> = new Map();
  private isProcessingQueue = false;

  /**
   * Fetch saved posts with pagination
   */
  public async fetchSavedPosts(
    username: string,
    options: ContentFetchOptions = {}
  ): Promise<ContentFetchResult> {
    const { limit = 25, after, before } = options;

    try {
      const response: RedditApiResponse<RedditPost> = await redditApi.getSavedPosts(
        username,
        limit,
        after,
        before
      );

      const items: ContentItem[] = response.data.children
        .filter(child => child.kind === 't3') // Only posts
        .map(child => this.convertPostToContentItem(child.data));

      return {
        items,
        pagination: {
          after: response.data.after,
          before: response.data.before,
          hasMore: !!response.data.after,
        },
        totalFetched: items.length,
      };
    } catch (error) {
      console.error('Failed to fetch saved posts:', error);
      throw new Error(`Failed to fetch saved posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch saved comments with pagination
   */
  public async fetchSavedComments(
    username: string,
    options: ContentFetchOptions = {}
  ): Promise<ContentFetchResult> {
    const { limit = 25, after, before } = options;

    try {
      const response: RedditApiResponse<RedditComment> = await redditApi.getSavedComments(
        username,
        limit,
        after,
        before
      );

      const items: ContentItem[] = response.data.children
        .filter(child => child.kind === 't1') // Only comments
        .map(child => this.convertCommentToContentItem(child.data));

      return {
        items,
        pagination: {
          after: response.data.after,
          before: response.data.before,
          hasMore: !!response.data.after,
        },
        totalFetched: items.length,
      };
    } catch (error) {
      console.error('Failed to fetch saved comments:', error);
      throw new Error(`Failed to fetch saved comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch all saved content (posts and comments) with pagination
   */
  public async fetchAllSavedContent(
    username: string,
    options: ContentFetchOptions = {}
  ): Promise<ContentFetchResult> {
    const { limit = 25, after, before } = options;

    try {
      const response: RedditApiResponse<RedditPost | RedditComment> = await redditApi.getSavedPosts(
        username,
        limit,
        after,
        before
      );

      const items: ContentItem[] = response.data.children.map(child => {
        if (child.kind === 't3') {
          return this.convertPostToContentItem(child.data as RedditPost);
        } else if (child.kind === 't1') {
          return this.convertCommentToContentItem(child.data as RedditComment);
        }
        return null;
      }).filter(Boolean) as ContentItem[];

      return {
        items,
        pagination: {
          after: response.data.after,
          before: response.data.before,
          hasMore: !!response.data.after,
        },
        totalFetched: items.length,
      };
    } catch (error) {
      console.error('Failed to fetch saved content:', error);
      throw new Error(`Failed to fetch saved content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert Reddit post to ContentItem
   */
  private convertPostToContentItem(post: RedditPost): ContentItem {
    const media = this.detectMediaType(post);
    
    return {
      id: post.id,
      type: 'post',
      title: post.title,
      subreddit: post.subreddit,
      author: post.author,
      url: post.url,
      permalink: post.permalink,
      created_utc: post.created_utc,
      saved: post.saved,
      media,
      metadata: {
        score: post.score,
        num_comments: post.num_comments,
        upvote_ratio: post.upvote_ratio,
        selftext: post.selftext,
      },
    };
  }

  /**
   * Convert Reddit comment to ContentItem
   */
  private convertCommentToContentItem(comment: RedditComment): ContentItem {
    return {
      id: comment.id,
      type: 'comment',
      title: comment.link_title,
      subreddit: comment.subreddit,
      author: comment.author,
      url: comment.link_url,
      permalink: comment.permalink,
      created_utc: comment.created_utc,
      saved: comment.saved,
      media: {
        type: 'text',
      },
      metadata: {
        score: comment.score,
        body: comment.body,
      },
    };
  }

  /**
   * Detect media type from Reddit post
   */
  private detectMediaType(post: RedditPost): ContentItem['media'] {
    // Check for Reddit videos
    if (post.is_video && post.media?.reddit_video?.fallback_url) {
      return {
        type: 'video',
        url: post.media.reddit_video.fallback_url,
        thumbnail: post.thumbnail,
      };
    }

    // Check for secure media (videos)
    if (post.secure_media?.reddit_video?.fallback_url) {
      return {
        type: 'video',
        url: post.secure_media.reddit_video.fallback_url,
        thumbnail: post.thumbnail,
      };
    }

    // Check for image previews
    if (post.preview?.images && post.preview.images.length > 0) {
      const image = post.preview.images[0];
      return {
        type: 'image',
        url: image.source.url,
        thumbnail: post.thumbnail,
        preview: image,
      };
    }

    // Check for image URLs in the URL field
    if (post.url && this.isImageUrl(post.url)) {
      return {
        type: 'image',
        url: post.url,
        thumbnail: post.thumbnail,
      };
    }

    // Check for GIF URLs
    if (post.url && this.isGifUrl(post.url)) {
      return {
        type: 'gif',
        url: post.url,
        thumbnail: post.thumbnail,
      };
    }

    // Check for external links
    if (post.url && !post.is_self && !post.url.startsWith('https://www.reddit.com')) {
      return {
        type: 'link',
        url: post.url,
        thumbnail: post.thumbnail,
      };
    }

    // Text post
    if (post.is_self) {
      return {
        type: 'text',
      };
    }

    // Default to link
    return {
      type: 'link',
      url: post.url,
      thumbnail: post.thumbnail,
    };
  }

  /**
   * Check if URL is an image
   */
  private isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('imgur.com') ||
           lowerUrl.includes('i.redd.it');
  }

  /**
   * Check if URL is a GIF
   */
  private isGifUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.gif') || 
           lowerUrl.includes('gfycat.com') ||
           lowerUrl.includes('imgur.com/gif');
  }

  /**
   * Add item to download queue
   */
  public addToDownloadQueue(item: ContentItem): void {
    if (!item.media || item.media.type === 'text' || item.media.type === 'link') {
      return; // Skip text and link items
    }

    const progress: DownloadProgress = {
      itemId: item.id,
      status: 'pending',
      progress: 0,
      startTime: Date.now(),
    };

    this.downloadQueue.set(item.id, progress);
    this.processDownloadQueue();
  }

  /**
   * Process download queue
   */
  private async processDownloadQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      for (const [itemId, progress] of this.downloadQueue) {
        if (progress.status === 'pending') {
          progress.status = 'downloading';
          this.updateDownloadProgress(itemId, progress);

          try {
            // TODO: Implement actual download logic in downloadService
            // For now, just mark as completed
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate download
            
            progress.status = 'completed';
            progress.progress = 100;
            progress.endTime = Date.now();
            this.updateDownloadProgress(itemId, progress);
          } catch (error) {
            progress.status = 'failed';
            progress.error = error instanceof Error ? error.message : 'Download failed';
            progress.endTime = Date.now();
            this.updateDownloadProgress(itemId, progress);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Update download progress
   */
  private updateDownloadProgress(itemId: string, progress: DownloadProgress): void {
    this.downloadQueue.set(itemId, progress);
    // TODO: Emit progress update event
  }

  /**
   * Get download progress for an item
   */
  public getDownloadProgress(itemId: string): DownloadProgress | undefined {
    return this.downloadQueue.get(itemId);
  }

  /**
   * Get all download progress
   */
  public getAllDownloadProgress(): DownloadProgress[] {
    return Array.from(this.downloadQueue.values());
  }

  /**
   * Clear completed downloads from queue
   */
  public clearCompletedDownloads(): void {
    for (const [itemId, progress] of this.downloadQueue) {
      if (progress.status === 'completed' || progress.status === 'failed') {
        this.downloadQueue.delete(itemId);
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return authService.isAuthenticated();
  }

  /**
   * Get current user
   */
  public getCurrentUser(): any | null {
    return authService.getUser();
  }
}

// Re-export types for backward compatibility
export type { ContentItem, ContentFetchOptions, ContentFetchResult, DownloadProgress } from '../types';

// Export singleton instance
export const contentService = new ContentService(); 