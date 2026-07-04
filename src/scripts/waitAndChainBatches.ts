import { loadAppConfig } from '../config/appConfig';
import { sleep, waitForProcess } from '../utils/processUtils';
import { runLinkBatchDownloadJob } from '../workflows/linkBatchDownloadJob';

async function main(): Promise<void> {
  const config = loadAppConfig();
  const args = process.argv.slice(2);
  let waitPid = 0;
  let startOffset = 100;
  let batchSize = 50;
  let cooldownMs = config.batch.cooldownBetweenBatchesMs;
  let totalPosts = 1033;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--wait-pid':
        waitPid = parseInt(args[++i], 10);
        break;
      case '--offset':
        startOffset = parseInt(args[++i], 10);
        break;
      case '--limit':
        batchSize = parseInt(args[++i], 10);
        break;
      case '--cooldown':
        cooldownMs = parseInt(args[++i], 10);
        break;
      case '--total-posts':
        totalPosts = parseInt(args[++i], 10);
        break;
      case '--help':
        console.log(`
Wait for a running batch to finish, cool down, then chain remaining batches in-process.

Usage:
  npx tsx src/scripts/waitAndChainBatches.ts --wait-pid <pid> [options]

Options:
  --wait-pid <pid>      PID of the running batch process to wait for
  --offset <n>          Start offset for chained batches (default: 100)
  --limit <n>           Batch size (default: 50)
  --cooldown <ms>       Cooldown before starting chain (default: 600000 = 10 min)
  --total-posts <n>     Total post count for calculating remaining batches (default: 1033)
`);
        process.exit(0);
    }
  }

  if (!waitPid) {
    console.error('❌ --wait-pid is required');
    process.exit(1);
  }

  const remainingPosts = totalPosts - startOffset;
  const chainCount = Math.ceil(remainingPosts / batchSize);

  console.log('🔗 Batch Chain Orchestrator\n');
  console.log(`   Waiting for PID: ${waitPid}`);
  console.log(`   Start offset:    ${startOffset}`);
  console.log(`   Batch size:      ${batchSize}`);
  console.log(`   Cooldown:        ${cooldownMs / 1000}s`);
  console.log(`   Chained batches: ${chainCount} (${remainingPosts} posts remaining)\n`);

  await waitForProcess(waitPid, 30_000, () => {
    console.log(`   Still running... (${new Date().toLocaleTimeString()})`);
  });

  console.log(`\n🧊 Cooling down ${cooldownMs / 1000}s before starting chained batches...\n`);
  await sleep(cooldownMs);

  console.log(`🚀 Starting in-process chain: offset ${startOffset}, ${chainCount} batches\n`);

  await runLinkBatchDownloadJob({
    inputDir: config.paths.redditLinksDir,
    offset: startOffset,
    limit: batchSize,
    chainBatches: chainCount,
    cooldownBetweenBatchesMs: cooldownMs,
    delayMs: config.batch.delayBetweenUrlsMs,
    batchPauseEvery: config.batch.batchPauseEvery,
    batchPauseMs: config.batch.batchPauseMs,
    perUrlTimeoutMs: config.batch.perUrlTimeoutMs,
    browser: 'firefox',
    archiveFile: config.paths.downloadArchiveFile,
    postsOnly: true,
  });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
