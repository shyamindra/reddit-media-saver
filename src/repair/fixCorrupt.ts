import { readFileSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadAppConfig } from '../config/appConfig';
import { isHtmlContent } from './htmlContent';
import { walkMediaImageFiles, walkVideoFiles } from './walkFiles';

export interface FixCorruptSummary {
  fixed: number;
  scanned: number;
}

function isCorruptedImageFile(filePath: string): boolean {
  try {
    const stats = statSync(filePath);
    if (stats.size < 1024) return false;
    const data = readFileSync(filePath);
    const sample = data.slice(0, Math.min(1024, data.length)).toString('utf8');
    return isHtmlContent(sample);
  } catch {
    return false;
  }
}

function fixImageAsHtml(filePath: string): void {
  const newPath = filePath.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '.txt');
  const data = readFileSync(filePath);
  writeFileSync(newPath, data.toString('utf8'), 'utf8');
  unlinkSync(filePath);
}

function isCorruptedVideoFile(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf8');
    const isHtml = isHtmlContent(content);
    const stats = statSync(filePath);
    const lineCount = content.split('\n').length;
    return isHtml || (stats.size < 1024 * 1024 && lineCount > 1000);
  } catch {
    return false;
  }
}

function fixVideoAsHtml(filePath: string, notesDir: string): void {
  const fileName = filePath.split('/').pop() ?? 'video.mp4';
  const baseName = fileName.replace(/\.mp4$/i, '');
  const newPath = join(notesDir, `${baseName}.txt`);
  const content = readFileSync(filePath, 'utf8');
  writeFileSync(newPath, content, 'utf8');
  unlinkSync(filePath);
}

export function runFixCorrupt(): FixCorruptSummary {
  const config = loadAppConfig();
  const notesDir = config.paths.output.notes;
  let fixed = 0;
  let scanned = 0;

  for (const file of walkMediaImageFiles()) {
    scanned++;
    if (isCorruptedImageFile(file.filePath)) {
      fixImageAsHtml(file.filePath);
      fixed++;
    }
  }

  for (const file of walkVideoFiles()) {
    scanned++;
    if (isCorruptedVideoFile(file.filePath)) {
      fixVideoAsHtml(file.filePath, notesDir);
      fixed++;
    }
  }

  return { fixed, scanned };
}
