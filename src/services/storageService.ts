import { promises as fs } from 'fs';
import path from 'path';
import type { ContentItem, ContentMetadata } from '../types';
import { FileUtils } from '../utils/fileUtils';
import { MediaUtils } from '../utils/mediaUtils';
import { FolderOrganizer } from '../utils/folderOrganizer';
import { FilenameSimilarity } from '../utils/filenameSimilarity';

export interface StorageConfig {
  basePath: string;
  organizeBySubreddit: boolean;
  organizeByAuthor: boolean;
  createSubfolders: boolean;
  generateHtmlFiles: boolean;
  customStorageLocation?: string;
}

export interface StorageStats {
  totalItems: number;
  imagesCount: number;
  videosCount: number;
  notesCount: number;
  totalSize: number;
  lastUpdated: number;
}

export class StorageService {
  private fileUtils: FileUtils;
  private folderOrganizer: FolderOrganizer;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    this.fileUtils = new FileUtils(config.basePath);
    this.folderOrganizer = new FolderOrganizer({
      groupBySubreddit: config.organizeBySubreddit,
      groupByAuthor: config.organizeByAuthor
    });
  }

  /**
   * Initialize storage system
   */
  public async initialize(): Promise<void> {
    await this.fileUtils.initializeFolderStructure();
  }

  /**
   * Save content item to file system
   */
  public async saveContent(
    item: ContentItem,
    filePath: string,
    mediaType: 'image' | 'video' | 'note'
  ): Promise<ContentMetadata> {
    const metadata: ContentMetadata = {
      id: item.id,
      type: item.type,
      mediaType,
      title: item.title,
      author: item.author,
      subreddit: item.subreddit,
      url: item.url,
      permalink: item.permalink,
      created_utc: item.created_utc,
      score: item.metadata.score,
      localPath: filePath,
      mediaFiles: [filePath],
      folderPath: path.dirname(filePath),
      downloadedAt: Date.now()
    };

    // Save metadata
    await this.fileUtils.writeMetadata(metadata);

    // Organize files if enabled
    if (this.config.createSubfolders) {
      await this.organizeContent(metadata);
    }

    // Generate HTML file if enabled
    if (this.config.generateHtmlFiles) {
      await this.generateHtmlFile(metadata);
    }

    return metadata;
  }

  /**
   * Organize content into subfolders
   */
  private async organizeContent(metadata: ContentMetadata): Promise<void> {
    const folderPath = this.fileUtils.getMediaFolderPath(metadata.mediaType);
    
    if (metadata.mediaType === 'image' || metadata.mediaType === 'video') {
      await this.folderOrganizer.organizeFolder(folderPath, metadata.mediaType);
    }
  }

  /**
   * Generate HTML file for content viewing
   */
  private async generateHtmlFile(metadata: ContentMetadata): Promise<void> {
    const htmlContent = this.generateHtmlContent(metadata);
    const htmlPath = metadata.localPath.replace(path.extname(metadata.localPath), '.html');
    
    await fs.writeFile(htmlPath, htmlContent, 'utf8');
  }

  /**
   * Generate HTML content for metadata
   */
  private generateHtmlContent(metadata: ContentMetadata): string {
    const mediaElement = this.getMediaElement(metadata);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #0079d3; padding-bottom: 10px; margin-bottom: 20px; }
        .title { color: #0079d3; font-size: 24px; margin: 0 0 10px 0; }
        .meta { color: #666; font-size: 14px; }
        .content { margin: 20px 0; }
        .media { text-align: center; margin: 20px 0; }
        .media img, .media video { max-width: 100%; height: auto; border-radius: 4px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
        a { color: #0079d3; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">${metadata.title}</h1>
            <div class="meta">
                <strong>Subreddit:</strong> <a href="https://reddit.com/r/${metadata.subreddit}" target="_blank">r/${metadata.subreddit}</a> | 
                <strong>Author:</strong> <a href="https://reddit.com/u/${metadata.author}" target="_blank">u/${metadata.author}</a> | 
                <strong>Score:</strong> ${metadata.score} | 
                <strong>Created:</strong> ${new Date(metadata.created_utc * 1000).toLocaleDateString()}
            </div>
        </div>
        
        <div class="content">
            ${mediaElement}
        </div>
        
        <div class="footer">
            <p><strong>Original URL:</strong> <a href="${metadata.url}" target="_blank">${metadata.url}</a></p>
            <p><strong>Reddit Link:</strong> <a href="https://reddit.com${metadata.permalink}" target="_blank">View on Reddit</a></p>
            <p><strong>Downloaded:</strong> ${new Date(metadata.downloadedAt).toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Get media element for HTML
   */
  private getMediaElement(metadata: ContentMetadata): string {
    const filename = path.basename(metadata.localPath);
    const extension = path.extname(filename).toLowerCase();
    
    if (metadata.mediaType === 'image') {
      return `<div class="media"><img src="${filename}" alt="${metadata.title}"></div>`;
    } else if (metadata.mediaType === 'video') {
      return `<div class="media"><video controls><source src="${filename}" type="video/mp4">Your browser does not support the video tag.</video></div>`;
    } else {
      return `<div class="content-text"><p>Text content saved from Reddit</p></div>`;
    }
  }

  /**
   * Get content metadata by ID
   */
  public async getContentMetadata(id: string): Promise<ContentMetadata | null> {
    return await this.fileUtils.readMetadata(id);
  }

  /**
   * Get all content metadata
   */
  public async getAllContentMetadata(): Promise<ContentMetadata[]> {
    try {
      const metadataPath = this.fileUtils.getConfig().metadataPath;
      const files = await fs.readdir(metadataPath);
      const metadataFiles = files.filter(file => file.endsWith('.json'));
      
      const metadata: ContentMetadata[] = [];
      for (const file of metadataFiles) {
        const id = file.replace('.json', '');
        const item = await this.getContentMetadata(id);
        if (item) {
          metadata.push(item);
        }
      }
      
      return metadata;
    } catch {
      return [];
    }
  }

  /**
   * Search content by criteria
   */
  public async searchContent(
    query: string,
    filters?: {
      subreddit?: string;
      author?: string;
      mediaType?: 'image' | 'video' | 'note';
      dateFrom?: number;
      dateTo?: number;
    }
  ): Promise<ContentMetadata[]> {
    const allMetadata = await this.getAllContentMetadata();
    
    return allMetadata.filter(item => {
      // Text search
      const searchText = `${item.title} ${item.subreddit} ${item.author}`.toLowerCase();
      if (query && !searchText.includes(query.toLowerCase())) {
        return false;
      }

      // Filters
      if (filters?.subreddit && item.subreddit !== filters.subreddit) {
        return false;
      }

      if (filters?.author && item.author !== filters.author) {
        return false;
      }

      if (filters?.mediaType && item.mediaType !== filters.mediaType) {
        return false;
      }

      if (filters?.dateFrom && item.created_utc < filters.dateFrom) {
        return false;
      }

      if (filters?.dateTo && item.created_utc > filters.dateTo) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<StorageStats> {
    const metadata = await this.getAllContentMetadata();
    
    const stats: StorageStats = {
      totalItems: metadata.length,
      imagesCount: metadata.filter(item => item.mediaType === 'image').length,
      videosCount: metadata.filter(item => item.mediaType === 'video').length,
      notesCount: metadata.filter(item => item.mediaType === 'note').length,
      totalSize: 0,
      lastUpdated: Date.now()
    };

    // Calculate total size
    for (const item of metadata) {
      if (item.localPath) {
        try {
          const fileStats = await fs.stat(item.localPath);
          stats.totalSize += fileStats.size;
        } catch {
          // File might not exist
        }
      }
    }

    return stats;
  }

  /**
   * Delete content and its files
   */
  public async deleteContent(id: string): Promise<boolean> {
    const metadata = await this.getContentMetadata(id);
    if (!metadata) {
      return false;
    }

    try {
      // Delete media file
      if (metadata.localPath && await this.fileUtils.fileExists(metadata.localPath)) {
        await fs.unlink(metadata.localPath);
      }

      // Delete HTML file if it exists
      const htmlPath = metadata.localPath?.replace(path.extname(metadata.localPath), '.html');
      if (htmlPath && await this.fileUtils.fileExists(htmlPath)) {
        await fs.unlink(htmlPath);
      }

      // Delete metadata file
      const metadataPath = path.join(this.fileUtils.getConfig().metadataPath, `${id}.json`);
      if (await this.fileUtils.fileExists(metadataPath)) {
        await fs.unlink(metadataPath);
      }

      return true;
    } catch (error) {
      console.error(`Error deleting content ${id}:`, error);
      return false;
    }
  }

  /**
   * Update storage configuration
   */
  public updateConfig(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config };
    this.folderOrganizer.updateConfig({
      groupBySubreddit: this.config.organizeBySubreddit,
      groupByAuthor: this.config.organizeByAuthor
    });
  }

  /**
   * Get current configuration
   */
  public getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Export content metadata to JSON
   */
  public async exportMetadata(outputPath: string): Promise<void> {
    const metadata = await this.getAllContentMetadata();
    await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  /**
   * Import content metadata from JSON
   */
  public async importMetadata(inputPath: string): Promise<void> {
    const content = await fs.readFile(inputPath, 'utf8');
    const metadata: ContentMetadata[] = JSON.parse(content);
    
    for (const item of metadata) {
      await this.fileUtils.writeMetadata(item);
    }
  }
} 