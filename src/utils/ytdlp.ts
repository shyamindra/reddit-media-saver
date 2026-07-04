import { existsSync } from 'fs';
import { spawnSync } from 'child_process';

export function resolveYtdlpBinary(): string {
  const candidates = ['/opt/homebrew/bin/yt-dlp', '/usr/local/bin/yt-dlp', 'yt-dlp'];
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
  return 'yt-dlp';
}

const REDIRECT_LOOP_PATTERN = /Following redirect to|Downloading JSON metadata/g;

export const REDIRECT_LOOP_ABORT_THRESHOLD = 8;

export function countRedirectLoopHits(text: string): number {
  return (text.match(REDIRECT_LOOP_PATTERN) ?? []).length;
}
