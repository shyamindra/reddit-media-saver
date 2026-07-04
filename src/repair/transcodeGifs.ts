import { RealFfmpegAdapter } from '../adapters/ffmpegAdapter';
import { loadAppConfig } from '../config/appConfig';
import type { AppPaths } from '../config/appConfig';
import {
  transcodeDirectory,
  type TranscodeDirectoryResult,
} from '../services/mediaTranscodeService';

export interface RunTranscodeGifsOptions {
  dryRun?: boolean;
  deleteOriginal?: boolean;
  sourceDirs?: string[];
}

export function resolveTranscodeSourceDirs(
  downloadsRoot: string,
  output: AppPaths['output'],
): string[] {
  const relative = (fullPath: string): string => {
    const prefix = `${downloadsRoot}/`;
    return fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : fullPath;
  };

  return [relative(output.gifs), relative(output.media), relative(output.videos)];
}

export async function runTranscodeGifs(
  options: RunTranscodeGifsOptions = {},
): Promise<TranscodeDirectoryResult> {
  const config = loadAppConfig();
  const downloadsRoot = config.paths.downloadsDir;
  const sourceDirectories =
    options.sourceDirs ?? resolveTranscodeSourceDirs(downloadsRoot, config.paths.output);

  const adapter = new RealFfmpegAdapter();

  return transcodeDirectory(adapter, {
      downloadsRoot,
      sourceDirectories,
      outputDirectory: 'Videos',
      deleteOriginal: options.deleteOriginal ?? false,
    dryRun: options.dryRun ?? false,
  });
}
