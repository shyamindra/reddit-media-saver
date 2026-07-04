import { extractMediaUrlsFromYtdlpOutput, stderrFallbackCandidates } from '../adapters/ytdlpCookiesStrategy';

describe('ytdlpCookiesStrategy helpers', () => {
  it('extracts redd.it and imgur URLs from yt-dlp stderr', () => {
    const output = [
      'ERROR: Unsupported URL',
      'https://i.redd.it/abc123.jpg',
      'https://www.reddit.com/media?url=https%3A%2F%2Fi.redd.it%2Fencoded.png',
    ].join('\n');

    expect(extractMediaUrlsFromYtdlpOutput(output).sort()).toEqual([
      'https://i.redd.it/abc123.jpg',
      'https://i.redd.it/encoded.png',
    ].sort());
  });

  it('returns empty array when output has no media hosts', () => {
    expect(extractMediaUrlsFromYtdlpOutput('Following redirect to gallery')).toEqual([]);
  });

  it('stderr fallback on redirect loop keeps only direct redd.it URLs', () => {
    const output = [
      'https://i.redd.it/abc123.jpg',
      'https://gfycat.com/dead-id',
      'https://redgifs.com/watch/dead-id',
    ].join('\n');

    expect(stderrFallbackCandidates(output, 'redirect_loop')).toEqual([
      'https://i.redd.it/abc123.jpg',
    ]);
  });

  it('stderr fallback on gone skips redgifs but keeps i.redd.it', () => {
    const output = [
      'ERROR: HTTP Error 410: Gone',
      'https://i.redd.it/abc.gif',
      'https://redgifs.com/watch/dead-id',
    ].join('\n');

    expect(stderrFallbackCandidates(output, 'gone')).toEqual(['https://i.redd.it/abc.gif']);
  });
});
