import { loadAppConfig } from '../config/appConfig';
import { runLinkBatchDownloadJob } from '../workflows/linkBatchDownloadJob';
import { runSubredditQueue } from '../workflows/subredditQueueWorkflow';
import { runSubredditTopWorkflow } from '../workflows/subredditTopWorkflow';
import { chunk, waitForProcess } from '../utils/processUtils';
import { FfmpegNotFoundError } from '../adapters/ffmpegAdapter';
import type { TranscodeDirectoryResult } from '../services/mediaTranscodeService';
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
      try {
        const result = await executeRepairCommand(
          command.operation === 'transcode-gifs'
            ? { operation: command.operation, transcodeOptions: command.transcodeOptions }
            : { operation: command.operation },
        );

        if (command.operation === 'transcode-gifs') {
          printTranscodeSummary(result.summary as TranscodeDirectoryResult);
          if ((result.summary as TranscodeDirectoryResult).failed > 0) {
            process.exitCode = 1;
          }
          return;
        }

        console.log('\n📊 Repair Summary');
        console.log(`   Operation: ${result.operation}`);
        console.log(`   Result:    ${JSON.stringify(result.summary)}`);
      } catch (error) {
        if (error instanceof FfmpegNotFoundError) {
          console.error(`❌ ${error.message}`);
          process.exitCode = 1;
          return;
        }
        throw error;
      }
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

function printTranscodeSummary(summary: TranscodeDirectoryResult): void {
  for (const result of summary.results) {
    const label =
      result.status === 'failed'
        ? `FAILED (${result.error})`
        : result.status.toUpperCase();
    console.log(`${label.padEnd(10)} ${result.inputPath} -> ${result.outputPath}`);
  }

  console.log('\n📊 Transcode Summary');
  console.log(`   Scanned:   ${summary.scanned}`);
  console.log(`   Converted: ${summary.converted}`);
  console.log(`   Dry-run:   ${summary.dryRun}`);
  console.log(`   Skipped:   ${summary.skipped}`);
  console.log(`   Failed:    ${summary.failed}`);
}
