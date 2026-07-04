import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { loadAppConfig } from '../config/appConfig';
import { resolveYtdlpBinary } from '../utils/ytdlp';

/**
 * Runtime path for the exported Netscape cookie file (gitignored via appConfig).
 */
export function sessionCookiePath(): string {
  return join(process.cwd(), loadAppConfig().paths.sessionCookieFile);
}

/**
 * Parse a Netscape cookie file into a Cookie header for reddit.com requests.
 * Pure function — no browser or yt-dlp side effects.
 */
export function parseNetscapeCookieHeader(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`Cookie file not found: ${filePath}`);
  }

  const now = Math.floor(Date.now() / 1000);
  const pairs: string[] = [];

  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;

    const parts = line.split('\t');
    if (parts.length < 7) continue;

    const [domain, , , , expiration, name, ...valueParts] = parts;
    const value = valueParts.join('\t');
    if (!domain.includes('reddit.com') || !name) continue;

    const expires = parseInt(expiration, 10);
    if (!Number.isNaN(expires) && expires > 0 && expires < now) continue;

    pairs.push(`${name}=${value}`);
  }

  if (pairs.length === 0) {
    throw new Error(
      'No valid reddit.com cookies found. Browse Reddit in Firefox first (Tampermonkey session counts).',
    );
  }

  return pairs.join('; ');
}

/**
 * Export browser cookies via yt-dlp for authenticated Reddit JSON access.
 * The browser must be closed so yt-dlp can read the profile.
 */
export function exportBrowserCookies(browser = 'firefox'): void {
  const ytdlpBin = resolveYtdlpBinary();
  const cookiePath = sessionCookiePath();

  const result = spawnSync(
    ytdlpBin,
    [
      '--cookies-from-browser',
      browser,
      '--cookies',
      cookiePath,
      '--skip-download',
      '--no-warnings',
      '--quiet',
      'https://www.reddit.com/',
    ],
    { encoding: 'utf8', timeout: 30_000 },
  );

  if (result.error) {
    throw new Error(`Failed to export browser cookies: ${result.error.message}`);
  }

  if (!existsSync(cookiePath)) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(
      `Could not read ${browser} cookies. Close the browser completely and try again.${detail ? ` (${detail})` : ''}`,
    );
  }
}

/**
 * Export browser cookies and return a Cookie header for axios Reddit JSON fetches.
 */
export function loadRedditCookieHeader(browser = 'firefox'): string {
  exportBrowserCookies(browser);
  return parseNetscapeCookieHeader(sessionCookiePath());
}

/** Remove the temporary session cookie export file. */
export function cleanupBrowserSession(): void {
  const path = sessionCookiePath();
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {
      // non-fatal
    }
  }
}
