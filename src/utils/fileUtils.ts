import { promises as fs } from 'fs';
import path from 'path';
import type { ContentMetadata } from '../types';

export interface FolderConfig {
  basePath: string;
  imagesPath: string;
  videosPath: string;
  notesPath: string;
  metadataPath: string;
}

export class FileUtils {
  private config: FolderConfig;

  constructor(basePath: string) {
    this.config = {
      basePath,
      imagesPath: path.join(basePath, 'Images'),
      videosPath: path.join(basePath, 'Videos'),
      notesPath: path.join(basePath, 'Notes'),
      metadataPath: path.join(basePath, 'metadata')
    };
  }

  public async initializeFolderStructure(): Promise<void> {
    const folders = [
      this.config.basePath,
      this.config.imagesPath,
      this.config.videosPath,
      this.config.notesPath,
      this.config.metadataPath
    ];

    for (const folder of folders) {
      await this.ensureDirectoryExists(folder);
    }
  }

  public async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  public getMediaFolderPath(mediaType: 'image' | 'video' | 'note'): string {
    switch (mediaType) {
      case 'image':
        return this.config.imagesPath;
      case 'video':
        return this.config.videosPath;
      case 'note':
        return this.config.notesPath;
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
  }

  public sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 200);
  }

  public async generateUniqueFilename(
    baseFilename: string,
    extension: string,
    folderPath: string
  ): Promise<string> {
    const sanitizedBase = this.sanitizeFilename(baseFilename);
    let filename = `${sanitizedBase}${extension}`;
    let counter = 1;

    while (await this.fileExists(path.join(folderPath, filename))) {
      filename = `${sanitizedBase}_${counter}${extension}`;
      counter++;
    }

    return filename;
  }

  public async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public async writeMetadata(metadata: ContentMetadata): Promise<void> {
    const filename = `${metadata.id}.json`;
    const filePath = path.join(this.config.metadataPath, filename);
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  public async readMetadata(id: string): Promise<ContentMetadata | null> {
    const filename = `${id}.json`;
    const filePath = path.join(this.config.metadataPath, filename);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content) as ContentMetadata;
    } catch {
      return null;
    }
  }

  public getConfig(): FolderConfig {
    return { ...this.config };
  }
} 