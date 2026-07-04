import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/** Process order for partial-remaining.csv — SouthIndianAngels last (gallery loops / 429 magnet). */
const PARTIAL_SUBREDDITS = [
  'KoreanActressFAP',
  'WatchItForThePlot',
  'DesiDivaGallery',
  'SouthIndianAngels',
];

/** Known-bad post IDs to exclude (yt-dlp gallery redirect loops, etc.). */
const SKIP_POST_IDS = new Set(['1o0j8p6']);

const SUCCESS_PATTERN =
  /✅ Saved:|✅ Image fallback:|✅ Image fallback \(json\):|✅ Comment saved:|already been recorded in the archive/;

interface CsvRow {
  key: string;
  url: string;
  title: string;
  subreddit: string;
}

function extractPostId(url: string): string | null {
  const match = url.match(/\/comments\/([^/]+)/);
  return match ? match[1] : null;
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseSubredditCsv(filePath: string, subreddit: string): CsvRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const rows: CsvRow[] = [];

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

function loadCompletedPostIds(logDir: string): Set<string> {
  const completed = new Set<string>();
  const logFiles = readdirSync(logDir).filter(
    (name) => name.endsWith('.log') && (name.includes('run') || name.includes('batch'))
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

function main(): void {
  const root = process.cwd();
  const scrapedDir = join(root, 'reddit-links/subreddit-scraped');
  const logDir = join(root, 'extracted_files');
  const outputPath = join(scrapedDir, 'partial-remaining.csv');

  const completed = loadCompletedPostIds(logDir);
  const remaining: CsvRow[] = [];
  const seenPostIds = new Set<string>();

  console.log('📋 Compiling remaining URLs from partially completed subs\n');
  console.log(`   Completed post IDs (from logs): ${completed.size}\n`);

  for (const subreddit of PARTIAL_SUBREDDITS) {
    const csvPath = join(scrapedDir, `top-${subreddit}.csv`);
    const rows = parseSubredditCsv(csvPath, subreddit);
    const subRemaining = rows.filter((row) => {
      const postId = extractPostId(row.url);
      return postId && !completed.has(postId) && !SKIP_POST_IDS.has(postId);
    });

    console.log(
      `   r/${subreddit}: ${rows.length} scraped, ${subRemaining.length} remaining`
    );

    for (const row of subRemaining) {
      const postId = extractPostId(row.url);
      if (!postId || seenPostIds.has(postId)) continue;
      seenPostIds.add(postId);
      remaining.push(row);
    }
  }

  const header = 'key,url,title,subreddit';
  const lines = remaining.map(
    (row, index) =>
      `rem${String(index + 1).padStart(3, '0')},${row.url},${escapeCsvField(row.title)},${row.subreddit}`
  );

  writeFileSync(outputPath, [header, ...lines].join('\n') + '\n', 'utf-8');

  console.log(`\n✅ Wrote ${remaining.length} URLs → ${outputPath}`);
}

main();
