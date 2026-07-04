import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadAppConfig, resetAppConfigForTests } from '../config/appConfig';
import { extractVideoUrlsFromHtml, isHtmlContent } from './htmlContent';
import { runFixCorrupt } from './fixCorrupt';
import { runOrganize } from './organize';
import { runRecoverHtml } from './recoverHtml';
import { resolveTranscodeSourceDirs } from './transcodeGifs';

describe('isHtmlContent', () => {
  it('detects HTML saved with an image extension', () => {
    expect(isHtmlContent('<!DOCTYPE html><html><body>error</body></html>')).toBe(true);
  });

  it('returns false for binary-looking content', () => {
    expect(isHtmlContent('\x89PNG\r\n\x1a\n')).toBe(false);
  });
});

describe('extractVideoUrlsFromHtml', () => {
  it('extracts v.redd.it URLs from saved HTML notes', () => {
    const html = '<html><meta property="og:video" content="https://v.redd.it/abc123"/></html>';
    expect(extractVideoUrlsFromHtml(html)).toContain('https://v.redd.it/abc123');
  });
});

describe('runOrganize', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetAppConfigForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetAppConfigForTests();
  });

  it('groups similar filenames into subfolders under a category', () => {
    const root = mkdtempSync(join(tmpdir(), 'repair-organize-'));
    process.env.REDDIT_SAVER_DOWNLOADS_DIR = root;
    const config = loadAppConfig();
    const imagesDir = config.paths.output.images;
    mkdirSync(imagesDir, { recursive: true });

    writeFileSync(join(imagesDir, 'Sunset_miami_1.jpg'), Buffer.from([1, 2, 3]));
    writeFileSync(join(imagesDir, 'Sunset_miami_2.jpg'), Buffer.from([4, 5, 6]));

    const summary = runOrganize({ dryRun: false });

    expect(summary.groupsCreated).toBeGreaterThanOrEqual(1);
    expect(summary.organizedFiles).toBe(2);
    expect(existsSync(join(imagesDir, 'miami'))).toBe(true);
  });
});

describe('runFixCorrupt', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetAppConfigForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetAppConfigForTests();
  });

  it('renames HTML-as-image files to .txt in place', () => {
    const root = mkdtempSync(join(tmpdir(), 'repair-fix-'));
    process.env.REDDIT_SAVER_DOWNLOADS_DIR = root;
    const config = loadAppConfig();
    const imagesDir = config.paths.output.images;
    mkdirSync(imagesDir, { recursive: true });

    const corruptPath = join(imagesDir, 'fake_image.jpg');
    writeFileSync(
      corruptPath,
      '<!DOCTYPE html><html><body>not an image</body></html>' + 'x'.repeat(1100),
      'utf8',
    );

    const summary = runFixCorrupt();

    expect(summary.fixed).toBe(1);
    expect(existsSync(corruptPath)).toBe(false);
    expect(existsSync(join(imagesDir, 'fake_image.txt'))).toBe(true);
    expect(readFileSync(join(imagesDir, 'fake_image.txt'), 'utf8')).toContain('<html>');
  });
});

describe('runRecoverHtml', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetAppConfigForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetAppConfigForTests();
  });

  it('downloads videos found in HTML note files', async () => {
    const root = mkdtempSync(join(tmpdir(), 'repair-recover-'));
    process.env.REDDIT_SAVER_DOWNLOADS_DIR = root;
    const config = loadAppConfig();
    mkdirSync(config.paths.output.notes, { recursive: true });
    mkdirSync(config.paths.output.videos, { recursive: true });

    writeFileSync(
      join(config.paths.output.notes, 'saved_page.txt'),
      '<html><meta property="og:video" content="https://v.redd.it/recovertest"/></html>',
      'utf8',
    );

    const downloaded: string[] = [];
    const summary = await runRecoverHtml({
      downloadVideo: async (url, filename) => {
        downloaded.push(url);
        writeFileSync(join(config.paths.output.videos, filename), Buffer.from('video-bytes'));
        return true;
      },
    });

    expect(summary.urlsFound).toBe(1);
    expect(summary.downloaded).toBe(1);
    expect(downloaded).toContain('https://v.redd.it/recovertest');
    expect(existsSync(join(config.paths.output.videos, 'reddit_recovertest.mp4'))).toBe(true);
  });
});

describe('resolveTranscodeSourceDirs', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetAppConfigForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetAppConfigForTests();
  });

  it('derives scan folders from appConfig output paths', () => {
    process.env.REDDIT_SAVER_DOWNLOADS_DIR = 'my-downloads';
    const config = loadAppConfig();

    expect(resolveTranscodeSourceDirs(config.paths.downloadsDir, config.paths.output)).toEqual([
      'Gifs',
      'Media',
      'Videos',
    ]);
  });
});
