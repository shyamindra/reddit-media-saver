import { join } from 'path';
import { loadAppConfig } from '../config/appConfig';
import { executeLinkBatch } from '../download/executeLinkBatch';
import type { BatchSummary } from '../download/types';
import {
  fetchListing,
  type SubredditSort,
  type SubredditTime,
} from '../services/redditFetchService';
import { cleanupBrowserSession } from '../services/browserSessionService';
import { postsToLinkBatch, writeSubredditCsv, type SubredditPost } from './subredditCsv';

export interface SubredditTopWorkflowOptions {
  subreddit: string;
  sort: SubredditSort;
  time: SubredditTime;
  limit: number;
  method: 'json' | 'browser';
  site: 'old' | 'new';
  useFirefoxProfile: boolean;
  headless: boolean;
  scrapeOnly: boolean;
  outputCsv: string;
  delayMs: number;
  batchPauseEvery: number;
  batchPauseMs: number;
  perUrlTimeoutMs: number;
  browser: string;
  archiveFile: string;
}

export interface SubredditTopWorkflowResult {
  posts: SubredditPost[];
  outputCsv: string;
  downloadSummary?: BatchSummary;
}

function defaultOutputCsv(subreddit: string, sort: string): string {
  return join('reddit-links', 'subreddit-scraped', `${sort}-${subreddit}.csv`);
}

async function browserScrape(
  options: SubredditTopWorkflowOptions,
): Promise<SubredditPost[]> {
  const { scrapeSubredditPosts } = await import('./subredditBrowserScrape');
  return scrapeSubredditPosts({
    subreddit: options.subreddit,
    sort: options.sort,
    time: options.time,
    limit: options.limit,
    site: options.site,
    useFirefoxProfile: options.useFirefoxProfile,
    headless: options.headless,
  });
}

async function discoverPosts(options: SubredditTopWorkflowOptions): Promise<SubredditPost[]> {
  if (options.method === 'json') {
    try {
      const listing = await fetchListing({
        subreddit: options.subreddit,
        sort: options.sort,
        time: options.time,
        limit: options.limit,
        browser: options.browser,
      });
      return listing.map((post) => ({ url: post.url, title: post.title }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n⚠️  JSON listing failed: ${message}`);
      console.log('   Falling back to browser scraping...\n');
      return browserScrape(options);
    }
  }

  return browserScrape(options);
}

export async function runSubredditTopWorkflow(
  inputOptions: SubredditTopWorkflowOptions,
): Promise<SubredditTopWorkflowResult> {
  const options: SubredditTopWorkflowOptions = {
    ...inputOptions,
    outputCsv: inputOptions.outputCsv || defaultOutputCsv(inputOptions.subreddit, inputOptions.sort),
    archiveFile: inputOptions.archiveFile || loadAppConfig().paths.downloadArchiveFile,
  };

  let posts: SubredditPost[];
  try {
    posts = await discoverPosts(options);
  } finally {
    cleanupBrowserSession();
  }

  if (posts.length === 0) {
    throw new Error(
      'No posts found. Try --method browser --firefox-profile, or browse the sub in Firefox first.',
    );
  }

  console.log(`\n✅ Scraped ${posts.length} post URLs`);
  posts.slice(0, 5).forEach((p, i) => console.log(`   ${i + 1}. ${p.title.substring(0, 70)}`));
  if (posts.length > 5) console.log(`   ... and ${posts.length - 5} more`);

  writeSubredditCsv(posts, options.outputCsv);
  console.log(`\n📝 Saved ${posts.length} URLs to: ${options.outputCsv}`);

  if (options.scrapeOnly) {
    return { posts, outputCsv: options.outputCsv };
  }

  console.log('\n⚠️  Close Firefox before starting downloads so yt-dlp can read your cookies.\n');

  const downloadSummary = await executeLinkBatch(
    postsToLinkBatch(posts),
    {
      browser: options.browser,
      archiveFile: options.archiveFile,
      delayMs: options.delayMs,
      batchPauseEvery: options.batchPauseEvery,
      batchPauseMs: options.batchPauseMs,
      perUrlTimeoutMs: options.perUrlTimeoutMs,
    },
    `r/${options.subreddit} (${posts.length} posts)`,
  );

  return { posts, outputCsv: options.outputCsv, downloadSummary };
}
