import { loadAppConfig, resetAppConfigForTests } from './appConfig';

describe('appConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetAppConfigForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetAppConfigForTests();
  });

  it('resolves default paths relative to project root', () => {
    const config = loadAppConfig();

    expect(config.paths.redditLinksDir).toBe('reddit-links');
    expect(config.paths.downloadsDir).toBe('downloads');
    expect(config.paths.extractedFilesDir).toBe('extracted_files');
    expect(config.paths.output.videos).toBe('downloads/Videos');
    expect(config.paths.output.media).toBe('downloads/Media');
    expect(config.paths.output.gifs).toBe('downloads/Gifs');
    expect(config.paths.output.notes).toBe('downloads/Notes');
    expect(config.paths.output.images).toBe('downloads/Images');
    expect(config.paths.failedRequestsDir).toBe('extracted_files/failed_requests');
    expect(config.paths.downloadArchiveFile).toBe('extracted_files/downloaded-archive.txt');
    expect(config.paths.failedDownloadsFile).toBe('extracted_files/failed_requests/failed-firefox-downloads.txt');
    expect(config.paths.deadSubredditsFile).toBe('extracted_files/dead-subreddits.json');
    expect(config.paths.sessionCookieFile).toBe('extracted_files/.reddit-session-cookies.txt');
  });

  it('overrides downloads directory from REDDIT_SAVER_DOWNLOADS_DIR', () => {
    process.env.REDDIT_SAVER_DOWNLOADS_DIR = '/tmp/my-downloads';

    const config = loadAppConfig();

    expect(config.paths.downloadsDir).toBe('/tmp/my-downloads');
    expect(config.paths.output.videos).toBe('/tmp/my-downloads/Videos');
    expect(config.paths.output.media).toBe('/tmp/my-downloads/Media');
    expect(config.paths.output.gifs).toBe('/tmp/my-downloads/Gifs');
    expect(config.paths.output.notes).toBe('/tmp/my-downloads/Notes');
    expect(config.paths.output.images).toBe('/tmp/my-downloads/Images');
  });

  it('uses Vite dev port for auth redirect URI', () => {
    const config = loadAppConfig();

    expect(config.auth.devServerPort).toBe(5173);
    expect(config.auth.redirectUri).toBe('http://localhost:5173/auth/callback');
    expect(config.auth.scope).toBe('history read');
  });

  it('exposes batch timing and user-agent defaults', () => {
    const config = loadAppConfig();

    expect(config.batch.delayBetweenUrlsMs).toBe(8000);
    expect(config.batch.batchPauseEvery).toBe(15);
    expect(config.batch.batchPauseMs).toBe(180_000);
    expect(config.batch.perUrlTimeoutMs).toBe(120_000);
    expect(config.userAgent).toMatch(/Mozilla\/5\.0/);
  });
});
