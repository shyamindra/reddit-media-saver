import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { resolveYtdlpBinary } from './ytdlp';

const COOKIE_FILE = join('extracted_files', '.reddit-session-cookies.txt');

/**
 * Export Firefox cookies via yt-dlp (same mechanism as firefoxBatchDownload).
 * Firefox must be closed so yt-dlp can read the profile.
 */
export function exportFirefoxCookies(browser = 'firefox'): void {
  const ytdlpBin = resolveYtdlpBinary();
  const cookiePath = join(process.cwd(), COOKIE_FILE);

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
      'https://www.reddit.com/'
    ],
    { encoding: 'utf8', timeout: 30_000 }
  );

  if (result.error) {
    throw new Error(`Failed to export Firefox cookies: ${result.error.message}`);
  }

  if (!existsSync(cookiePath)) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(
      `Could not read Firefox cookies. Close Firefox completely and try again.${detail ? ` (${detail})` : ''}`
    );
  }
}

/**
 * Parse a Netscape cookie file into a Cookie header value for reddit.com.
 */
export function cookieHeaderFromNetscapeFile(filePath?: string): string {
  const path = filePath ?? join(process.cwd(), COOKIE_FILE);
  if (!existsSync(path)) {
    throw new Error(`Cookie file not found: ${path}`);
  }

  const now = Math.floor(Date.now() / 1000);
  const pairs: string[] = [];

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;

    const parts = line.split('\t');
    if (parts.length < 7) continue;

    const [domain, , , secure, expiration, name, ...valueParts] = parts;
    const value = valueParts.join('\t');
    if (!domain.includes('reddit.com') || !name) continue;

    const expires = parseInt(expiration, 10);
    if (!Number.isNaN(expires) && expires > 0 && expires < now) continue;

    pairs.push(`${name}=${value}`);
  }

  if (pairs.length === 0) {
    throw new Error('No valid reddit.com cookies found. Browse Reddit in Firefox first (Tampermonkey session counts).');
  }

  return pairs.join('; ');
}

export function loadFirefoxCookieHeader(browser = 'firefox'): string {
  exportFirefoxCookies(browser);
  return cookieHeaderFromNetscapeFile();
}

export function cleanupCookieFile(): void {
  const path = join(process.cwd(), COOKIE_FILE);
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {
      // non-fatal
    }
  }
}
