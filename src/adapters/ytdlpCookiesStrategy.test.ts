import { extractMediaUrlsFromYtdlpOutput } from '../adapters/ytdlpCookiesStrategy';

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
});
