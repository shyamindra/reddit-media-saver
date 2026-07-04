import { readFileSync } from 'fs';
import { join } from 'path';
import { resolvePostMedia } from './resolvePostMedia';

const FIXTURE_DIR = join(__dirname, '__fixtures__');

function loadFixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8'));
}

describe('resolvePostMedia', () => {
  it('resolves gallery images from gallery_data and media_metadata', () => {
    const postData = loadFixture('gallery-post.json');

    const resolved = resolvePostMedia(postData, {
      title: 'Gallery post',
      subreddit: 'test',
      postId: 'gallery1',
    });

    expect(resolved).toEqual([
      expect.objectContaining({
        url: 'https://i.redd.it/abc123.jpg',
        mediaType: 'image',
        title: 'Gallery post',
        subreddit: 'test',
      }),
      expect.objectContaining({
        url: 'https://i.redd.it/def456.png',
        mediaType: 'image',
      }),
    ]);
  });

  it('resolves reddit hosted video with quality preference', () => {
    const postData = loadFixture('reddit-video-post.json');

    const resolved = resolvePostMedia(postData);

    expect(resolved[0]).toMatchObject({
      url: 'https://v.redd.it/clip/fallback.mp4',
      mediaType: 'video',
      quality: 'fallback',
    });
    expect(resolved.map((item) => item.url)).not.toContain(
      'https://v.redd.it/clip/manifest.m3u8',
    );
  });

  it('extracts direct image URL from preview at highest resolution', () => {
    const postData = loadFixture('preview-image-post.json');

    const resolved = resolvePostMedia(postData);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      url: 'https://preview.redd.it/large.jpg?width=1920',
      mediaType: 'image',
      quality: '1920w',
    });
  });

  it('extracts embedded video URLs from selftext', () => {
    const postData = loadFixture('selftext-video-post.json');

    const resolved = resolvePostMedia(postData);

    expect(resolved).toEqual([
      expect.objectContaining({
        url: 'https://example.com/clip.mp4',
        mediaType: 'video',
        quality: 'embedded',
      }),
    ]);
  });

  it('deduplicates identical URLs', () => {
    const postData = {
      url: 'https://i.redd.it/same.jpg',
      preview: {
        images: [{ source: { url: 'https://i.redd.it/same.jpg' } }],
      },
    };

    const resolved = resolvePostMedia(postData);

    expect(resolved).toHaveLength(1);
  });
});
