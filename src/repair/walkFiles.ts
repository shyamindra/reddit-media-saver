import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { loadAppConfig } from '../config/appConfig';

export interface WalkedFile {
  category: string;
  dirPath: string;
  filePath: string;
  fileName: string;
}

export interface WalkFilesOptions {
  categories?: string[];
  extension?: RegExp;
  /** When true, only files directly in the category folder (not subfolders). Default true. */
  topLevelOnly?: boolean;
}

const DEFAULT_CATEGORIES = ['Images', 'Videos', 'Gifs', 'Notes', 'Media'];

export function outputCategoryPath(category: string, downloadsDir?: string): string {
  const config = loadAppConfig();
  const base = downloadsDir ?? config.paths.downloadsDir;
  return join(base, category);
}

export function walkOutputFiles(options: WalkFilesOptions = {}): WalkedFile[] {
  const config = loadAppConfig();
  const categories = options.categories ?? DEFAULT_CATEGORIES;
  const topLevelOnly = options.topLevelOnly ?? true;
  const results: WalkedFile[] = [];

  for (const category of categories) {
    const dirPath = outputCategoryPath(category, config.paths.downloadsDir);
    if (!existsSync(dirPath)) continue;

    for (const entry of readdirSync(dirPath)) {
      if (entry.startsWith('.')) continue;

      const filePath = join(dirPath, entry);
      const stats = statSync(filePath);
      if (!stats.isFile()) {
        if (topLevelOnly) continue;
      } else {
        if (options.extension && !options.extension.test(entry)) continue;
        results.push({ category, dirPath, filePath, fileName: entry });
      }
    }
  }

  return results;
}

export function walkNotesTextFiles(): WalkedFile[] {
  return walkOutputFiles({ categories: ['Notes'], extension: /\.txt$/i });
}

export function walkMediaImageFiles(): WalkedFile[] {
  return walkOutputFiles({
    categories: ['Images', 'Videos', 'Gifs'],
    extension: /\.(jpg|jpeg|png|gif|webp)$/i,
  });
}

export function walkVideoFiles(): WalkedFile[] {
  return walkOutputFiles({ categories: ['Videos'], extension: /\.mp4$/i });
}
