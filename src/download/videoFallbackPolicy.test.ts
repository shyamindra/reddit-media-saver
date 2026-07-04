import type { ResolvedMedia } from '../linkResolution/types';
import {
  filterStderrFallbackCandidates,
  isMotionMedia,
  isRedditPreviewThumbnail,
  jsonFallbackSucceeded,
  shouldSkipJsonFallbackItem,
  shouldSkipRedgifsInStderr,
} from './videoFallbackPolicy';

describe('videoFallbackPolicy', () => {
  it('detects Reddit preview thumbnails', () => {
    expect(isRedditPreviewThumbnail('https://external-preview.redd.it/foo.jpg?width=108')).toBe(true);
    expect(isRedditPreviewThumbnail('https://i.redd.it/foo.gif')).toBe(false);
  });

  it('treats i.redd.it gifs as motion media even when typed as image', () => {
    expect(
      isMotionMedia({
        url: 'https://i.redd.it/abc.gif',
        mediaType: 'image',
      }),
    ).toBe(true);
  });

  it('skips preview and redgifs JSON items after motion target failed', () => {
    const preview: ResolvedMedia = {
      url: 'https://external-preview.redd.it/x.jpg',
      mediaType: 'image',
    };
    const redgifs: ResolvedMedia = {
      url: 'https://redgifs.com/watch/dead-id',
      mediaType: 'video',
    };
    const galleryImage: ResolvedMedia = {
      url: 'https://i.redd.it/gallery.jpg',
      mediaType: 'image',
    };

    expect(shouldSkipJsonFallbackItem(preview, true)).toBe(true);
    expect(shouldSkipJsonFallbackItem(redgifs, true)).toBe(true);
    expect(shouldSkipJsonFallbackItem(galleryImage, true)).toBe(false);
    expect(shouldSkipJsonFallbackItem(preview, false)).toBe(false);
  });

  it('does not count preview-only saves as success when motion was expected', () => {
    const resolved: ResolvedMedia[] = [
      { url: 'https://redgifs.com/watch/dead', mediaType: 'video' },
      { url: 'https://external-preview.redd.it/x.jpg', mediaType: 'image' },
    ];

    expect(jsonFallbackSucceeded(resolved, 0, 1)).toBe(false);
    expect(jsonFallbackSucceeded(resolved, 1, 0)).toBe(true);
    expect(jsonFallbackSucceeded(resolved, 0, 0)).toBe(false);
  });

  it('allows image-only success for gallery posts with no motion targets', () => {
    const resolved: ResolvedMedia[] = [
      { url: 'https://i.redd.it/a.jpg', mediaType: 'image' },
      { url: 'https://i.redd.it/b.jpg', mediaType: 'image' },
    ];

    expect(jsonFallbackSucceeded(resolved, 0, 2)).toBe(true);
    expect(jsonFallbackSucceeded(resolved, 0, 0)).toBe(false);
  });

  it('skips redgifs in stderr when primary failed gone or dead_host', () => {
    expect(shouldSkipRedgifsInStderr('gone')).toBe(true);
    expect(shouldSkipRedgifsInStderr('dead_host')).toBe(true);
    expect(shouldSkipRedgifsInStderr('unknown')).toBe(false);
  });

  it('filterStderrFallbackCandidates removes redgifs on gone but keeps i.redd.it', () => {
    const candidates = [
      'https://i.redd.it/abc.gif',
      'https://redgifs.com/watch/dead-id',
      'https://gfycat.com/dead-id',
    ];

    expect(
      filterStderrFallbackCandidates(candidates, 'gone', (url) => url),
    ).toEqual(['https://i.redd.it/abc.gif']);
  });
});
