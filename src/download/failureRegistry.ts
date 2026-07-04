import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'fs';
import type { YtdlpFailureKind } from '../utils/ytdlpFailure';
import { isRetryableFailure } from '../utils/ytdlpFailure';

export function loadSkippedFailureUrls(filePath: string): Set<string> {
  if (!existsSync(filePath)) return new Set();

  const skipped = new Set<string>();
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const tabParts = trimmed.split('\t');
    const url = tabParts[0]?.trim();
    const reason = tabParts[1]?.trim() as YtdlpFailureKind | undefined;

    if (!url) continue;
    if (!reason || !isRetryableFailure(reason)) {
      skipped.add(url);
    }
  }

  return skipped;
}

export function appendFailedDownload(
  filePath: string,
  url: string,
  reason: YtdlpFailureKind,
): void {
  const line = `${url}\t${reason}\n`;
  if (existsSync(filePath)) {
    appendFileSync(filePath, line, 'utf8');
  } else {
    writeFileSync(filePath, line, 'utf8');
  }
}
