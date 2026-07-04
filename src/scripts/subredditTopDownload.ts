import { firefox, type BrowserContext, type Page } from 'playwright';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { fetchListing } from '../services/redditFetchService';
import { cleanupCookieFile } from '../utils/firefoxCookies';

interface CliOptions {
  subreddit: string;
  sort: 'top' | 'hot' | 'new';
  time: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
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
}

interface ScrapedPost {
  url: string;
  title: string;
}

function findFirefoxProfile(): string | null {
  const profilesDir = join(homedir(), 'Library/Application Support/Firefox/Profiles');
  if (!existsSync(profilesDir)) return null;

  const candidates = readdirSync(profilesDir).filter(
    (name: string) => name.includes('default') || name.endsWith('.default')
  );
  if (candidates.length === 0) return null;
  return join(profilesDir, candidates[0]);
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    subreddit: 'WatchItForThePlot',
    sort: 'top',
    time: 'all',
    limit: 100,
    method: 'json',
    site: 'old',
    useFirefoxProfile: false,
    headless: false,
    scrapeOnly: false,
    outputCsv: '',
    delayMs: 8000,
    batchPauseEvery: 15,
    batchPauseMs: 180_000,
    perUrlTimeoutMs: 120_000,
    browser: 'firefox'
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--subreddit':
      case '-s':
        options.subreddit = args[++i].replace(/^r\//, '');
        break;
      case '--sort':
        options.sort = args[++i] as CliOptions['sort'];
        break;
      case '--time':
      case '-t':
        options.time = args[++i] as CliOptions['time'];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--site':
        options.site = args[++i] as CliOptions['site'];
        break;
      case '--method':
      case '-m':
        options.method = args[++i] as CliOptions['method'];
        break;
      case '--browser':
        options.method = 'browser';
        break;
      case '--firefox-profile':
        options.useFirefoxProfile = true;
        break;
      case '--headless':
        options.headless = true;
        break;
      case '--scrape-only':
        options.scrapeOnly = true;
        break;
      case '--output':
      case '-o':
        options.outputCsv = args[++i];
        break;
      case '--delay':
      case '-d':
        options.delayMs = parseInt(args[++i], 10);
        break;
      case '--batch-pause':
        options.batchPauseEvery = parseInt(args[++i], 10);
        break;
      case '--batch-pause-ms':
        options.batchPauseMs = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  if (!options.outputCsv) {
    options.outputCsv = join('reddit-links', 'subreddit-scraped', `${options.sort}-${options.subreddit}.csv`);
  }

  return options;
}

function printHelp(): void {
  console.log(`
Subreddit Top Downloader

Discovers post URLs from a subreddit listing, then downloads media via yt-dlp
using your Firefox session (Tampermonkey / NSFW cookies — no Reddit OAuth needed).

Discovery methods:
  json (default)  — Fetch /r/{sub}/{sort}.json using Firefox cookies (fast, reliable)
  browser         — Playwright HTML scrape of old/new Reddit (fallback)

Close Firefox before running so yt-dlp can read cookies.

Usage:
  npm run download-subreddit-top [options]

Options:
  --subreddit, -s <name>   Subreddit name (default: WatchItForThePlot)
  --sort <top|hot|new>     Listing sort (default: top)
  --time, -t <period>      top time filter: hour|day|week|month|year|all (default: all)
  --limit, -l <n>          Number of posts to collect (default: 100)
  --method, -m <json|browser>  Discovery method (default: json)
  --browser                Alias for --method browser
  --site <old|new>         Reddit UI for browser method only (default: old)
  --firefox-profile        Use real Firefox profile for browser method (Tampermonkey)
  --headless               Run browser headless (browser method only)
  --scrape-only            Only collect URLs to CSV, skip download
  --output, -o <file>      CSV output path (default: reddit-links/subreddit-scraped/...)
  --delay, -d <ms>         Delay between downloads (default: 8000)
  --batch-pause <n>        Pause after every N URLs (default: 15)
  --batch-pause-ms <ms>    Pause duration in ms (default: 180000 = 3 min)
  --help, -h               Show this help

Examples:
  npm run download-subreddit-top
  npm run download-subreddit-top -- --subreddit WatchItForThePlot --limit 100
  npm run download-subreddit-top -- --scrape-only
  npm run download-subreddit-top -- --method browser --firefox-profile
`);
}

function listingUrl(options: CliOptions): string {
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
    'a[data-click-id="over18"]'
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

function extractPostsFromPage(page: Page): Promise<ScrapedPost[]> {
  return page.$$eval('a[href*="/comments/"]', (anchors) => {
    const seen = new Set<string>();
    const posts: { url: string; title: string }[] = [];

    for (const anchor of anchors) {
      const href = anchor.href;
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

async function scrapeOldReddit(page: Page, options: CliOptions): Promise<ScrapedPost[]> {
  const collected = new Map<string, ScrapedPost>();
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

async function scrapeNewReddit(page: Page, options: CliOptions): Promise<ScrapedPost[]> {
  const url = listingUrl(options);
  console.log(`\n📄 Loading: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissNsfwGate(page);

  const collected = new Map<string, ScrapedPost>();
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

async function scrapePosts(options: CliOptions): Promise<ScrapedPost[]> {
  let context: BrowserContext | null = null;

  try {
    if (options.useFirefoxProfile) {
      const profilePath = findFirefoxProfile();
      if (!profilePath) {
        throw new Error('Could not find Firefox profile. Close Firefox and try again, or omit --firefox-profile.');
      }
      console.log(`🦊 Using Firefox profile: ${profilePath}`);
      console.log('   ⚠️  Firefox must be fully closed before scraping with --firefox-profile.\n');
      context = await firefox.launchPersistentContext(profilePath, {
        headless: options.headless
      });
    } else {
      console.log('🦊 Launching Playwright Firefox (bundled)\n');
      const browser = await firefox.launch({ headless: options.headless });
      context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0'
      });
    }

    const page = context.pages()[0] ?? (await context.newPage());
    const posts =
      options.site === 'old' ? await scrapeOldReddit(page, options) : await scrapeNewReddit(page, options);

    return posts;
  } finally {
    if (context) {
      await context.close();
      console.log('\n🔒 Browser closed.');
    }
  }
}

function writeCsv(posts: ScrapedPost[], outputPath: string): void {
  const dir = join(process.cwd(), outputPath).replace(/\/[^/]+$/, '');
  mkdirSync(dir, { recursive: true });

  const lines = ['key,url,title'];
  posts.forEach((post, i) => {
    const key = `top${String(i + 1).padStart(3, '0')}`;
    const escapedTitle = post.title.replace(/"/g, '""');
    lines.push(`${key},${post.url},"${escapedTitle}"`);
  });

  const fullPath = join(process.cwd(), outputPath);
  writeFileSync(fullPath, lines.join('\n') + '\n', 'utf8');
  console.log(`\n📝 Saved ${posts.length} URLs to: ${outputPath}`);
}

async function downloadPosts(posts: ScrapedPost[], options: CliOptions): Promise<void> {
  console.log('\n⚠️  Close Firefox before starting downloads so yt-dlp can read your cookies.\n');

  const inputPath = options.outputCsv;

  await new Promise<void>((resolve, reject) => {
    const args = [
      'run',
      'download-firefox',
      '--',
      '--input',
      inputPath,
      '--posts-only',
      '--limit',
      String(posts.length),
      '--delay',
      String(options.delayMs),
      '--batch-pause',
      String(options.batchPauseEvery),
      '--batch-pause-ms',
      String(options.batchPauseMs)
    ];

    console.log(`🚀 Running: npm ${args.join(' ')}\n`);
    const child = spawn('npm', args, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, npm_config_update_notifier: 'false' }
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`download-firefox exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function discoverPosts(options: CliOptions): Promise<ScrapedPost[]> {
  if (options.method === 'json') {
    try {
      return await fetchListing({
        subreddit: options.subreddit,
        sort: options.sort,
        time: options.time,
        limit: options.limit,
        browser: options.browser
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n⚠️  JSON listing failed: ${message}`);
      console.log('   Falling back to browser scraping...\n');
      return scrapePosts({ ...options, method: 'browser' });
    }
  }

  return scrapePosts(options);
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log('🔍 Subreddit Top Downloader\n');
  console.log(`   Subreddit: r/${options.subreddit}`);
  console.log(`   Sort:      ${options.sort} (t=${options.time})`);
  console.log(`   Limit:     ${options.limit}`);
  console.log(`   Method:    ${options.method}`);
  if (options.method === 'browser') {
    console.log(`   Site:      ${options.site}.reddit.com`);
  }
  if (options.scrapeOnly) console.log('   Mode:      scrape only');
  console.log('\n⚠️  Close Firefox before starting so cookies can be read.\n');

  let posts: ScrapedPost[];
  try {
    posts = await discoverPosts(options);
  } finally {
    cleanupCookieFile();
  }

  if (posts.length === 0) {
    console.error('\n❌ No posts found. Try --method browser --firefox-profile, or browse the sub in Firefox first.');
    process.exit(1);
  }

  console.log(`\n✅ Scraped ${posts.length} post URLs`);
  posts.slice(0, 5).forEach((p, i) => console.log(`   ${i + 1}. ${p.title.substring(0, 70)}`));
  if (posts.length > 5) console.log(`   ... and ${posts.length - 5} more`);

  writeCsv(posts, options.outputCsv);

  if (!options.scrapeOnly) {
    await downloadPosts(posts, options);
  } else {
    console.log('\n💡 To download later:');
    console.log(
      `   npm run download-firefox -- --input ${options.outputCsv} --posts-only --limit ${posts.length}`
    );
  }

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
