import { parseCli } from './parseCli';
import { executeCli } from './executeCli';
import { runLinkBatchDownloadJob } from '../workflows/linkBatchDownloadJob';
import { runSubredditTopWorkflow } from '../workflows/subredditTopWorkflow';
import { runSubredditQueue } from '../workflows/subredditQueueWorkflow';

import { runOrganize } from '../repair/runRepair';
import { executeRepairCommand } from '../repair/runRepair';
import { compileSavedRemaining } from '../batchMaintenance/compileSavedRemaining';
import { compilePartialRemaining } from '../batchMaintenance/compilePartialRemaining';
import { updateDeadSubredditRegistry } from '../batchMaintenance/deadSubredditRegistry';

jest.mock('../workflows/linkBatchDownloadJob');
jest.mock('../workflows/subredditTopWorkflow');
jest.mock('../workflows/subredditQueueWorkflow');
jest.mock('../batchMaintenance/compileSavedRemaining');
jest.mock('../batchMaintenance/compilePartialRemaining');
jest.mock('../batchMaintenance/deadSubredditRegistry');
jest.mock('../repair/runRepair', () => ({
  runOrganize: jest.fn(() => ({ totalFiles: 0, organizedFiles: 0, groupsCreated: 0 })),
  executeRepairCommand: jest.fn(async () => ({
    operation: 'fix-corrupt',
    summary: { fixed: 0, scanned: 0 },
  })),
  runFixCorrupt: jest.fn(),
  runRecoverHtml: jest.fn(),
}));

const mockedOrganize = runOrganize as jest.MockedFunction<typeof runOrganize>;
const mockedRepair = executeRepairCommand as jest.MockedFunction<typeof executeRepairCommand>;

const mockedDownloadJob = runLinkBatchDownloadJob as jest.MockedFunction<
  typeof runLinkBatchDownloadJob
>;
const mockedSubredditTop = runSubredditTopWorkflow as jest.MockedFunction<
  typeof runSubredditTopWorkflow
>;
const mockedQueue = runSubredditQueue as jest.MockedFunction<typeof runSubredditQueue>;
const mockedCompileSavedRemaining = compileSavedRemaining as jest.MockedFunction<
  typeof compileSavedRemaining
>;
const mockedCompilePartialRemaining = compilePartialRemaining as jest.MockedFunction<
  typeof compilePartialRemaining
>;
const mockedUpdateDeadSubredditRegistry = updateDeadSubredditRegistry as jest.MockedFunction<
  typeof updateDeadSubredditRegistry
>;

describe('parseCli', () => {
  it('returns root help when no subcommand is given', () => {
    const command = parseCli([]);
    expect(command).toEqual({ type: 'help', scope: 'root' });
  });

  it('returns download help for download --help', () => {
    const command = parseCli(['download', '--help']);
    expect(command).toEqual({ type: 'help', scope: 'download' });
  });

  it('parses download subcommand flags', () => {
    const command = parseCli([
      'download',
      '--input',
      'reddit-links/batch.csv',
      '--limit',
      '10',
      '--posts-only',
    ]);
    expect(command.type).toBe('download');
    if (command.type !== 'download') return;
    expect(command.options.inputDir).toBe('reddit-links/batch.csv');
    expect(command.options.limit).toBe(10);
    expect(command.options.postsOnly).toBe(true);
  });

  it('parses batch compile-saved-remaining with dry-run', () => {
    const command = parseCli(['batch', 'compile-saved-remaining', '--dry-run']);
    expect(command).toEqual({
      type: 'batch',
      operation: 'compile-saved-remaining',
      options: { dryRun: true },
    });
  });

  it('parses batch compile-partial-remaining', () => {
    const command = parseCli(['batch', 'compile-partial-remaining', '--dry-run']);
    expect(command).toEqual({
      type: 'batch',
      operation: 'compile-partial-remaining',
      options: { dryRun: true },
    });
  });

  it('parses batch analyze-dead with dry-run', () => {
    const command = parseCli(['batch', 'analyze-dead', '--dry-run']);
    expect(command).toEqual({
      type: 'batch',
      operation: 'analyze-dead',
      options: { dryRun: true },
    });
  });
});

describe('executeCli', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes download subcommand to runLinkBatchDownloadJob', async () => {
    const command = parseCli(['download', '--limit', '5', '--posts-only']);
    await executeCli(command);

    expect(mockedDownloadJob).toHaveBeenCalledTimes(1);
    expect(mockedDownloadJob).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, postsOnly: true }),
    );
  });

  it('routes subreddit-top subcommand to runSubredditTopWorkflow', async () => {
    const command = parseCli(['subreddit-top', '--subreddit', 'test', '--scrape-only']);
    await executeCli(command);

    expect(mockedSubredditTop).toHaveBeenCalledTimes(1);
    expect(mockedSubredditTop).toHaveBeenCalledWith(
      expect.objectContaining({ subreddit: 'test', scrapeOnly: true }),
    );
  });

  it('routes queue subcommand to runSubredditQueue', async () => {
    mockedQueue.mockResolvedValueOnce({
      total: 2,
      successful: 2,
      failed: 0,
      results: [],
    });

    const command = parseCli(['queue', '--subs', 'a,b', '--parallel', '2']);
    await executeCli(command);

    expect(mockedQueue).toHaveBeenCalledTimes(1);
    expect(mockedQueue).toHaveBeenCalledWith(
      expect.objectContaining({ subreddits: ['a', 'b'], parallel: 2 }),
    );
  });

  it('routes organize subcommand to runOrganize', async () => {
    const command = parseCli(['organize']);
    await executeCli(command);

    expect(mockedOrganize).toHaveBeenCalledTimes(1);
    expect(mockedOrganize).toHaveBeenCalledWith({ dryRun: false });
  });

  it('routes repair fix-corrupt to executeRepairCommand', async () => {
    const command = parseCli(['repair', 'fix-corrupt']);
    await executeCli(command);

    expect(mockedRepair).toHaveBeenCalledTimes(1);
    expect(mockedRepair).toHaveBeenCalledWith({ operation: 'fix-corrupt' });
  });

  it('parses repair organize-by-pattern dry-run', () => {
    expect(parseCli(['repair', 'organize-by-pattern', '--dry-run'])).toEqual({
      type: 'repair',
      operation: 'organize-by-pattern',
      dryRun: true,
    });
  });

  it('routes repair integrity-scan to executeRepairCommand', async () => {
    mockedRepair.mockResolvedValueOnce({
      operation: 'integrity-scan',
      summary: { scanned: 0, issues: [] },
    });

    const command = parseCli(['repair', 'integrity-scan']);
    await executeCli(command);

    expect(mockedRepair).toHaveBeenCalledWith({ operation: 'integrity-scan' });
  });

  it('parses repair transcode-gifs flags', () => {
    const command = parseCli([
      'repair',
      'transcode-gifs',
      '--dry-run',
      '--delete-original',
      '--source-dirs',
      'Gifs,Media',
    ]);
    expect(command).toEqual({
      type: 'repair',
      operation: 'transcode-gifs',
      transcodeOptions: {
        dryRun: true,
        deleteOriginal: true,
        sourceDirs: ['Gifs', 'Media'],
      },
    });
  });

  it('routes repair transcode-gifs to executeRepairCommand', async () => {
    mockedRepair.mockResolvedValueOnce({
      operation: 'transcode-gifs',
      summary: {
        scanned: 0,
        converted: 0,
        skipped: 0,
        failed: 0,
        dryRun: 0,
        results: [],
      },
    });

    const command = parseCli(['repair', 'transcode-gifs', '--dry-run']);
    await executeCli(command);

    expect(mockedRepair).toHaveBeenCalledTimes(1);
    expect(mockedRepair).toHaveBeenCalledWith({
      operation: 'transcode-gifs',
      transcodeOptions: { dryRun: true, deleteOriginal: false },
    });
  });

  it('routes batch compile-saved-remaining to compileSavedRemaining', async () => {
    mockedCompileSavedRemaining.mockReturnValueOnce({
      posts: {
        total: 10,
        remaining: 3,
        excludedFailed: 1,
        excludedDeadSub: 2,
        rows: [],
      },
      comments: {
        total: 5,
        remaining: 1,
        excludedFailed: 0,
        excludedDeadSub: 0,
        rows: [],
      },
      postsOutput: 'reddit-links/saved-posts-remaining.csv',
      commentsOutput: 'reddit-links/saved-comments-remaining.csv',
      dryRun: false,
    });

    const command = parseCli(['batch', 'compile-saved-remaining']);
    await executeCli(command);

    expect(mockedCompileSavedRemaining).toHaveBeenCalledTimes(1);
    expect(mockedCompileSavedRemaining).toHaveBeenCalledWith(
      expect.objectContaining({
        linksDir: 'reddit-links',
        dryRun: false,
      }),
    );
  });

  it('routes batch compile-partial-remaining to compilePartialRemaining', async () => {
    mockedCompilePartialRemaining.mockReturnValueOnce({
      total: 40,
      remaining: 12,
      rows: [],
      bySubreddit: {
        KoreanActressFAP: { scraped: 10, remaining: 3 },
        WatchItForThePlot: { scraped: 30, remaining: 9 },
      },
      outputPath: 'reddit-links/subreddit-scraped/partial-remaining.csv',
      dryRun: false,
    });

    const command = parseCli(['batch', 'compile-partial-remaining']);
    await executeCli(command);

    expect(mockedCompilePartialRemaining).toHaveBeenCalledTimes(1);
    expect(mockedCompilePartialRemaining).toHaveBeenCalledWith(
      expect.objectContaining({
        scrapedDir: 'reddit-links/subreddit-scraped',
        dryRun: false,
      }),
    );
  });

  it('routes batch analyze-dead to updateDeadSubredditRegistry', async () => {
    mockedUpdateDeadSubredditRegistry.mockReturnValueOnce({
      dryRun: true,
      candidates: ['deadsub'],
      added: ['deadsub'],
      total: 64,
      registryPath: 'extracted_files/dead-subreddits.json',
    });

    const command = parseCli(['batch', 'analyze-dead', '--dry-run']);
    await executeCli(command);

    expect(mockedUpdateDeadSubredditRegistry).toHaveBeenCalledTimes(1);
    expect(mockedUpdateDeadSubredditRegistry).toHaveBeenCalledWith(
      expect.objectContaining({
        registryPath: 'extracted_files/dead-subreddits.json',
        logDir: 'extracted_files',
        dryRun: true,
      }),
    );
  });
});
