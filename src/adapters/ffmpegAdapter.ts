import { existsSync } from 'fs';
import { spawn, spawnSync } from 'child_process';

export interface FfmpegAdapter {
  isAvailable(): Promise<boolean>;
  transcode(inputPath: string, outputPath: string): Promise<void>;
}

export class FfmpegNotFoundError extends Error {
  constructor() {
    super(
      'ffmpeg is not installed or not on PATH. Install it with: brew install ffmpeg',
    );
    this.name = 'FfmpegNotFoundError';
  }
}

function parseFfmpegError(stderr: string): string {
  const lines = stderr
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('ffmpeg version'))
    .filter((line) => !line.startsWith('built with'))
    .filter((line) => !line.startsWith('configuration:'))
    .filter((line) => !line.startsWith('lib'));

  const errorLines = lines.filter((line) =>
    /error|invalid|no such file/i.test(line),
  );

  if (errorLines.length > 0) {
    return errorLines.slice(-2).join(' ');
  }

  return lines.slice(-2).join(' ') || 'ffmpeg transcode failed';
}

export function resolveFfmpegBinary(): string {
  const candidates = [
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    'ffmpeg',
  ];

  for (const candidate of candidates) {
    if (candidate.includes('/')) {
      if (existsSync(candidate)) return candidate;
      continue;
    }

    const found = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (found.status === 0 && found.stdout.trim()) {
      return found.stdout.trim();
    }
  }

  return 'ffmpeg';
}

export class RealFfmpegAdapter implements FfmpegAdapter {
  private readonly binary: string;

  constructor(binary = resolveFfmpegBinary()) {
    this.binary = binary;
  }

  async isAvailable(): Promise<boolean> {
    const result = spawnSync(this.binary, ['-version'], { encoding: 'utf8' });
    return result.status === 0;
  }

  async transcode(inputPath: string, outputPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-y',
        '-i',
        inputPath,
        '-movflags',
        'faststart',
        '-pix_fmt',
        'yuv420p',
        '-vf',
        'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        outputPath,
      ];

      const child = spawn(this.binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new FfmpegNotFoundError());
          return;
        }
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(parseFfmpegError(stderr)));
      });
    });
  }
}
