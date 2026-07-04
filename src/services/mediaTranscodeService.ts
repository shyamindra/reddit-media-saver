import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { basename, extname, join } from 'path';
import type { FfmpegAdapter } from '../adapters/ffmpegAdapter';
import { FfmpegNotFoundError } from '../adapters/ffmpegAdapter';

export const TRANSCODE_SOURCE_EXTENSIONS = ['.gif', '.gifv'] as const;

export const DEFAULT_DOWNLOADS_ROOT = 'downloads';
export const DEFAULT_SOURCE_DIRECTORIES = ['Gifs', 'Media', 'Videos'];
export const DEFAULT_OUTPUT_DIRECTORY = 'Videos';

export interface TranscodeConfig {
  downloadsRoot?: string;
  sourceDirectories?: string[];
  outputDirectory?: string;
  deleteOriginal?: boolean;
  dryRun?: boolean;
}

export interface TranscodeFileOptions {
  deleteOriginal?: boolean;
  dryRun?: boolean;
}

export interface TranscodeFileResult {
  inputPath: string;
  outputPath: string;
  status: 'converted' | 'dry-run' | 'skipped' | 'failed';
  error?: string;
}

export interface TranscodeDirectoryResult {
  scanned: number;
  converted: number;
  skipped: number;
  failed: number;
  dryRun: number;
  results: TranscodeFileResult[];
}

export function validateTranscodeInput(inputPath: string): string | null {
  const header = readFileSync(inputPath).subarray(0, 512).toString('utf8');

  if (header.startsWith('<!doctype html') || header.startsWith('<html')) {
    return 'Input file is HTML, not media — re-download required';
  }

  const isGif =
    header.startsWith('GIF87a') || header.startsWith('GIF89a');
  const isMp4 = header.includes('ftyp');
  const isWebm = header.startsWith('\x1aE\xdf\xa3');

  if (!isGif && !isMp4 && !isWebm) {
    return 'Input file is not a supported GIF or video container';
  }

  return null;
}

export function isTranscodeSourceFile(filename: string): boolean {
  const extension = extname(filename).toLowerCase();
  return TRANSCODE_SOURCE_EXTENSIONS.includes(
    extension as (typeof TRANSCODE_SOURCE_EXTENSIONS)[number],
  );
}

export function buildOutputPath(
  inputPath: string,
  downloadsRoot: string,
  outputDirectory: string,
): string {
  const stem = basename(inputPath, extname(inputPath));
  return join(downloadsRoot, outputDirectory, `${stem}.mp4`);
}

export function findTranscodeCandidates(
  downloadsRoot: string,
  sourceDirectories: string[],
): string[] {
  const candidates: string[] = [];

  const scanDirectory = (directoryPath: string): void => {
    if (!existsSync(directoryPath)) return;

    for (const entry of readdirSync(directoryPath)) {
      const entryPath = join(directoryPath, entry);
      const stats = statSync(entryPath);

      if (stats.isDirectory()) {
        scanDirectory(entryPath);
        continue;
      }

      if (isTranscodeSourceFile(entry)) {
        candidates.push(entryPath);
      }
    }
  };

  for (const sourceDirectory of sourceDirectories) {
    scanDirectory(join(downloadsRoot, sourceDirectory));
  }

  return candidates.sort();
}

export async function ensureFfmpegAvailable(
  adapter: FfmpegAdapter,
): Promise<void> {
  const available = await adapter.isAvailable();
  if (!available) {
    throw new FfmpegNotFoundError();
  }
}

export async function transcodeFile(
  inputPath: string,
  outputPath: string,
  adapter: FfmpegAdapter,
  options: TranscodeFileOptions = {},
): Promise<TranscodeFileResult> {
  const { deleteOriginal = false, dryRun = false } = options;

  if (!existsSync(inputPath)) {
    return {
      inputPath,
      outputPath,
      status: 'failed',
      error: `Input file not found: ${inputPath}`,
    };
  }

  if (existsSync(outputPath)) {
    return {
      inputPath,
      outputPath,
      status: 'skipped',
    };
  }

  const validationError = validateTranscodeInput(inputPath);
  if (validationError) {
    return {
      inputPath,
      outputPath,
      status: 'failed',
      error: validationError,
    };
  }

  if (dryRun) {
    return {
      inputPath,
      outputPath,
      status: 'dry-run',
    };
  }

  try {
    const outputDir = join(outputPath, '..');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    await adapter.transcode(inputPath, outputPath);

    if (deleteOriginal) {
      unlinkSync(inputPath);
    }

    return {
      inputPath,
      outputPath,
      status: 'converted',
    };
  } catch (error) {
    return {
      inputPath,
      outputPath,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function transcodeDirectory(
  adapter: FfmpegAdapter,
  config: TranscodeConfig = {},
): Promise<TranscodeDirectoryResult> {
  const downloadsRoot = config.downloadsRoot ?? DEFAULT_DOWNLOADS_ROOT;
  const sourceDirectories =
    config.sourceDirectories ?? DEFAULT_SOURCE_DIRECTORIES;
  const outputDirectory = config.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY;
  const deleteOriginal = config.deleteOriginal ?? false;
  const dryRun = config.dryRun ?? false;

  if (!dryRun) {
    await ensureFfmpegAvailable(adapter);
  }

  const candidates = findTranscodeCandidates(downloadsRoot, sourceDirectories);
  const results: TranscodeFileResult[] = [];

  for (const inputPath of candidates) {
    const outputPath = buildOutputPath(
      inputPath,
      downloadsRoot,
      outputDirectory,
    );

    const result = await transcodeFile(inputPath, outputPath, adapter, {
      deleteOriginal,
      dryRun,
    });
    results.push(result);
  }

  return {
    scanned: candidates.length,
    converted: results.filter((result) => result.status === 'converted').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    failed: results.filter((result) => result.status === 'failed').length,
    dryRun: results.filter((result) => result.status === 'dry-run').length,
    results,
  };
}
