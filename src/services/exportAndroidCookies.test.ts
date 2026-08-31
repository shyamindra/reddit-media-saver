import { homedir } from 'os';
import { join } from 'path';
import {
  filterNetscapeRedditCookies,
  resolveAndroidCookieExportPath,
} from './exportAndroidCookies';

describe('filterNetscapeRedditCookies', () => {
  it('keeps reddit.com cookie lines and the Netscape header', () => {
    const input = [
      '# Netscape HTTP Cookie File',
      '# This is a generated file! Do not edit.',
      '',
      '.reddit.com\tTRUE\t/\tTRUE\t9999999999\treddit_session\tsession_abc',
      '.google.com\tTRUE\t/\tTRUE\t9999999999\tSID\tignore_me',
      '#HttpOnly_.reddit.com\tTRUE\t/\tTRUE\t9999999999\ttoken_v2\ttoken_xyz',
      '.reddit.com\tTRUE\t/\tFALSE\t1000\texpired\told',
    ].join('\n');

    const out = filterNetscapeRedditCookies(input);

    expect(out).toContain('# Netscape HTTP Cookie File');
    expect(out).toContain('reddit_session\tsession_abc');
    expect(out).toContain('#HttpOnly_.reddit.com');
    expect(out).toContain('token_v2\ttoken_xyz');
    expect(out).not.toContain('google.com');
    expect(out).not.toContain('\texpired\t');
  });

  it('throws when no valid reddit.com cookies remain', () => {
    expect(() =>
      filterNetscapeRedditCookies(
        '# Netscape HTTP Cookie File\n.example.com\tTRUE\t/\tTRUE\t9999999999\ta\tb\n',
      ),
    ).toThrow('No valid reddit.com cookies found');
  });
});

describe('resolveAndroidCookieExportPath', () => {
  it('defaults to ~/Downloads/boostlite-reddit-cookies.txt', () => {
    expect(resolveAndroidCookieExportPath({})).toBe(
      join(homedir(), 'Downloads', 'boostlite-reddit-cookies.txt'),
    );
  });

  it('honors explicit out path', () => {
    expect(resolveAndroidCookieExportPath({ out: '/tmp/cookies.txt' })).toBe('/tmp/cookies.txt');
  });
});
