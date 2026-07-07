import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  extractPostId,
  extractSubredditFromUrl,
  titleFromPostUrl,
} from '../linkIntake/redditUrlParsers';

export { extractPostId, extractSubredditFromUrl, titleFromPostUrl };

export const SUCCESS_PATTERN =
  /✅ Saved:|✅ Image fallback:|✅ Image fallback \(json\):|✅ Motion fallback \(json\):|✅ Video fallback \(redgifs\):|✅ Comment saved:|already been recorded in the archive/;

export interface RemainingCsvRow {
  key: string;
  url: string;
  title: string;
  subreddit: string;
}

export function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function loadCompletedPostIds(logDir: string): Set<string> {
  const completed = new Set<string>();
  const logFiles = readdirSync(logDir).filter(
    (name) => name.endsWith('.log') && (name.includes('run') || name.includes('batch')),
  );

  for (const fileName of logFiles) {
    const log = readFileSync(join(logDir, fileName), 'utf-8');
    const urlRegex = /🔗 (https:\/\/www\.reddit\.com\/[^\s]+)/g;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(log)) !== null) {
      const start = match.index;
      const nextUrl = log.indexOf('🔗 ', start + 1);
      const block = nextUrl === -1 ? log.slice(start) : log.slice(start, nextUrl);

      if (!SUCCESS_PATTERN.test(block)) continue;

      const postId = extractPostId(match[1]);
      if (postId) completed.add(postId);
    }
  }

  return completed;
}

export function writeRemainingCsv(outputPath: string, rows: RemainingCsvRow[], keyPrefix: string): void {
  const header = 'key,url,title,subreddit';
  const lines = rows.map(
    (row, index) =>
      `${keyPrefix}${String(index + 1).padStart(3, '0')},${row.url},${escapeCsvField(row.title)},${row.subreddit}`,
  );

  const payload = rows.length > 0 ? [header, ...lines].join('\n') + '\n' : header + '\n';
  writeFileSync(outputPath, payload, 'utf-8');
}
