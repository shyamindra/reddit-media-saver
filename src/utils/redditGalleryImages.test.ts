import { readFileSync } from 'fs';
import { join } from 'path';
import { extractImageUrlsFromPostData } from './redditGalleryImages';

const FIXTURE_PATH = join(__dirname, '__fixtures__', 'gallery-post.json');

describe('redditGalleryImages', () => {
  it('extracts i.redd.it URLs from gallery_data and media_metadata', () => {
    const raw = readFileSync(FIXTURE_PATH, 'utf8');
    const listing = JSON.parse(raw) as Array<{
      data: { children: Array<{ data: Record<string, unknown> }> };
    }>;
    const postData = listing[0].data.children[0].data;

    const urls = extractImageUrlsFromPostData(postData);

    expect(urls).toEqual([
      'https://i.redd.it/abc123.jpg',
      'https://i.redd.it/def456.png',
    ]);
  });

  it('decodes HTML entities in preview image URLs', () => {
    const postData = {
      preview: {
        images: [
          {
            source: {
              url: 'https://preview.redd.it/img.jpg?width=1080&amp;format=pjpg&amp;auto=webp&amp;s=abc',
            },
          },
        ],
      },
    };

    const urls = extractImageUrlsFromPostData(postData);

    expect(urls[0]).toBe(
      'https://preview.redd.it/img.jpg?width=1080&format=pjpg&auto=webp&s=abc',
    );
  });

  it('skips video URLs in gallery items', () => {
    const postData = {
      gallery_data: {
        items: [{ media_id: 'vid1' }, { media_id: 'img1' }],
      },
      media_metadata: {
        vid1: {
          e: 'RedditVideo',
          s: { u: 'https://v.redd.it/clip.mp4' },
        },
        img1: {
          e: 'Image',
          s: { u: 'https://i.redd.it/photo.jpg' },
        },
      },
    };

    const urls = extractImageUrlsFromPostData(postData);

    expect(urls).toEqual(['https://i.redd.it/photo.jpg']);
  });

  it('returns empty array when post has no image media', () => {
    expect(extractImageUrlsFromPostData({ url: 'https://www.reddit.com/r/test/' })).toEqual([]);
  });
});
