import { loadAppConfig } from '../config/appConfig';
import { runLinkBatchDownloadJob } from '../workflows/linkBatchDownloadJob';
import { runSubredditQueue } from '../workflows/subredditQueueWorkflow';
import { runSubredditTopWorkflow } from '../workflows/subredditTopWorkflow';
import { chunk, waitForProcess } from '../utils/processUtils';
import { FfmpegNotFoundError } from '../adapters/ffmpegAdapter';
import type { TranscodeDirectoryResult } from '../services/mediaTranscodeService';
import { executeRepairCommand, runOrganize } from '../repair/runRepair';
import { compileSavedRemaining } from '../batchMaintenance/compileSavedRemaining';
import { compilePartialRemaining } from '../batchMaintenance/compilePartialRemaining';
import { updateDeadSubredditRegistry } from '../batchMaintenance/deadSubredditRegistry';
import { DEAD_SUBREDDITS, resetDeadSubredditRegistryCache } from '../utils/deadSubreddits';
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
        const repairCommand =
          command.operation === 'transcode-gifs'
            ? { operation: command.operation, transcodeOptions: command.transcodeOptions }
            : command.operation === 'organize-by-pattern'
              ? { operation: command.operation, dryRun: command.dryRun }
              : { operation: command.operation };

        const result = await executeRepairCommand(repairCommand);

        if (command.operation === 'transcode-gifs') {
          printTranscodeSummary(result.summary as TranscodeDirectoryResult);
          if ((result.summary as TranscodeDirectoryResult).failed > 0) {
            process.exitCode = 1;
          }
          return;
        }

        if (command.operation === 'organize-by-pattern') {
          const summary = result.summary as import('../repair/organizeByPattern').OrganizeByPatternSummary;
          console.log('\n📊 Organize-by-pattern Summary');
          console.log(`   Total files:    ${summary.totalFiles}`);
          console.log(`   Organized:      ${summary.organizedFiles}`);
          console.log(`   Groups created: ${summary.groupsCreated}`);
          return;
        }

        if (command.operation === 'integrity-scan') {
          const summary = result.summary as import('../repair/integrityScan').IntegrityScanSummary;
          console.log('\n📊 Integrity Scan Summary');
          console.log(`   Scanned: ${summary.scanned}`);
          console.log(`   Issues:  ${summary.issues.length}`);
          for (const issue of summary.issues) {
            console.log(`   - ${issue.fileName}: ${issue.issue}${issue.detail ? ` (${issue.detail})` : ''}`);
          }
          if (summary.issues.length > 0) {
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
    case 'batch': {
      await executeBatch(command.operation, command.options);
      return;
    }
  }
}

async function executeBatch(
  operation: 'compile-saved-remaining' | 'compile-partial-remaining' | 'analyze-dead',
  options: import('./types').BatchCliOptions,
): Promise<void> {
  const config = loadAppConfig();

  if (operation === 'compile-saved-remaining') {
    await executeCompileSavedRemaining(config, options);
    return;
  }

  if (operation === 'compile-partial-remaining') {
    await executeCompilePartialRemaining(config, options);
    return;
  }

  await executeAnalyzeDead(config, options);
}

async function executeCompileSavedRemaining(
  config: ReturnType<typeof loadAppConfig>,
  options: import('./types').BatchCliOptions,
): Promise<void> {
  const linksDir = config.paths.redditLinksDir;
  const postsOutput = `${linksDir}/saved-posts-remaining.csv`;
  const commentsOutput = `${linksDir}/saved-comments-remaining.csv`;

  const result = compileSavedRemaining({
    linksDir,
    logDir: config.paths.extractedFilesDir,
    failedDownloadsFile: config.paths.failedDownloadsFile,
    postsOutput,
    commentsOutput,
    dryRun: options.dryRun,
  });

  console.log('📋 Compiling remaining saved Reddit exports\n');
  console.log(`   Saved posts:    ${result.posts.total} total → ${result.posts.remaining} remaining`);
  console.log(
    `                 (excluded ${result.posts.excludedFailed} failed, ${result.posts.excludedDeadSub} dead subs)`,
  );
  console.log(
    `   Saved comments: ${result.comments.total} total → ${result.comments.remaining} remaining`,
  );
  console.log(
    `                 (excluded ${result.comments.excludedFailed} failed, ${result.comments.excludedDeadSub} dead subs)`,
  );

  if (options.dryRun) {
    console.log('\n🔍 Dry run — no CSV files written');
    return;
  }

  console.log(`\n✅ Wrote ${result.posts.remaining} URLs → ${result.postsOutput}`);
  console.log(`✅ Wrote ${result.comments.remaining} URLs → ${result.commentsOutput}`);
}

async function executeCompilePartialRemaining(
  config: ReturnType<typeof loadAppConfig>,
  options: import('./types').BatchCliOptions,
): Promise<void> {
  const scrapedDir = `${config.paths.redditLinksDir}/subreddit-scraped`;
  const outputPath = `${scrapedDir}/partial-remaining.csv`;

  const result = compilePartialRemaining({
    scrapedDir,
    logDir: config.paths.extractedFilesDir,
    outputPath,
    dryRun: options.dryRun,
  });

  console.log('📋 Compiling remaining URLs from partially completed subs\n');

  for (const [subreddit, summary] of Object.entries(result.bySubreddit)) {
    console.log(`   r/${subreddit}: ${summary.scraped} scraped, ${summary.remaining} remaining`);
  }

  if (options.dryRun) {
    console.log('\n🔍 Dry run — no CSV file written');
    return;
  }

  console.log(`\n✅ Wrote ${result.remaining} URLs → ${result.outputPath}`);
}

async function executeAnalyzeDead(
  config: ReturnType<typeof loadAppConfig>,
  options: import('./types').BatchCliOptions,
): Promise<void> {
  const result = updateDeadSubredditRegistry({
    registryPath: config.paths.deadSubredditsFile,
    logDir: config.paths.extractedFilesDir,
    dryRun: options.dryRun,
    fallbackSubreddits: DEAD_SUBREDDITS,
  });

  console.log('📊 Dead subreddit analysis (404/private, 2+ fails, 0 successes)\n');

  for (const subreddit of result.candidates) {
    const marker = result.added.includes(subreddit) ? '+' : '✓';
    console.log(`   [${marker}] r/${subreddit}`);
  }

  if (result.added.length > 0) {
    console.log(`\n   New candidates: ${result.added.join(', ')}`);
  }

  if (options.dryRun) {
    console.log('\n🔍 Dry run — registry file not updated');
    console.log(`   Would write ${result.total} subs → ${result.registryPath}`);
    return;
  }

  console.log(`\n✅ Registry updated (${result.total} subs) → ${result.registryPath}`);
  resetDeadSubredditRegistryCache();
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
