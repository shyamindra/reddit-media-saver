import { countRedirectLoopHits, REDIRECT_LOOP_ABORT_THRESHOLD } from './ytdlp';

describe('ytdlp redirect loop detection', () => {
  it('counts redirect and JSON metadata lines from stdout and stderr combined', () => {
    const output = [
      '[reddit] Following redirect to https://www.reddit.com/gallery/abc123',
      '[reddit] Downloading JSON metadata',
      '[generic] Following redirect to https://www.reddit.com/r/test/comments/abc123/',
    ].join('\n');

    expect(countRedirectLoopHits(output)).toBe(3);
  });

  it('uses threshold low enough to abort before 120s timeout', () => {
    expect(REDIRECT_LOOP_ABORT_THRESHOLD).toBeLessThanOrEqual(10);
  });
});
