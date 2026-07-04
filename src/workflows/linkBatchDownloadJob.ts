import { appendFileSync, existsSync, writeFileSync } from 'fs';
import { loadAppConfig } from '../config/appConfig';
import { executeLinkBatch } from '../download/executeLinkBatch';
import type { LinkBatchItem } from '../download/types';
import { FileInputService } from '../services/fileInputService';
import { sleep } from '../utils/processUtils';

export interface LinkBatchDownloadJobOptions {
  inputDir: string;
  limit?: number;
  offset?: number;
  delayMs: number;
  batchPauseEvery: number;
  batchPauseMs: number;
  cooldownBetweenBatchesMs: number;
  chainBatches: number;
  perUrlTimeoutMs: number;
  browser: string;
  archiveFile: string;
  postsOnly: boolean;
}

function dedupeUrls<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function appendFailedDownloads(filePath: string, urls: string[]): void {
  if (urls.length === 0) return;
  const payload = urls.join('\n') + '\n';
  if (existsSync(filePath)) {
    appendFileSync(filePath, payload, 'utf8');
  } else {
    writeFileSync(filePath, payload, 'utf8');
  }
}

function toLinkBatch(
  items: ReturnType<typeof FileInputService.processRedditUrlsFromCsv>['valid'],
): LinkBatchItem[] {
  return items.map((item) => ({ url: item.url, type: item.type }));
}

export async function runLinkBatchDownloadJob(options: LinkBatchDownloadJobOptions): Promise<void> {
  const { valid } = FileInputService.processRedditUrlsFromCsv(options.inputDir);
  const allUnique = dedupeUrls(valid);

  let urls = allUnique.sort((a, b) => {
    const order = { post: 0, media: 1, comment: 2, invalid: 3 };
    return order[a.type] - order[b.type];
  });

  if (options.postsOnly) {
    urls = urls.filter((u) => u.type === 'post' || u.type === 'media');
  }

  const linkBatch = toLinkBatch(urls);
  const totalAvailable = linkBatch.length;
  const batchSize = options.limit ?? 50;
  const startOffset = options.offset ?? 0;
  const batchesToRun = options.chainBatches;

  let totalSuccessful = 0;
  let totalFailed = 0;
  let totalProcessed = 0;
  const allFailedUrls: string[] = [];

  const runnerOptions = {
    browser: options.browser,
    archiveFile: options.archiveFile,
    delayMs: options.delayMs,
    batchPauseEvery: options.batchPauseEvery,
    batchPauseMs: options.batchPauseMs,
    perUrlTimeoutMs: options.perUrlTimeoutMs,
  };

  for (let batchIndex = 0; batchIndex < batchesToRun; batchIndex++) {
    const batchOffset = startOffset + batchIndex * batchSize;
    if (batchOffset >= totalAvailable) {
      console.log(`\n✅ All URLs processed (reached end at offset ${batchOffset}).`);
      break;
    }

    if (batchIndex > 0) {
      console.log(
        `\n🧊 Cooling down ${options.cooldownBetweenBatchesMs / 1000}s before next batch...\n`,
      );
      await sleep(options.cooldownBetweenBatchesMs);
    }

    const batchLinks = linkBatch.slice(batchOffset, batchOffset + batchSize);
    const summary = await executeLinkBatch(
      batchLinks,
      runnerOptions,
      `Batch ${batchIndex + 1} (offset ${batchOffset}, ${batchLinks.length} URLs)`,
    );

    totalSuccessful += summary.successful;
    totalFailed += summary.failed;
    totalProcessed += summary.total;
    allFailedUrls.push(...summary.failedUrls);
  }

  if (batchesToRun > 1) {
    console.log('\n📊 Chain Summary');
    console.log(`   Total processed: ${totalProcessed}`);
    console.log(`   Successful: ${totalSuccessful}`);
    console.log(`   Failed:     ${totalFailed}`);
  }

  if (allFailedUrls.length > 0) {
    const failedFile = loadAppConfig().paths.failedDownloadsFile;
    appendFailedDownloads(failedFile, allFailedUrls);
    console.log(`\n📝 Failed URLs appended to: ${failedFile}`);
  }

  const nextOffset = startOffset + totalProcessed;
  if (nextOffset < totalAvailable) {
    const postsOnlyFlag = options.postsOnly ? ' --posts-only' : '';
    console.log(
      `\n🔄 Next batch: npm run download-firefox --${postsOnlyFlag} --offset ${nextOffset} --limit ${batchSize}`,
    );
    console.log(`   (${totalAvailable - nextOffset} URLs remaining of ${totalAvailable})`);
  }
}
