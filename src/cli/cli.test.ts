import { parseCli } from './parseCli';
import { executeCli } from './executeCli';
import { runLinkBatchDownloadJob } from '../workflows/linkBatchDownloadJob';
import { runSubredditTopWorkflow } from '../workflows/subredditTopWorkflow';
import { runSubredditQueue } from '../workflows/subredditQueueWorkflow';

import { runOrganize } from '../repair/runRepair';
import { executeRepairCommand } from '../repair/runRepair';

jest.mock('../workflows/linkBatchDownloadJob');
jest.mock('../workflows/subredditTopWorkflow');
jest.mock('../workflows/subredditQueueWorkflow');
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
});
