import { runSubredditTopWorkflow } from './subredditTopWorkflow';
import { executeLinkBatch } from '../download/executeLinkBatch';
import { fetchListing } from '../services/redditFetchService';
import { cleanupBrowserSession } from '../services/browserSessionService';

jest.mock('../download/executeLinkBatch');
jest.mock('../services/redditFetchService');
jest.mock('../services/browserSessionService', () => ({
  cleanupBrowserSession: jest.fn(),
}));

const mockedExecuteLinkBatch = executeLinkBatch as jest.MockedFunction<typeof executeLinkBatch>;
const mockedFetchListing = fetchListing as jest.MockedFunction<typeof fetchListing>;

describe('subredditTopWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scrape-only writes CSV and skips download', async () => {
    mockedFetchListing.mockResolvedValueOnce([
      {
        url: 'https://www.reddit.com/r/test/comments/abc/slug/',
        title: 'Test post',
        id: 'abc',
        subreddit: 'test',
        permalink: '/r/test/comments/abc/slug/',
        isVideo: false,
      },
    ]);

    const result = await runSubredditTopWorkflow({
      subreddit: 'test',
      sort: 'top',
      time: 'all',
      limit: 1,
      method: 'json',
      scrapeOnly: true,
      outputCsv: 'reddit-links/subreddit-scraped/top-test.csv',
      delayMs: 0,
      batchPauseEvery: 0,
      batchPauseMs: 0,
      perUrlTimeoutMs: 120_000,
      browser: 'firefox',
      archiveFile: 'extracted_files/downloaded-archive.txt',
      site: 'old',
      useFirefoxProfile: false,
      headless: false,
    });

    expect(result.posts).toHaveLength(1);
    expect(result.downloadSummary).toBeUndefined();
    expect(mockedExecuteLinkBatch).not.toHaveBeenCalled();
    expect(cleanupBrowserSession).toHaveBeenCalled();
  });

  it('downloads scraped posts in-process via executeLinkBatch', async () => {
    mockedFetchListing.mockResolvedValueOnce([
      {
        url: 'https://www.reddit.com/r/test/comments/abc/slug/',
        title: 'Test post',
        id: 'abc',
        subreddit: 'test',
        permalink: '/r/test/comments/abc/slug/',
        isVideo: false,
      },
    ]);
    mockedExecuteLinkBatch.mockResolvedValueOnce({
      total: 1,
      successful: 1,
      failed: 0,
      failedUrls: [],
      failedDetails: [],
      skipped: 0,
    });

    const result = await runSubredditTopWorkflow({
      subreddit: 'test',
      sort: 'top',
      time: 'all',
      limit: 1,
      method: 'json',
      scrapeOnly: false,
      outputCsv: 'reddit-links/subreddit-scraped/top-test.csv',
      delayMs: 1000,
      batchPauseEvery: 15,
      batchPauseMs: 180_000,
      perUrlTimeoutMs: 120_000,
      browser: 'firefox',
      archiveFile: 'extracted_files/downloaded-archive.txt',
      site: 'old',
      useFirefoxProfile: false,
      headless: false,
    });

    expect(result.downloadSummary?.successful).toBe(1);
    expect(mockedExecuteLinkBatch).toHaveBeenCalledWith(
      [{ url: 'https://www.reddit.com/r/test/comments/abc/slug/', type: 'post' }],
      expect.objectContaining({
        browser: 'firefox',
        delayMs: 1000,
        batchPauseEvery: 15,
        batchPauseMs: 180_000,
      }),
      expect.stringContaining('r/test'),
    );
  });
});
