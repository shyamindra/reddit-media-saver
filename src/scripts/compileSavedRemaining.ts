import { readFileSync } from 'fs';
import { join } from 'path';
import {
  extractPostId,
  extractSubredditFromUrl,
  loadCompletedPostIds,
  titleFromPostUrl,
  writeRemainingCsv,
  type RemainingCsvRow,
} from './compileRemainingShared';

interface SavedExportRow {
  id: string;
  url: string;
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
): RemainingCsvRow[] {
  const remaining: RemainingCsvRow[] = [];
  const seenPostIds = new Set<string>();

  for (const row of sourceRows) {
    const postId = extractPostId(row.url);
    if (!postId || completedPostIds.has(postId) || seenPostIds.has(postId)) continue;

    seenPostIds.add(postId);
    remaining.push(toRemainingRow(row));
  }

  return remaining;
}

function main(): void {
  const root = process.cwd();
  const linksDir = join(root, 'reddit-links');
  const logDir = join(root, 'extracted_files');
  const postsOutput = join(linksDir, 'saved-posts-remaining.csv');
  const commentsOutput = join(linksDir, 'saved-comments-remaining.csv');

  const completed = loadCompletedPostIds(logDir);

  const savedPosts = parseSavedExportCsv(join(linksDir, 'saved_posts.csv'));
  const savedComments = parseSavedExportCsv(join(linksDir, 'saved_comments.csv'));

  const postsRemaining = compileRemaining(savedPosts, completed);
  const commentsRemaining = compileRemaining(savedComments, completed);

  writeRemainingCsv(postsOutput, postsRemaining, 'sp');
  writeRemainingCsv(commentsOutput, commentsRemaining, 'sc');

  console.log('📋 Compiling remaining saved Reddit exports\n');
  console.log(`   Completed post IDs (from logs): ${completed.size}\n`);
  console.log(`   Saved posts:    ${savedPosts.length} total → ${postsRemaining.length} remaining`);
  console.log(`   Saved comments: ${savedComments.length} total → ${commentsRemaining.length} remaining`);
  console.log(`\n✅ Wrote ${postsRemaining.length} URLs → ${postsOutput}`);
  console.log(`✅ Wrote ${commentsRemaining.length} URLs → ${commentsOutput}`);

  if (postsRemaining.length > 0) {
    console.log(
      `\n🔄 Download posts:\n   npm run download-firefox -- --input reddit-links/saved-posts-remaining.csv --posts-only --limit 50 --chain 1`,
    );
  }
  if (commentsRemaining.length > 0) {
    console.log(
      `\n🔄 Download comments:\n   npm run download-firefox -- --input reddit-links/saved-comments-remaining.csv --limit 26`,
    );
  }
}

main();
