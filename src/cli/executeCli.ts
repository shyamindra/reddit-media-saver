import { loadAppConfig } from '../config/appConfig';
import { runLinkBatchDownloadJob } from '../workflows/linkBatchDownloadJob';
import { runSubredditQueue } from '../workflows/subredditQueueWorkflow';
import { runSubredditTopWorkflow } from '../workflows/subredditTopWorkflow';
import { chunk, waitForProcess } from '../utils/processUtils';
import { executeRepairCommand, runOrganize } from '../repair/runRepair';
import { getHelpText, printHelp } from './help';
import type { CliCommand } from './types';

export async function executeCli(command: CliCommand): Promise<void> {
  switch (command.type) {
    case 'help':
      printHelp(command.scope);
      return;
    case 'unknown':
      console.error(command.message);
      return;
    case 'download':
      await runLinkBatchDownloadJob(command.options);
      return;
    case 'subreddit-top':
      await runSubredditTopWorkflow(command.options);
      return;
    case 'queue':
      await executeQueue(command.options);
      return;
    case 'organize': {
      const summary = runOrganize({ dryRun: command.options.dryRun });
      console.log('\n📊 Organize Summary');
      console.log(`   Total files:    ${summary.totalFiles}`);
      console.log(`   Organized:      ${summary.organizedFiles}`);
      console.log(`   Groups created: ${summary.groupsCreated}`);
      return;
    }
    case 'repair': {
      const result = await executeRepairCommand({ operation: command.operation });
      console.log('\n📊 Repair Summary');
      console.log(`   Operation: ${result.operation}`);
      console.log(`   Result:    ${JSON.stringify(result.summary)}`);
      return;
    }
  }
}

async function executeQueue(options: import('./types').QueueCliOptions): Promise<void> {
  const config = loadAppConfig();
  const waves = chunk(options.subreddits, options.parallel);

  if (options.dryRun) {
    waves.forEach((wave, index) => {
      console.log(`Wave ${index + 1}: ${wave.map((s) => `r/${s}`).join(', ')}`);
      if (index < waves.length - 1) {
        console.log(`   then wait ${options.cooldownMs / 60_000} min`);
      }
    });
    return;
  }

  for (const pid of options.waitPids) {
    await waitForProcess(pid, options.waitPollMs);
  }

  const summary = await runSubredditQueue({
    subreddits: options.subreddits,
    parallel: options.parallel,
    cooldownMs: options.cooldownMs,
    staggerMs: options.staggerMs,
    limit: options.limit,
    sort: options.sort,
    time: options.time,
    delayMs: options.delayMs,
    batchPauseEvery: config.batch.batchPauseEvery,
    batchPauseMs: options.batchPauseMs > 0 ? options.batchPauseMs : config.batch.batchPauseMs,
    perUrlTimeoutMs: config.batch.perUrlTimeoutMs,
    browser: 'firefox',
    archiveFile: config.paths.downloadArchiveFile,
    scrapeOnly: false,
  });

  console.log('\n📊 Queue Summary');
  console.log(`   Total:      ${summary.total}`);
  console.log(`   Successful: ${summary.successful}`);
  console.log(`   Failed:     ${summary.failed}`);
}

export { getHelpText };
