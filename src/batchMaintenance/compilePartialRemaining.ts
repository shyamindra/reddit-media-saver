import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  escapeCsvField,
  extractPostId,
  type RemainingCsvRow,
} from '../scripts/compileRemainingShared';
import { loadCompletedPostIds } from './completionLedger';

/** Process order for partial-remaining.csv — SouthIndianAngels last (gallery loops / 429 magnet). */
export const DEFAULT_PARTIAL_SUBREDDITS = [
  'KoreanActressFAP',
  'WatchItForThePlot',
  'DesiDivaGallery',
  'SouthIndianAngels',
] as const;

/** Known-bad post IDs to exclude (yt-dlp gallery redirect loops, etc.). */
export const DEFAULT_SKIP_POST_IDS = new Set(['1o0j8p6']);

export interface CompilePartialRemainingOptions {
  scrapedDir: string;
  logDir: string;
  outputPath: string;
  subreddits?: readonly string[];
  skipPostIds?: Set<string>;
  dryRun?: boolean;
}

export interface SubredditPartialSummary {
  scraped: number;
  remaining: number;
}

export interface CompilePartialRemainingResult {
  total: number;
  remaining: number;
  rows: RemainingCsvRow[];
  bySubreddit: Record<string, SubredditPartialSummary>;
  outputPath: string;
  dryRun: boolean;
}

function parseSubredditCsv(filePath: string, subreddit: string): RemainingCsvRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const rows: RemainingCsvRow[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('key,')) continue;

    const urlMatch = trimmed.match(/(https:\/\/www\.reddit\.com\/[^,\s"]+)/);
    if (!urlMatch) continue;

    const key = trimmed.split(',')[0]?.trim() ?? '';
    const titleMatch = trimmed.match(/,"((?:[^"]|"")*)"\s*$/);
    const title = titleMatch ? titleMatch[1].replace(/""/g, '"') : '';

    rows.push({
      key,
      url: urlMatch[1],
      title,
      subreddit,
    });
  }

  return rows;
}

function writePartialRemainingCsv(outputPath: string, rows: RemainingCsvRow[]): void {
  const header = 'key,url,title,subreddit';
  const lines = rows.map(
    (row, index) =>
      `rem${String(index + 1).padStart(3, '0')},${row.url},${escapeCsvField(row.title)},${row.subreddit}`,
  );

  writeFileSync(outputPath, [header, ...lines].join('\n') + '\n', 'utf-8');
}

export function compilePartialRemaining(
  options: CompilePartialRemainingOptions,
): CompilePartialRemainingResult {
  const subreddits = options.subreddits ?? DEFAULT_PARTIAL_SUBREDDITS;
  const skipPostIds = options.skipPostIds ?? DEFAULT_SKIP_POST_IDS;
  const completed = loadCompletedPostIds(options.logDir);

  const remaining: RemainingCsvRow[] = [];
  const seenPostIds = new Set<string>();
  const bySubreddit: Record<string, SubredditPartialSummary> = {};
  let total = 0;

  for (const subreddit of subreddits) {
    const csvPath = join(options.scrapedDir, `top-${subreddit}.csv`);
    const rows = parseSubredditCsv(csvPath, subreddit);
    total += rows.length;

    const subRemaining = rows.filter((row) => {
      const postId = extractPostId(row.url);
      return postId && !completed.has(postId) && !skipPostIds.has(postId);
    });

    bySubreddit[subreddit] = { scraped: rows.length, remaining: 0 };

    for (const row of subRemaining) {
      const postId = extractPostId(row.url);
      if (!postId || seenPostIds.has(postId)) continue;
      seenPostIds.add(postId);
      remaining.push(row);
      bySubreddit[subreddit].remaining++;
    }
  }

  const dryRun = options.dryRun ?? false;

  if (!dryRun) {
    writePartialRemainingCsv(options.outputPath, remaining);
  }

  return {
    total,
    remaining: remaining.length,
    rows: remaining,
    bySubreddit,
    outputPath: options.outputPath,
    dryRun,
  };
}
