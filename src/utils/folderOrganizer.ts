import { promises as fs } from 'fs';
import path from 'path';
import type { ContentMetadata } from '../types';

export interface FolderGroup {
  name: string;
  files: string[];
  similarity: number;
}

export interface OrganizerConfig {
  minSimilarity: number;
  maxFilesPerGroup: number;
  groupBySubreddit: boolean;
  groupByAuthor: boolean;
}

export class FolderOrganizer {
  private config: OrganizerConfig;

  constructor(config: Partial<OrganizerConfig> = {}) {
    this.config = {
      minSimilarity: 0.7,
      maxFilesPerGroup: 10,
      groupBySubreddit: true,
      groupByAuthor: false,
      ...config
    };
  }

  /**
   * Organize files into subfolders based on similarity
   */
  public async organizeFolder(
    folderPath: string,
    mediaType: 'image' | 'video'
  ): Promise<void> {
    try {
      const files = await this.getFilesInFolder(folderPath);
      if (files.length === 0) return;

      const groups = this.groupFilesBySimilarity(files);
      
      for (const group of groups) {
        if (group.files.length > 1) {
          await this.createSubfolderAndMoveFiles(folderPath, group);
        }
      }
    } catch (error) {
      console.error(`Error organizing folder ${folderPath}:`, error);
    }
  }

  /**
   * Get all files in a folder
   */
  private async getFilesInFolder(folderPath: string): Promise<string[]> {
    try {
      const items = await fs.readdir(folderPath, { withFileTypes: true });
      return items
        .filter(item => item.isFile())
        .map(item => item.name);
    } catch {
      return [];
    }
  }

  /**
   * Group files by similarity
   */
  private groupFilesBySimilarity(files: string[]): FolderGroup[] {
    const groups: FolderGroup[] = [];
    const processed = new Set<string>();

    for (const file of files) {
      if (processed.has(file)) continue;

      const group: FolderGroup = {
        name: this.generateGroupName(file),
        files: [file],
        similarity: 1.0
      };

      processed.add(file);

      // Find similar files
      for (const otherFile of files) {
        if (processed.has(otherFile)) continue;

        const similarity = this.calculateSimilarity(file, otherFile);
        if (similarity >= this.config.minSimilarity && 
            group.files.length < this.config.maxFilesPerGroup) {
          group.files.push(otherFile);
          processed.add(otherFile);
          group.similarity = Math.min(group.similarity, similarity);
        }
      }

      groups.push(group);
    }

    return groups.filter(group => group.files.length > 1);
  }

  /**
   * Generate group name from filename
   */
  private generateGroupName(filename: string): string {
    const nameWithoutExt = path.parse(filename).name;
    
    if (this.config.groupBySubreddit) {
      const parts = nameWithoutExt.split('_');
      if (parts.length >= 2) {
        return parts[1]; // Subreddit name
      }
    }

    if (this.config.groupByAuthor) {
      const parts = nameWithoutExt.split('_');
      if (parts.length >= 3) {
        return parts[2]; // Author name
      }
    }

    // Default: use first part of filename
    return nameWithoutExt.split('_')[0];
  }

  /**
   * Calculate similarity between two filenames
   */
  private calculateSimilarity(filename1: string, filename2: string): number {
    const name1 = path.parse(filename1).name.toLowerCase();
    const name2 = path.parse(filename2).name.toLowerCase();

    // Extract components
    const parts1 = name1.split('_');
    const parts2 = name2.split('_');

    let similarity = 0;
    let totalComparisons = 0;

    // Compare title (first part)
    if (parts1[0] && parts2[0]) {
      similarity += this.levenshteinSimilarity(parts1[0], parts2[0]);
      totalComparisons++;
    }

    // Compare subreddit (second part)
    if (parts1[1] && parts2[1]) {
      similarity += parts1[1] === parts2[1] ? 1 : 0;
      totalComparisons++;
    }

    // Compare author (third part)
    if (parts1[2] && parts2[2]) {
      similarity += parts1[2] === parts2[2] ? 1 : 0;
      totalComparisons++;
    }

    return totalComparisons > 0 ? similarity / totalComparisons : 0;
  }

  /**
   * Calculate Levenshtein similarity between two strings
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength > 0 ? 1 - (distance / maxLength) : 1;
  }

  /**
   * Create subfolder and move files
   */
  private async createSubfolderAndMoveFiles(
    parentFolder: string,
    group: FolderGroup
  ): Promise<void> {
    const subfolderPath = path.join(parentFolder, group.name);
    
    try {
      await fs.mkdir(subfolderPath, { recursive: true });

      for (const file of group.files) {
        const sourcePath = path.join(parentFolder, file);
        const destPath = path.join(subfolderPath, file);
        
        await fs.rename(sourcePath, destPath);
      }
    } catch (error) {
      console.error(`Error moving files to subfolder ${subfolderPath}:`, error);
    }
  }

  /**
   * Organize content by metadata
   */
  public async organizeByMetadata(
    metadata: ContentMetadata[],
    basePath: string
  ): Promise<void> {
    const mediaGroups = this.groupContentByMetadata(metadata);

    for (const [mediaType, items] of Object.entries(mediaGroups)) {
      const folderPath = path.join(basePath, this.getMediaFolderName(mediaType));
      await this.ensureDirectoryExists(folderPath);

      // Group by subreddit if enabled
      if (this.config.groupBySubreddit) {
        const subredditGroups = this.groupBySubreddit(items);
        for (const [subreddit, subredditItems] of Object.entries(subredditGroups)) {
          const subredditPath = path.join(folderPath, subreddit);
          await this.ensureDirectoryExists(subredditPath);
          
          // Move files to subreddit folder
          for (const item of subredditItems) {
            await this.moveContentToFolder(item, subredditPath);
          }
        }
      } else {
        // Move files directly to media type folder
        for (const item of items) {
          await this.moveContentToFolder(item, folderPath);
        }
      }
    }
  }

  /**
   * Group content by metadata
   */
  private groupContentByMetadata(metadata: ContentMetadata[]): Record<string, ContentMetadata[]> {
    const groups: Record<string, ContentMetadata[]> = {
      image: [],
      video: [],
      note: []
    };

    for (const item of metadata) {
      const type = item.mediaType;
      if (groups[type]) {
        groups[type].push(item);
      }
    }

    return groups;
  }

  /**
   * Group items by subreddit
   */
  private groupBySubreddit(items: ContentMetadata[]): Record<string, ContentMetadata[]> {
    const groups: Record<string, ContentMetadata[]> = {};

    for (const item of items) {
      const subreddit = item.subreddit;
      if (!groups[subreddit]) {
        groups[subreddit] = [];
      }
      groups[subreddit].push(item);
    }

    return groups;
  }

  /**
   * Get media folder name
   */
  private getMediaFolderName(mediaType: string): string {
    switch (mediaType) {
      case 'image':
        return 'Images';
      case 'video':
        return 'Videos';
      case 'note':
        return 'Notes';
      default:
        return 'Other';
    }
  }

  /**
   * Move content to specified folder
   */
  private async moveContentToFolder(
    metadata: ContentMetadata,
    folderPath: string
  ): Promise<void> {
    try {
      if (metadata.localPath && await this.fileExists(metadata.localPath)) {
        const filename = path.basename(metadata.localPath);
        const destPath = path.join(folderPath, filename);
        
        await fs.rename(metadata.localPath, destPath);
        
        // Update metadata
        metadata.localPath = destPath;
        metadata.folderPath = folderPath;
      }
    } catch (error) {
      console.error(`Error moving content ${metadata.id}:`, error);
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<OrganizerConfig>): void {
    this.config = { ...this.config, ...config };
  }
} 