import { chunk, sleep } from '../utils/processUtils';
import { runSubredditTopWorkflow } from './subredditTopWorkflow';
import type { SubredditTopWorkflowOptions } from './subredditTopWorkflow';

export interface SubredditQueueOptions {
  subreddits: string[];
  parallel: number;
  cooldownMs: number;
  staggerMs: number;
  limit: number;
  sort: SubredditTopWorkflowOptions['sort'];
  time: SubredditTopWorkflowOptions['time'];
  delayMs: number;
  batchPauseEvery: number;
  batchPauseMs: number;
  perUrlTimeoutMs: number;
  browser: string;
  archiveFile: string;
  scrapeOnly: boolean;
}

export interface SubredditQueueResult {
  subreddit: string;
  success: boolean;
  error?: string;
}

export interface SubredditQueueSummary {
  total: number;
  successful: number;
  failed: number;
  results: SubredditQueueResult[];
}

function baseWorkflowOptions(
  options: SubredditQueueOptions,
  subreddit: string,
): SubredditTopWorkflowOptions {
  return {
    subreddit,
    sort: options.sort,
    time: options.time,
    limit: options.limit,
    method: 'json',
    site: 'old',
    useFirefoxProfile: false,
    headless: false,
    scrapeOnly: options.scrapeOnly,
    outputCsv: '',
    delayMs: options.delayMs,
    batchPauseEvery: options.batchPauseEvery,
    batchPauseMs: options.batchPauseMs,
    perUrlTimeoutMs: options.perUrlTimeoutMs,
    browser: options.browser,
    archiveFile: options.archiveFile,
  };
}

export async function runSubredditQueue(
  options: SubredditQueueOptions,
): Promise<SubredditQueueSummary> {
  const waves = chunk(options.subreddits, options.parallel);
  const results: SubredditQueueResult[] = [];

  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🌊 Wave ${i + 1}/${waves.length}: ${wave.map((s) => `r/${s}`).join(', ')}`);
    console.log(`${'='.repeat(60)}\n`);

    const waveResults = await Promise.all(
      wave.map(async (subreddit, index) => {
        if (index > 0 && options.staggerMs > 0) {
          const staggerDelay = index * options.staggerMs;
          console.log(`⏱️  r/${subreddit} staggered start in ${staggerDelay / 60_000} min...`);
          await sleep(staggerDelay);
        }

        try {
          await runSubredditTopWorkflow(baseWorkflowOptions(options, subreddit));
          return { subreddit, success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`❌ r/${subreddit} failed: ${message}`);
          return { subreddit, success: false, error: message };
        }
      }),
    );

    results.push(...waveResults);

    for (const result of waveResults) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} r/${result.subreddit}`);
    }

    if (i < waves.length - 1 && options.cooldownMs > 0) {
      console.log(`\n🧊 Cooling down ${options.cooldownMs / 60_000} min before next wave...\n`);
      await sleep(options.cooldownMs);
    }
  }

  const failed = results.filter((r) => !r.success);
  return {
    total: results.length,
    successful: results.length - failed.length,
    failed: failed.length,
    results,
  };
}
