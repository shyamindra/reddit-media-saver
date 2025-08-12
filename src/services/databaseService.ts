import { DatabaseService } from '../database';
import type { DatabaseConfig, SearchFilters, SearchResult } from '../types';
import { contentService } from './contentService';
import { StorageService } from './storageService';
import { downloadService } from './downloadService';
import type { ContentItem } from '../types';
import type { ContentMetadata } from '../types';
import { MediaUtils } from '../utils/mediaUtils';

export interface DatabaseServiceConfig {
  dbPath: string;
  verbose?: boolean;
}

export class DatabaseManager {
  private db: DatabaseService;
  private config: DatabaseServiceConfig;

  constructor(config: DatabaseServiceConfig) {
    this.config = config;
    this.db = new DatabaseService(config);
  }

  /**
   * Initialize database and migrate existing data
   */
  public async initialize(): Promise<void> {
    await this.db.initialize();
    await this.migrateExistingData();
  }

  /**
   * Migrate existing file-based data to database
   */
  private async migrateExistingData(): Promise<void> {
    try {
      // Get existing metadata from file system
      const storage = new StorageService({ 
        basePath: './downloads',
        organizeBySubreddit: false,
        organizeByAuthor: false,
        createSubfolders: false,
        generateHtmlFiles: false
      });
      const existingMetadata = await storage.getAllContentMetadata();
      
      if (existingMetadata.length > 0) {
        console.log(`Migrating ${existingMetadata.length} existing content items to database...`);
        
        for (const metadata of existingMetadata) {
          // Convert metadata back to ContentItem format
          const contentItem: ContentItem = {
            id: metadata.id,
            type: metadata.type,
            title: metadata.title,
            subreddit: metadata.subreddit,
            author: metadata.author,
            url: metadata.url,
            permalink: metadata.permalink,
            created_utc: metadata.created_utc,
            saved: true,
            media: {
              type: metadata.mediaType as any,
              url: metadata.url
            },
            metadata: {
              score: metadata.score,
              num_comments: 0,
              upvote_ratio: 0
            }
          };

          // Insert into database
          this.db.insertContent(contentItem, metadata.downloadedAt);

          // Insert media records
          for (const mediaFile of metadata.mediaFiles) {
            const mediaInfo = MediaUtils.detectMediaType(mediaFile);
            
            this.db.insertMedia({
              content_id: metadata.id,
              type: mediaInfo.type,
              url: mediaFile,
              local_path: mediaFile,
              extension: mediaInfo.extension,
              mime_type: mediaInfo.mimeType,
              download_status: 'completed',
              downloaded_at: metadata.downloadedAt
            });
          }
        }
        
        console.log('Migration completed successfully');
      }
    } catch (error) {
      console.error('Failed to migrate existing data:', error);
    }
  }

  /**
   * Save content to database
   */
  public async saveContent(content: ContentItem): Promise<void> {
    this.db.insertContent(content);

    // Save media information if available
    if (content.media?.url) {
      const mediaInfo = MediaUtils.detectMediaType(content.media.url);
      
      this.db.insertMedia({
        content_id: content.id,
        type: mediaInfo.type,
        url: content.media.url,
        thumbnail_url: content.media.thumbnail,
        extension: mediaInfo.extension,
        mime_type: mediaInfo.mimeType,
        download_status: 'pending'
      });
    }
  }

  /**
   * Search content with advanced filters
   */
  public async searchContent(
    query: string = '',
    filters: SearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    results: SearchResult[];
    total: number;
    hasMore: boolean;
  }> {
    const results = this.db.searchContent(query, filters, limit, offset);
    
    // Get total count for pagination
    const totalResults = this.db.searchContent(query, filters, 1000, 0);
    
    // Load media for each result
    for (const result of results) {
      result.media = this.db.getMediaForContent(result.content.id);
    }

    // Save search to history
    this.db.saveSearchHistory(query, filters, results.length);

    return {
      results,
      total: totalResults.length,
      hasMore: offset + limit < totalResults.length
    };
  }

  /**
   * Get content by ID with full details
   */
  public async getContentById(id: string): Promise<{
    content: any;
    media: any[];
    tags: string[];
  } | null> {
    const content = this.db.getContentById(id);
    if (!content) return null;

    const media = this.db.getMediaForContent(id);
    const tags = this.db.getAllTags()
      .filter(tag => this.db.searchContent('', { tags: [tag.name] }, 1, 0)
        .some(result => result.content.id === id))
      .map(tag => tag.name);

    return { content, media, tags };
  }

  /**
   * Add tag to content
   */
  public addTagToContent(contentId: string, tagName: string): void {
    this.db.addTagToContent(contentId, tagName);
  }

  /**
   * Remove tag from content
   */
  public removeTagFromContent(contentId: string, tagName: string): void {
    this.db.removeTagFromContent(contentId, tagName);
  }

  /**
   * Get all available tags
   */
  public getAllTags(): Array<{ id: number; name: string; color: string }> {
    return this.db.getAllTags();
  }

  /**
   * Get content statistics
   */
  public getStatistics(): {
    totalContent: number;
    totalImages: number;
    totalVideos: number;
    totalNotes: number;
    totalSize: number;
    downloadsCompleted: number;
    downloadsFailed: number;
  } {
    return this.db.getStatistics();
  }

  /**
   * Get search history
   */
  public getSearchHistory(limit: number = 10): Array<{
    query: string;
    filters: SearchFilters;
    results_count: number;
    searched_at: number;
  }> {
    return this.db.getSearchHistory(limit);
  }

  /**
   * Update media download status
   */
  public updateMediaDownloadStatus(
    contentId: string,
    status: 'pending' | 'downloading' | 'completed' | 'failed',
    localPath?: string,
    fileSize?: number,
    errorMessage?: string
  ): void {
    const media = this.db.getMediaForContent(contentId);
    if (media.length > 0) {
      const updates: any = {
        download_status: status,
        downloaded_at: status === 'completed' ? Date.now() : undefined
      };

      if (localPath) updates.local_path = localPath;
      if (fileSize) updates.file_size = fileSize;
      if (errorMessage) updates.error_message = errorMessage;

      this.db.updateMedia(media[0].id, updates);
    }
  }

  /**
   * Get content by subreddit
   */
  public getContentBySubreddit(subreddit: string, limit: number = 50, offset: number = 0): SearchResult[] {
    return this.db.searchContent('', { subreddit }, limit, offset);
  }

  /**
   * Get content by author
   */
  public getContentByAuthor(author: string, limit: number = 50, offset: number = 0): SearchResult[] {
    return this.db.searchContent('', { author }, limit, offset);
  }

  /**
   * Get content by date range
   */
  public getContentByDateRange(
    dateFrom: number,
    dateTo: number,
    limit: number = 50,
    offset: number = 0
  ): SearchResult[] {
    return this.db.searchContent('', { dateFrom, dateTo }, limit, offset);
  }

  /**
   * Get content by media type
   */
  public getContentByMediaType(mediaType: string, limit: number = 50, offset: number = 0): SearchResult[] {
    return this.db.searchContent('', { mediaType }, limit, offset);
  }

  /**
   * Get content by score threshold
   */
  public getContentByScore(minScore: number, limit: number = 50, offset: number = 0): SearchResult[] {
    return this.db.searchContent('', { minScore }, limit, offset);
  }

  /**
   * Get content by tags
   */
  public getContentByTags(tags: string[], limit: number = 50, offset: number = 0): SearchResult[] {
    return this.db.searchContent('', { tags }, limit, offset);
  }

  /**
   * Delete content and associated media
   */
  public async deleteContent(contentId: string): Promise<boolean> {
    try {
      // Delete from storage service first
      const storage = new StorageService({ 
        basePath: './downloads',
        organizeBySubreddit: false,
        organizeByAuthor: false,
        createSubfolders: false,
        generateHtmlFiles: false
      });
      await storage.deleteContent(contentId);
      
      // Delete from database (cascade will handle related records)
      const stmt = this.db['db'].prepare('DELETE FROM content WHERE id = ?');
      stmt.run(contentId);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete content ${contentId}:`, error);
      return false;
    }
  }

  /**
   * Export database to JSON
   */
  public async exportToJson(outputPath: string): Promise<void> {
    const allContent = this.db.searchContent('', {}, 10000, 0);
    const exportData = {
      version: '1.0',
      exported_at: Date.now(),
      content_count: allContent.length,
      content: allContent.map(result => ({
        ...result.content,
        media: result.media,
        tags: result.tags
      }))
    };

    const fs = require('fs').promises;
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
  }

  /**
   * Import content from JSON
   */
  public async importFromJson(inputPath: string): Promise<void> {
    const fs = require('fs').promises;
    const data = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    
    for (const item of data.content) {
      // Convert back to ContentItem format
      const contentItem: ContentItem = {
        id: item.id,
        type: item.type,
        title: item.title,
        subreddit: item.subreddit,
        author: item.author,
        url: item.url,
        permalink: item.permalink,
        created_utc: item.created_utc,
        saved: true,
        media: item.media?.[0] ? {
          type: item.media[0].type as any,
          url: item.media[0].url
        } : undefined,
        metadata: {
          score: item.score,
          num_comments: item.num_comments || 0,
          upvote_ratio: item.upvote_ratio || 0
        }
      };

      this.db.insertContent(contentItem, item.saved_at);

      // Insert media records
      if (item.media) {
        for (const media of item.media) {
          this.db.insertMedia({
            content_id: item.id,
            type: media.type,
            url: media.url,
            local_path: media.local_path,
            file_size: media.file_size,
            mime_type: media.mime_type,
            extension: media.extension,
            download_status: media.download_status,
            downloaded_at: media.downloaded_at
          });
        }
      }

      // Add tags
      if (item.tags) {
        for (const tag of item.tags) {
          this.db.addTagToContent(item.id, tag);
        }
      }
    }
  }

  /**
   * Backup database
   */
  public backup(backupPath: string): void {
    this.db.backup(backupPath);
  }

  /**
   * Get database size
   */
  public getDatabaseSize(): number {
    return this.db.getDatabaseSize();
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.db.close();
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager({
  dbPath: './data/reddit-saver.db',
  verbose: import.meta.env.DEV
}); 