import { normalizeExternalMediaUrl, rewriteGfycatToRedgifs, pickDirectRedgifsMp4 } from './normalizeMediaUrl';

describe('rewriteGfycatToRedgifs', () => {
  it('rewrites dead gfycat URLs to redgifs watch pages', () => {
    expect(rewriteGfycatToRedgifs('https://gfycat.com/activepopulariggypops')).toBe(
      'https://www.redgifs.com/watch/activepopulariggypops',
    );
  });

  it('returns null for non-gfycat URLs', () => {
    expect(rewriteGfycatToRedgifs('https://www.reddit.com/r/test/comments/abc/')).toBeNull();
  });
});

describe('normalizeExternalMediaUrl', () => {
  it('passes through direct media URLs unchanged', () => {
    expect(normalizeExternalMediaUrl('https://media.redgifs.com/example.mp4')).toBe(
      'https://media.redgifs.com/example.mp4',
    );
  });
});

describe('pickDirectRedgifsMp4', () => {
  it('extracts media.redgifs.com MP4 from a watch page HTML snippet', () => {
    const html =
      '<html><meta property="og:video" content="https://media.redgifs.com/ActivePopularIggyPops.mp4"/></html>';
    expect(pickDirectRedgifsMp4(html)).toBe('https://media.redgifs.com/ActivePopularIggyPops.mp4');
  });
});
