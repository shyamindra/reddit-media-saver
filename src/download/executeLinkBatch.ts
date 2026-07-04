import { createAxiosJsonStrategy } from '../adapters/axiosJsonStrategy';
import { createYtdlpCookiesStrategy } from '../adapters/ytdlpCookiesStrategy';
import { runBatch } from '../download/downloadRunner';
import type { BatchSummary, DownloadRunnerOptions, LinkBatchItem } from '../download/types';

export interface ExecuteLinkBatchOptions extends DownloadRunnerOptions {
  browser: string;
  archiveFile: string;
  perUrlTimeoutMs: number;
}

export async function executeLinkBatch(
  links: LinkBatchItem[],
  options: ExecuteLinkBatchOptions,
  batchLabel = 'Link batch',
): Promise<BatchSummary> {
  if (links.length === 0) {
    console.log('❌ No URLs to process.');
    return { total: 0, successful: 0, failed: 0, failedUrls: [] };
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${batchLabel}: ${links.length} URLs`);
  console.log(`${'='.repeat(60)}\n`);

  const strategy = createYtdlpCookiesStrategy({
    browser: options.browser,
    archiveFile: options.archiveFile,
    perUrlTimeoutMs: options.perUrlTimeoutMs,
  });

  const summary = await runBatch(links, options, strategy);

  console.log('\n📊 Batch Summary');
  console.log(`   Total:      ${summary.total}`);
  console.log(`   Successful: ${summary.successful}`);
  console.log(`   Failed:     ${summary.failed}`);

  return summary;
}

export { createAxiosJsonStrategy, createYtdlpCookiesStrategy };
