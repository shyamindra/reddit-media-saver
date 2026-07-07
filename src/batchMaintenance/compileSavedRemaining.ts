import { readFileSync } from 'fs';
import { join } from 'path';
import { loadSkippedFailureUrls } from '../download/failureRegistry';
import { shouldSkipSubreddit } from '../utils/deadSubreddits';
import {
  extractPostId,
  extractSubredditFromUrl,
  titleFromPostUrl,
  writeRemainingCsv,
  type RemainingCsvRow,
} from '../scripts/compileRemainingShared';
import { loadCompletedPostIds } from './completionLedger';

export interface SavedExportRow {
  id: string;
  url: string;
}

export interface CompileSavedRemainingOptions {
  linksDir: string;
  logDir: string;
  failedDownloadsFile: string;
  postsOutput: string;
  commentsOutput: string;
  dryRun?: boolean;
}

export interface CompileBatchSummary {
  total: number;
  remaining: number;
  excludedFailed: number;
  excludedDeadSub: number;
  rows: RemainingCsvRow[];
}

export interface CompileSavedRemainingResult {
  posts: CompileBatchSummary;
  comments: CompileBatchSummary;
  postsOutput: string;
  commentsOutput: string;
  dryRun: boolean;
}

function parseSavedExportCsv(filePath: string): SavedExportRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const rows: SavedExportRow[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('id,')) continue;

    const commaIndex = trimmed.indexOf(',');
    if (commaIndex === -1) continue;

    const id = trimmed.slice(0, commaIndex).trim();
    const url = trimmed.slice(commaIndex + 1).trim();
    if (!id || !url.startsWith('http')) continue;

    rows.push({ id, url });
  }

  return rows;
}

function toRemainingRow(exportRow: SavedExportRow): RemainingCsvRow {
  return {
    key: exportRow.id,
    url: exportRow.url,
    title: titleFromPostUrl(exportRow.url),
    subreddit: extractSubredditFromUrl(exportRow.url),
  };
}

function compileRemaining(
  sourceRows: SavedExportRow[],
  completedPostIds: Set<string>,
  permanentlyFailedUrls: Set<string>,
): Omit<CompileBatchSummary, 'total'> & { rows: RemainingCsvRow[] } {
  const remaining: RemainingCsvRow[] = [];
  const seenPostIds = new Set<string>();
  let excludedFailed = 0;
  let excludedDeadSub = 0;

  for (const row of sourceRows) {
    const postId = extractPostId(row.url);
    if (!postId || completedPostIds.has(postId) || seenPostIds.has(postId)) continue;

    if (permanentlyFailedUrls.has(row.url)) {
      excludedFailed++;
      continue;
    }

    const subreddit = extractSubredditFromUrl(row.url);
    if (shouldSkipSubreddit(subreddit)) {
      excludedDeadSub++;
      continue;
    }

    seenPostIds.add(postId);
    remaining.push(toRemainingRow(row));
  }

  return {
    remaining: remaining.length,
    excludedFailed,
    excludedDeadSub,
    rows: remaining,
  };
}

export function compileSavedRemaining(
  options: CompileSavedRemainingOptions,
): CompileSavedRemainingResult {
  const completed = loadCompletedPostIds(options.logDir);
  const permanentlyFailed = loadSkippedFailureUrls(options.failedDownloadsFile);

  const savedPosts = parseSavedExportCsv(join(options.linksDir, 'saved_posts.csv'));
  const savedComments = parseSavedExportCsv(join(options.linksDir, 'saved_comments.csv'));

  const postsCompiled = compileRemaining(savedPosts, completed, permanentlyFailed);
  const commentsCompiled = compileRemaining(savedComments, completed, permanentlyFailed);

  const dryRun = options.dryRun ?? false;

  if (!dryRun) {
    writeRemainingCsv(options.postsOutput, postsCompiled.rows, 'sp');
    writeRemainingCsv(options.commentsOutput, commentsCompiled.rows, 'sc');
  }

  return {
    posts: {
      total: savedPosts.length,
      ...postsCompiled,
    },
    comments: {
      total: savedComments.length,
      ...commentsCompiled,
    },
    postsOutput: options.postsOutput,
    commentsOutput: options.commentsOutput,
    dryRun,
  };
}
