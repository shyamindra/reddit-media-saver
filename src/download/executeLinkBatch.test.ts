import { executeLinkBatch } from './executeLinkBatch';
import { runBatch } from './downloadRunner';
import { loadSkippedFailureUrls } from './failureRegistry';

jest.mock('./downloadRunner');
jest.mock('./failureRegistry');
jest.mock('../adapters/ytdlpCookiesStrategy', () => ({
  createYtdlpCookiesStrategy: jest.fn(() => ({ downloadUrl: jest.fn() })),
}));

const mockedRunBatch = runBatch as jest.MockedFunction<typeof runBatch>;
const mockedLoadSkipped = loadSkippedFailureUrls as jest.MockedFunction<
  typeof loadSkippedFailureUrls
>;

describe('executeLinkBatch', () => {
  const baseOptions = {
    browser: 'firefox',
    archiveFile: 'extracted_files/downloaded-archive.txt',
    delayMs: 0,
    batchPauseEvery: 0,
    batchPauseMs: 0,
    perUrlTimeoutMs: 120_000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadSkipped.mockReturnValue(new Set());
  });

  it('returns empty summary when link batch is empty', async () => {
    const summary = await executeLinkBatch([], baseOptions);

    expect(summary).toEqual({
      total: 0,
      successful: 0,
      failed: 0,
      failedUrls: [],
      failedDetails: [],
      skipped: 0,
    });
    expect(mockedRunBatch).not.toHaveBeenCalled();
  });

  it('delegates to runBatch with ytdlp-cookies strategy and skipped failure URLs', async () => {
    const skipped = new Set(['https://www.reddit.com/r/foo/comments/skipped/']);
    mockedLoadSkipped.mockReturnValue(skipped);
    mockedRunBatch.mockResolvedValueOnce({
      total: 2,
      successful: 1,
      failed: 1,
      failedUrls: ['https://www.reddit.com/r/foo/comments/fail/'],
      failedDetails: [
        { url: 'https://www.reddit.com/r/foo/comments/fail/', failureKind: 'unknown' },
      ],
      skipped: 0,
    });

    const links = [
      { url: 'https://www.reddit.com/r/foo/comments/ok/', type: 'post' as const },
      { url: 'https://www.reddit.com/r/foo/comments/fail/', type: 'post' as const },
    ];

    const summary = await executeLinkBatch(links, baseOptions, 'Test batch');

    expect(mockedRunBatch).toHaveBeenCalledWith(
      links,
      baseOptions,
      expect.objectContaining({ downloadUrl: expect.any(Function) }),
      skipped,
    );
    expect(summary.successful).toBe(1);
    expect(summary.failed).toBe(1);
  });
});
