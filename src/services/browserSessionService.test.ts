import { existsSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseNetscapeCookieHeader } from './browserSessionService';

describe('parseNetscapeCookieHeader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'browser-session-'));
  });

  it('builds a Cookie header from reddit.com Netscape cookie lines', () => {
    const cookieFile = join(tempDir, 'cookies.txt');
    writeFileSync(
      cookieFile,
      [
        '# Netscape HTTP Cookie File',
        '.reddit.com\tTRUE\t/\tTRUE\t9999999999\treddit_session\tsession_abc',
        '.reddit.com\tTRUE\t/\tFALSE\t9999999999\tloid\tloid_xyz',
        '.google.com\tTRUE\t/\tTRUE\t9999999999\tSID\tshould_be_ignored',
      ].join('\n'),
      'utf8',
    );

    expect(parseNetscapeCookieHeader(cookieFile)).toBe(
      'reddit_session=session_abc; loid=loid_xyz',
    );
  });

  it('skips expired reddit.com cookies', () => {
    const cookieFile = join(tempDir, 'cookies.txt');
    writeFileSync(
      cookieFile,
      [
        '.reddit.com\tTRUE\t/\tTRUE\t1000\texpired\told_value',
        '.reddit.com\tTRUE\t/\tTRUE\t9999999999\tactive\tfresh_value',
      ].join('\n'),
      'utf8',
    );

    expect(parseNetscapeCookieHeader(cookieFile)).toBe('active=fresh_value');
  });

  it('throws when the cookie file is missing', () => {
    expect(() => parseNetscapeCookieHeader(join(tempDir, 'missing.txt'))).toThrow(
      'Cookie file not found',
    );
  });

  it('throws when no valid reddit.com cookies remain', () => {
    const cookieFile = join(tempDir, 'empty.txt');
    writeFileSync(cookieFile, '.example.com\tTRUE\t/\tTRUE\t9999999999\ta\tb\n', 'utf8');

    expect(() => parseNetscapeCookieHeader(cookieFile)).toThrow(
      'No valid reddit.com cookies found',
    );
  });
});
