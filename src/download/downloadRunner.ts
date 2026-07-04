import type {
  BatchSummary,
  DownloadRunnerOptions,
  DownloadStrategy,
  LinkBatchItem,
} from './types';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runBatch(
  links: LinkBatchItem[],
  options: DownloadRunnerOptions,
  strategy: DownloadStrategy,
): Promise<BatchSummary> {
  let successful = 0;
  let failed = 0;
  const failedUrls: string[] = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    console.log(`\n[${i + 1}/${links.length}]`);

    const result = await strategy.downloadUrl(link.url, link.type);

    if (result.success) {
      successful++;
    } else {
      failed++;
      failedUrls.push(link.url);
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

  return { total: links.length, successful, failed, failedUrls };
}
