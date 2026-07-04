import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadCompletedPostIds } from './compileRemainingShared';

describe('compileSavedRemaining', () => {
  it('loadCompletedPostIds picks up saved-posts batch successes', () => {
    const logDir = mkdtempSync(join(tmpdir(), 'compile-saved-'));
    writeFileSync(
      join(logDir, 'saved-posts-batch-run.log'),
      [
        '📥 post: test slug',
        '   🔗 https://www.reddit.com/r/test/comments/abc123/test_slug/',
        '   ✅ Saved: downloads/Videos/test.mp4',
      ].join('\n'),
      'utf8',
    );

    const completed = loadCompletedPostIds(logDir);
    expect(completed.has('abc123')).toBe(true);
  });
});
