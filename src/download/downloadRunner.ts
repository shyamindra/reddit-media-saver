import type {
  BatchSummary,
  DownloadItemResult,
  DownloadRunnerOptions,
  DownloadStrategy,
  LinkBatchItem,
} from './types';
import { shouldSkipDeadSubredditUrl } from '../utils/deadSubreddits';
import type { YtdlpFailureKind } from '../utils/ytdlpFailure';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runBatch(
  links: LinkBatchItem[],
  options: DownloadRunnerOptions,
  strategy: DownloadStrategy,
  skippedUrls: Set<string> = new Set(),
): Promise<BatchSummary> {
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const failedUrls: string[] = [];
  const failedDetails: Array<{ url: string; failureKind: YtdlpFailureKind }> = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    console.log(`\n[${i + 1}/${links.length}]`);

    if (skippedUrls.has(link.url)) {
      skipped++;
      console.log(`   ⏭️  Skipping permanently failed URL (non-retryable)`);
      console.log(`   🔗 ${link.url}`);
      continue;
    }

    if (shouldSkipDeadSubredditUrl(link.url)) {
      skipped++;
      console.log(`   ⏭️  Skipping dead subreddit URL`);
      console.log(`   🔗 ${link.url}`);
      continue;
    }

    const result = await strategy.downloadUrl(link.url, link.type);

    if (result.success) {
      successful++;
    } else {
      failed++;
      failedUrls.push(link.url);
      failedDetails.push({
        url: link.url,
        failureKind: result.failureKind ?? 'unknown',
      });
    }

    if (i < links.length - 1 && options.delayMs > 0) {
      await sleep(options.delayMs);
    }

    const processed = i + 1;
    if (
      options.batchPauseEvery > 0 &&
      options.batchPauseMs > 0 &&
      processed < links.length &&
      processed % options.batchPauseEvery === 0
    ) {
      console.log(
        `\n⏸️  Processed ${processed} URLs. Pausing ${options.batchPauseMs / 1000}s to avoid rate limits...\n`,
      );
      await sleep(options.batchPauseMs);
    }
  }

  return { total: links.length, successful, failed, failedUrls, failedDetails, skipped };
}
