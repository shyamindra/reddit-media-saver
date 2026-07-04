import axios from 'axios';
import { loadAppConfig } from '../config/appConfig';
import { loadFirefoxCookieHeader } from '../utils/firefoxCookies';

export type SubredditSort = 'top' | 'hot' | 'new' | 'rising';
export type SubredditTime = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export interface ListingPost {
  url: string;
  title: string;
  id: string;
  subreddit: string;
  permalink: string;
  isVideo: boolean;
  postHint?: string;
  domain?: string;
}

export interface FetchListingOptions {
  subreddit: string;
  sort: SubredditSort;
  time?: SubredditTime;
  limit: number;
  browser?: string;
  delayMs?: number;
}

export interface RedditFetchOptions {
  browser?: string;
  useCookies?: boolean;
}

interface RedditListingChild {
  data?: {
    id?: string;
    title?: string;
    permalink?: string;
    subreddit?: string;
    url?: string;
    is_video?: boolean;
    post_hint?: string;
    domain?: string;
    stickied?: boolean;
  };
}

interface RedditListingResponse {
  data?: {
    children?: RedditListingChild[];
    after?: string | null;
  };
}

const PAGE_SIZE = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function listingEndpoint(
  subreddit: string,
  sort: SubredditSort,
  time: SubredditTime | undefined,
  after?: string,
): string {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    raw_json: '1',
  });

  if (sort === 'top' && time) {
    params.set('t', time);
  }
  if (after) {
    params.set('after', after);
  }

  return `https://www.reddit.com/r/${subreddit}/${sort}.json?${params}`;
}

function postJsonUrl(postUrl: string): string {
  return postUrl.replace(/\/?$/, '.json');
}

function childToPost(child: RedditListingChild): ListingPost | null {
  const data = child.data;
  if (!data?.permalink || !data.id) return null;
  if (data.stickied) return null;

  const permalink = data.permalink.startsWith('http')
    ? data.permalink
    : `https://www.reddit.com${data.permalink}`;

  return {
    url: permalink.replace(/\/?$/, '/'),
    title: (data.title ?? data.id).trim(),
    id: data.id,
    subreddit: data.subreddit ?? 'unknown',
    permalink,
    isVideo: Boolean(data.is_video),
    postHint: data.post_hint,
    domain: data.domain,
  };
}

function buildHeaders(options: RedditFetchOptions = {}): Record<string, string> {
  const config = loadAppConfig();
  const headers: Record<string, string> = {
    'User-Agent': config.userAgent,
    Accept: 'application/json',
  };

  if (options.useCookies) {
    headers.Cookie = loadFirefoxCookieHeader(options.browser ?? 'firefox');
  }

  return headers;
}

export async function fetchPost(
  postUrl: string,
  options: RedditFetchOptions = {},
): Promise<Record<string, unknown> | null> {
  const response = await axios.get(postJsonUrl(postUrl), {
    headers: buildHeaders(options),
    timeout: 30_000,
    validateStatus: (status) => status < 500,
  });

  if (response.status === 429 || response.status !== 200) {
    return null;
  }

  const listing = response.data as Array<{
    data?: { children?: Array<{ data?: Record<string, unknown> }> };
  }>;

  return listing?.[0]?.data?.children?.[0]?.data ?? null;
}

/**
 * Fetch subreddit posts via Reddit's JSON listing API.
 * Uses Firefox session cookies for authenticated NSFW access.
 */
export async function fetchListing(options: FetchListingOptions): Promise<ListingPost[]> {
  const { subreddit, sort, time = 'all', limit, browser = 'firefox', delayMs = 1500 } = options;

  console.log('🍪 Exporting Firefox cookies for authenticated JSON access...');
  const cookieHeader = loadFirefoxCookieHeader(browser);
  console.log('   ✅ Session cookies loaded\n');

  const config = loadAppConfig();
  const collected = new Map<string, ListingPost>();
  let after: string | undefined;
  let page = 0;

  while (collected.size < limit) {
    page++;
    const endpoint = listingEndpoint(subreddit, sort, time, after);
    console.log(`📡 Fetching page ${page}: r/${subreddit}/${sort} (${collected.size}/${limit} collected)`);

    const response = await axios.get<RedditListingResponse>(endpoint, {
      headers: {
        'User-Agent': config.userAgent,
        Cookie: cookieHeader,
        Accept: 'application/json',
      },
      timeout: 30_000,
      validateStatus: (status) => status < 500,
    });

    if (response.status === 403) {
      throw new Error(
        'Reddit returned 403. Close Firefox, browse the subreddit once with Tampermonkey, then retry.',
      );
    }

    if (response.status !== 200) {
      throw new Error(`Reddit listing request failed with HTTP ${response.status}`);
    }

    const children = response.data?.data?.children ?? [];
    if (children.length === 0) {
      console.log('   No more posts in listing.');
      break;
    }

    for (const child of children) {
      const post = childToPost(child);
      if (post && !collected.has(post.url)) {
        collected.set(post.url, post);
      }
      if (collected.size >= limit) break;
    }

    after = response.data?.data?.after ?? undefined;
    if (!after) {
      console.log('   Reached end of listing.');
      break;
    }

    if (collected.size < limit && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return [...collected.values()].slice(0, limit);
}
