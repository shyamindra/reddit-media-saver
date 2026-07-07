import { runBatch } from './downloadRunner';
import type { DownloadItemResult, DownloadStrategy, LinkBatchItem } from './types';

function createMockStrategy(
  outcomes: Record<string, Partial<DownloadItemResult>>,
): DownloadStrategy {
  return {
    async downloadUrl(url) {
      const outcome = outcomes[url] ?? { success: false, error: 'not mocked' };
      return {
        url,
        success: outcome.success ?? false,
        filePath: outcome.filePath,
        error: outcome.error,
      };
    },
  };
}

describe('downloadRunner', () => {
  const links: LinkBatchItem[] = [
    { url: 'https://reddit.com/a', type: 'post' },
    { url: 'https://reddit.com/b', type: 'post' },
    { url: 'https://reddit.com/c', type: 'comment' },
  ];

  const baseOptions = {
    browser: 'firefox',
    archiveFile: 'extracted_files/downloaded-archive.txt',
    delayMs: 0,
    batchPauseEvery: 0,
    batchPauseMs: 0,
    perUrlTimeoutMs: 120_000,
  };

  it('returns batch summary with successful and failed counts', async () => {
    const strategy = createMockStrategy({
      'https://reddit.com/a': { success: true, filePath: 'downloads/Videos/a.mp4' },
      'https://reddit.com/b': { success: false, error: 'loop' },
      'https://reddit.com/c': { success: true, filePath: 'downloads/Notes/c.txt' },
    });

    const summary = await runBatch(links, baseOptions, strategy);

    expect(summary).toEqual({
      total: 3,
      successful: 2,
      failed: 1,
      failedUrls: ['https://reddit.com/b'],
      failedDetails: [{ url: 'https://reddit.com/b', failureKind: 'unknown' }],
      skipped: 0,
    });
  });

  it('returns empty summary for empty link batch', async () => {
    const strategy = createMockStrategy({});

    const summary = await runBatch([], baseOptions, strategy);

    expect(summary).toEqual({
      total: 0,
      successful: 0,
      failed: 0,
      failedUrls: [],
      failedDetails: [],
      skipped: 0,
    });
  });

  it('skips URLs from dead subreddits', async () => {
    const strategy = createMockStrategy({
      'https://reddit.com/a': { success: true, filePath: 'downloads/Videos/a.mp4' },
    });

    const summary = await runBatch(
      [
        {
          url: 'https://www.reddit.com/r/HotWebScene/comments/abc123/title/',
          type: 'post',
        },
        { url: 'https://reddit.com/a', type: 'post' },
      ],
      baseOptions,
      strategy,
    );

    expect(summary.skipped).toBe(1);
    expect(summary.successful).toBe(1);
    expect(summary.failed).toBe(0);
  });

  it('skips permanently failed URLs when provided', async () => {
    const strategy = createMockStrategy({
      'https://reddit.com/a': { success: true, filePath: 'downloads/Videos/a.mp4' },
    });

    const summary = await runBatch(
      [{ url: 'https://reddit.com/dead', type: 'post' }, { url: 'https://reddit.com/a', type: 'post' }],
      baseOptions,
      strategy,
      new Set(['https://reddit.com/dead']),
    );

    expect(summary.skipped).toBe(1);
    expect(summary.successful).toBe(1);
    expect(summary.failed).toBe(0);
  });
});
