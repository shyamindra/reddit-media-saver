import { runSubredditQueue } from './subredditQueueWorkflow';
import { runSubredditTopWorkflow } from './subredditTopWorkflow';

jest.mock('./subredditTopWorkflow');

const mockedRunSubredditTop = runSubredditTopWorkflow as jest.MockedFunction<
  typeof runSubredditTopWorkflow
>;

describe('subredditQueueWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs subreddits in parallel waves without spawning npm', async () => {
    mockedRunSubredditTop.mockResolvedValue({
      posts: [],
      outputCsv: 'reddit-links/subreddit-scraped/top-a.csv',
    });

    const summary = await runSubredditQueue({
      subreddits: ['a', 'b', 'c'],
      parallel: 2,
      cooldownMs: 0,
      staggerMs: 0,
      limit: 10,
      sort: 'top',
      time: 'all',
      delayMs: 0,
      batchPauseEvery: 15,
      batchPauseMs: 0,
      perUrlTimeoutMs: 120_000,
      browser: 'firefox',
      archiveFile: 'extracted_files/downloaded-archive.txt',
      scrapeOnly: true,
    });

    expect(mockedRunSubredditTop).toHaveBeenCalledTimes(3);
    expect(summary.total).toBe(3);
    expect(summary.successful).toBe(3);
    expect(summary.failed).toBe(0);
  });

  it('counts failed subreddit runs', async () => {
    mockedRunSubredditTop
      .mockResolvedValueOnce({ posts: [], outputCsv: 'a.csv' })
      .mockRejectedValueOnce(new Error('boom'));

    const summary = await runSubredditQueue({
      subreddits: ['ok', 'bad'],
      parallel: 2,
      cooldownMs: 0,
      staggerMs: 0,
      limit: 5,
      sort: 'top',
      time: 'all',
      delayMs: 0,
      batchPauseEvery: 15,
      batchPauseMs: 0,
      perUrlTimeoutMs: 120_000,
      browser: 'firefox',
      archiveFile: 'extracted_files/downloaded-archive.txt',
      scrapeOnly: true,
    });

    expect(summary.successful).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.results.find((r) => r.subreddit === 'bad')?.success).toBe(false);
  });
});
