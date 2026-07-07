import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { compilePartialRemaining } from './compilePartialRemaining';

function setupPartialProject(): {
  root: string;
  scrapedDir: string;
  logDir: string;
  outputPath: string;
} {
  const root = mkdtempSync(join(tmpdir(), 'batch-partial-'));
  const scrapedDir = join(root, 'subreddit-scraped');
  const logDir = join(root, 'extracted_files');

  mkdirSync(scrapedDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });

  writeFileSync(
    join(scrapedDir, 'top-KoreanActressFAP.csv'),
    [
      'key,url,title,subreddit',
      'k001,https://www.reddit.com/r/KoreanActressFAP/comments/aaa111/post_a/,Post A,KoreanActressFAP',
      'k002,https://www.reddit.com/r/KoreanActressFAP/comments/bbb222/post_b/,Post B,KoreanActressFAP',
    ].join('\n'),
    'utf-8',
  );

  writeFileSync(
    join(logDir, 'subreddit-batch-run.log'),
    [
      '📥 post: post_a',
      '   🔗 https://www.reddit.com/r/KoreanActressFAP/comments/aaa111/post_a/',
      '   ✅ Saved: downloads/Videos/post_a.mp4',
    ].join('\n'),
    'utf-8',
  );

  return {
    root,
    scrapedDir,
    logDir,
    outputPath: join(scrapedDir, 'partial-remaining.csv'),
  };
}

describe('compilePartialRemaining', () => {
  it('writes partial remaining CSV excluding completed post IDs from subreddit scrape files', () => {
    const { scrapedDir, logDir, outputPath } = setupPartialProject();

    const result = compilePartialRemaining({
      scrapedDir,
      logDir,
      outputPath,
      subreddits: ['KoreanActressFAP'],
      dryRun: false,
    });

    expect(result.total).toBe(2);
    expect(result.remaining).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.url).toBe(
      'https://www.reddit.com/r/KoreanActressFAP/comments/bbb222/post_b/',
    );
    expect(result.bySubreddit.KoreanActressFAP).toEqual({ scraped: 2, remaining: 1 });

    const written = readFileSync(outputPath, 'utf-8');
    expect(written).toContain('bbb222/post_b');
    expect(written).not.toContain('aaa111/post_a');
  });

  it('excludes known-bad post IDs from the partial remaining link batch', () => {
    const { scrapedDir, logDir, outputPath } = setupPartialProject();

    writeFileSync(
      join(scrapedDir, 'top-KoreanActressFAP.csv'),
      [
        'key,url,title,subreddit',
        'k001,https://www.reddit.com/r/KoreanActressFAP/comments/1o0j8p6/bad_post/,Bad Post,KoreanActressFAP',
        'k002,https://www.reddit.com/r/KoreanActressFAP/comments/bbb222/post_b/,Post B,KoreanActressFAP',
      ].join('\n'),
      'utf-8',
    );

    const result = compilePartialRemaining({
      scrapedDir,
      logDir,
      outputPath,
      subreddits: ['KoreanActressFAP'],
      dryRun: false,
    });

    expect(result.remaining).toBe(1);
    expect(result.rows[0]?.url).toContain('bbb222/post_b');
  });

  it('dry-run previews partial remaining counts without writing output CSV', () => {
    const { scrapedDir, logDir, outputPath } = setupPartialProject();

    const result = compilePartialRemaining({
      scrapedDir,
      logDir,
      outputPath,
      subreddits: ['KoreanActressFAP'],
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.remaining).toBe(1);
    expect(existsSync(outputPath)).toBe(false);
  });
});
