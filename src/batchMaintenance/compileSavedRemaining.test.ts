import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { compileSavedRemaining } from './compileSavedRemaining';

function setupTempProject(options?: { includeCompletionLog?: boolean }): string {
  const includeCompletionLog = options?.includeCompletionLog ?? true;
  const root = mkdtempSync(join(tmpdir(), 'batch-maint-'));
  const linksDir = join(root, 'reddit-links');
  const logDir = join(root, 'extracted_files');
  const failedDir = join(logDir, 'failed_requests');

  mkdirSync(linksDir, { recursive: true });
  mkdirSync(failedDir, { recursive: true });

  writeFileSync(
    join(linksDir, 'saved_posts.csv'),
    [
      'id,url',
      't3_a,https://www.reddit.com/r/foo/comments/abc123/post_one/',
      't3_b,https://www.reddit.com/r/foo/comments/def456/post_two/',
    ].join('\n'),
    'utf-8',
  );

  writeFileSync(join(linksDir, 'saved_comments.csv'), 'id,url\n', 'utf-8');

  if (includeCompletionLog) {
    writeFileSync(
      join(logDir, 'saved-posts-batch-run.log'),
      [
        '📥 post: post_one',
        '   🔗 https://www.reddit.com/r/foo/comments/abc123/post_one/',
        '   ✅ Saved: downloads/Videos/post_one.mp4',
      ].join('\n'),
      'utf-8',
    );
  }

  writeFileSync(join(failedDir, 'failed-firefox-downloads.txt'), '', 'utf-8');

  return root;
}

function compileOptions(root: string, dryRun = false) {
  const linksDir = join(root, 'reddit-links');
  const logDir = join(root, 'extracted_files');
  return {
    linksDir,
    logDir,
    failedDownloadsFile: join(logDir, 'failed_requests/failed-firefox-downloads.txt'),
    postsOutput: join(linksDir, 'saved-posts-remaining.csv'),
    commentsOutput: join(linksDir, 'saved-comments-remaining.csv'),
    dryRun,
  };
}

describe('compileSavedRemaining', () => {
  it('writes remaining posts CSV excluding post IDs in the completion ledger', () => {
    const root = setupTempProject();
    const options = compileOptions(root);

    const result = compileSavedRemaining({ ...options, dryRun: false });

    expect(result.posts.total).toBe(2);
    expect(result.posts.remaining).toBe(1);
    expect(result.posts.rows).toHaveLength(1);
    expect(result.posts.rows[0]?.url).toBe(
      'https://www.reddit.com/r/foo/comments/def456/post_two/',
    );

    const written = readFileSync(options.postsOutput, 'utf-8');
    expect(written).toContain('def456/post_two');
    expect(written).not.toContain('abc123/post_one');
  });

  it('excludes permanently failed URLs from the remaining link batch', () => {
    const root = setupTempProject({ includeCompletionLog: false });
    const options = compileOptions(root);
    const failedUrl = 'https://www.reddit.com/r/foo/comments/def456/post_two/';

    writeFileSync(options.failedDownloadsFile, `${failedUrl}\tgone\n`, 'utf-8');

    const result = compileSavedRemaining({ ...options, dryRun: false });

    expect(result.posts.total).toBe(2);
    expect(result.posts.remaining).toBe(1);
    expect(result.posts.excludedFailed).toBe(1);
    expect(result.posts.rows).toHaveLength(1);
    expect(result.posts.rows[0]?.url).toBe(
      'https://www.reddit.com/r/foo/comments/abc123/post_one/',
    );
  });

  it('excludes posts from dead subreddits in the remaining link batch', () => {
    const root = mkdtempSync(join(tmpdir(), 'batch-maint-dead-'));
    const linksDir = join(root, 'reddit-links');
    const logDir = join(root, 'extracted_files');
    const failedDir = join(logDir, 'failed_requests');
    mkdirSync(linksDir, { recursive: true });
    mkdirSync(failedDir, { recursive: true });

    writeFileSync(
      join(linksDir, 'saved_posts.csv'),
      [
        'id,url',
        't3_alive,https://www.reddit.com/r/foo/comments/abc123/active_post/',
        't3_dead,https://www.reddit.com/r/casual_random/comments/def456/dead_sub_post/',
      ].join('\n'),
      'utf-8',
    );
    writeFileSync(join(linksDir, 'saved_comments.csv'), 'id,url\n', 'utf-8');
    writeFileSync(join(failedDir, 'failed-firefox-downloads.txt'), '', 'utf-8');

    const options = compileOptions(root);
    const result = compileSavedRemaining({ ...options, dryRun: false });

    expect(result.posts.total).toBe(2);
    expect(result.posts.remaining).toBe(1);
    expect(result.posts.excludedDeadSub).toBe(1);
    expect(result.posts.rows).toHaveLength(1);
    expect(result.posts.rows[0]?.url).toBe(
      'https://www.reddit.com/r/foo/comments/abc123/active_post/',
    );
  });

  it('keeps URLs with retryable failures in the remaining link batch', () => {
    const root = setupTempProject({ includeCompletionLog: false });
    const options = compileOptions(root);
    const retryableUrl = 'https://www.reddit.com/r/foo/comments/def456/post_two/';

    writeFileSync(options.failedDownloadsFile, `${retryableUrl}\trate_limit\n`, 'utf-8');

    const result = compileSavedRemaining({ ...options, dryRun: false });

    expect(result.posts.total).toBe(2);
    expect(result.posts.remaining).toBe(2);
    expect(result.posts.excludedFailed).toBe(0);
    expect(result.posts.rows.map((row) => row.url)).toEqual([
      'https://www.reddit.com/r/foo/comments/abc123/post_one/',
      retryableUrl,
    ]);
  });

  it('dry-run previews remaining counts without writing output CSVs', () => {
    const root = setupTempProject();
    const options = compileOptions(root, true);

    const result = compileSavedRemaining(options);

    expect(result.dryRun).toBe(true);
    expect(result.posts.remaining).toBe(1);
    expect(existsSync(options.postsOutput)).toBe(false);
  });
});
