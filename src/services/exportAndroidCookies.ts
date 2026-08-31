import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join, resolve } from 'path';
import { exportBrowserCookies, sessionCookiePath } from './browserSessionService';

const DEFAULT_FILENAME = 'boostlite-reddit-cookies.txt';

export interface AndroidCookieExportOptions {
  /** Destination path. Defaults to ~/Downloads/boostlite-reddit-cookies.txt */
  out?: string;
  browser?: string;
}

/**
 * Keep only non-expired reddit.com Netscape cookie lines (plus a short header).
 * Pure: no I/O.
 */
export function filterNetscapeRedditCookies(netscapeText: string): string {
  const now = Math.floor(Date.now() / 1000);
  const kept: string[] = [];

  for (const line of netscapeText.split('\n')) {
    if (!line || line.startsWith('#') && !line.startsWith('#HttpOnly_')) {
      continue;
    }

    const normalized = line.startsWith('#HttpOnly_') ? line.slice('#HttpOnly_'.length) : line;
    const parts = normalized.split('\t');
    if (parts.length < 7) continue;

    const domain = parts[0];
    const expires = parseInt(parts[4], 10);
    if (!domain.includes('reddit.com')) continue;
    if (!Number.isNaN(expires) && expires > 0 && expires < now) continue;

    kept.push(line);
  }

  if (kept.length === 0) {
    throw new Error(
      'No valid reddit.com cookies found. Browse Reddit in Firefox first, then close Firefox completely.',
    );
  }

  return ['# Netscape HTTP Cookie File', '# BoostLite export — reddit.com only', '', ...kept].join(
    '\n',
  ) + '\n';
}

/** Count cookie rows (non-comment, tab-separated) in a Netscape file body. */
export function countNetscapeCookieLines(netscapeText: string): number {
  return netscapeText
    .split('\n')
    .filter((line) => line && !line.startsWith('#') && line.includes('\t'))
    .length;
}

export function resolveAndroidCookieExportPath(options: { out?: string } = {}): string {
  if (options.out?.trim()) {
    return resolve(options.out.trim());
  }
  return join(homedir(), 'Downloads', DEFAULT_FILENAME);
}

export interface AndroidCookieExportResult {
  path: string;
  cookieCount: number;
  browser: string;
}

/**
 * Export Firefox (or other) cookies via yt-dlp, filter to reddit.com, write a
 * Netscape file suitable for BoostLite "Import file".
 */
export function exportAndroidCookieFile(
  options: AndroidCookieExportOptions = {},
): AndroidCookieExportResult {
  const browser = options.browser ?? 'firefox';
  const outPath = resolveAndroidCookieExportPath(options);

  exportBrowserCookies(browser);

  const rawPath = sessionCookiePath();
  if (!existsSync(rawPath)) {
    throw new Error(`Cookie export missing at ${rawPath}`);
  }

  const filtered = filterNetscapeRedditCookies(readFileSync(rawPath, 'utf8'));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, filtered, 'utf8');

  // Keep a copy next to the session file for debugging (gitignored).
  try {
    copyFileSync(outPath, join(dirname(rawPath), DEFAULT_FILENAME));
  } catch {
    // non-fatal
  }

  return {
    path: outPath,
    cookieCount: countNetscapeCookieLines(filtered),
    browser,
  };
}
