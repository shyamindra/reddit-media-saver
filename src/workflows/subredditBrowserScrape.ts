import { firefox, type BrowserContext, type Page } from 'playwright';
import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { SubredditSort, SubredditTime } from '../services/redditFetchService';
import type { SubredditPost } from './subredditCsv';

export interface BrowserScrapeOptions {
  subreddit: string;
  sort: SubredditSort;
  time: SubredditTime;
  limit: number;
  site: 'old' | 'new';
  useFirefoxProfile: boolean;
  headless: boolean;
}

function findFirefoxProfile(): string | null {
  const profilesDir = join(homedir(), 'Library/Application Support/Firefox/Profiles');
  if (!existsSync(profilesDir)) return null;

  const candidates = readdirSync(profilesDir).filter(
    (name: string) => name.includes('default') || name.endsWith('.default'),
  );
  if (candidates.length === 0) return null;
  return join(profilesDir, candidates[0]);
}

function listingUrl(options: BrowserScrapeOptions): string {
  const { subreddit, sort, time, limit, site } = options;
  if (site === 'old') {
    const params = new URLSearchParams({ limit: String(Math.min(limit, 100)), t: time });
    return `https://old.reddit.com/r/${subreddit}/${sort}/?${params}`;
  }
  const params = new URLSearchParams({ t: time });
  return `https://www.reddit.com/r/${subreddit}/${sort}/?${params}`;
}

async function dismissNsfwGate(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Yes")',
    'button:has-text("Continue")',
    'button:has-text("View NSFW")',
    '#over18',
    'a[data-click-id="over18"]',
  ];

  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        await page.waitForTimeout(1000);
        console.log(`   ✅ Dismissed NSFW gate via: ${selector}`);
        return;
      }
    } catch {
      // try next selector
    }
  }
}

function extractPostsFromPage(page: Page): Promise<SubredditPost[]> {
  return page.$$eval('a[href*="/comments/"]', (anchors) => {
    const seen = new Set<string>();
    const posts: { url: string; title: string }[] = [];

    for (const anchor of anchors) {
      const href = (anchor as HTMLAnchorElement).href;
      if (!href.includes('/comments/')) continue;
      const match = href.match(/\/r\/[^/]+\/comments\/[^/]+/);
      if (!match) continue;
      const url = `https://www.reddit.com${match[0]}/`;
      if (seen.has(url)) continue;
      seen.add(url);
      posts.push({ url, title: (anchor.textContent ?? '').trim() || url });
    }

    return posts;
  });
}

async function scrapeOldReddit(page: Page, options: BrowserScrapeOptions): Promise<SubredditPost[]> {
  const collected = new Map<string, SubredditPost>();
  let pageNum = 1;
  let url = listingUrl(options);

  while (collected.size < options.limit) {
    console.log(`\n📄 Loading page ${pageNum}: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await dismissNsfwGate(page);
    await page.waitForTimeout(1500);

    const posts = await extractPostsFromPage(page);
    for (const post of posts) {
      if (!collected.has(post.url)) {
        collected.set(post.url, post);
      }
    }

    console.log(`   Found ${posts.length} posts on page (${collected.size} unique total)`);
    if (collected.size >= options.limit) break;

    const nextButton = page.locator('span.next-button a, a[rel="nofollow next"]').first();
    if (!(await nextButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('   No more pages.');
      break;
    }

    const nextHref = await nextButton.getAttribute('href');
    if (!nextHref) break;
    url = nextHref.startsWith('http') ? nextHref : `https://old.reddit.com${nextHref}`;
    pageNum++;
  }

  return [...collected.values()].slice(0, options.limit);
}

async function scrapeNewReddit(page: Page, options: BrowserScrapeOptions): Promise<SubredditPost[]> {
  const url = listingUrl(options);
  console.log(`\n📄 Loading: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissNsfwGate(page);

  const collected = new Map<string, SubredditPost>();
  let staleRounds = 0;

  while (collected.size < options.limit && staleRounds < 5) {
    const posts = await extractPostsFromPage(page);
    const before = collected.size;
    for (const post of posts) {
      collected.set(post.url, post);
    }

    console.log(`   Collected ${collected.size} unique posts (scroll round)`);
    if (collected.size >= options.limit) break;
    if (collected.size === before) {
      staleRounds++;
    } else {
      staleRounds = 0;
    }

    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await page.waitForTimeout(2000);
  }

  return [...collected.values()].slice(0, options.limit);
}

export async function scrapeSubredditPosts(options: BrowserScrapeOptions): Promise<SubredditPost[]> {
  let context: BrowserContext | null = null;

  try {
    if (options.useFirefoxProfile) {
      const profilePath = findFirefoxProfile();
      if (!profilePath) {
        throw new Error(
          'Could not find Firefox profile. Close Firefox and try again, or omit --firefox-profile.',
        );
      }
      console.log(`🦊 Using Firefox profile: ${profilePath}`);
      console.log('   ⚠️  Firefox must be fully closed before scraping with --firefox-profile.\n');
      context = await firefox.launchPersistentContext(profilePath, {
        headless: options.headless,
      });
    } else {
      console.log('🦊 Launching Playwright Firefox (bundled)\n');
      const browser = await firefox.launch({ headless: options.headless });
      context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0',
      });
    }

    const page = context.pages()[0] ?? (await context.newPage());
    return options.site === 'old'
      ? await scrapeOldReddit(page, options)
      : await scrapeNewReddit(page, options);
  } finally {
    if (context) {
      await context.close();
      console.log('\n🔒 Browser closed.');
    }
  }
}
