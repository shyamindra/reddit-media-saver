import { mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileInputService } from './fileInputService';

function writeCsv(dir: string, fileName: string, lines: string[]): string {
  const filePath = join(dir, fileName);
  writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
  return filePath;
}

describe('FileInputService', () => {
  describe('readRedditUrlsFromCsv', () => {
    it('reads URLs from the second column and skips comments and header rows', () => {
      const dir = mkdtempSync(join(tmpdir(), 'link-intake-'));
      const filePath = writeCsv(dir, 'links.csv', [
        '# comment line',
        'key,permalink',
        't3_a,https://www.reddit.com/r/foo/comments/abc123/my_post/',
        '',
        't3_b,https://www.reddit.com/r/bar/comments/def456/another_post/',
      ]);

      const urls = FileInputService.readRedditUrlsFromCsv(filePath);

      expect(urls).toEqual([
        'https://www.reddit.com/r/foo/comments/abc123/my_post/',
        'https://www.reddit.com/r/bar/comments/def456/another_post/',
      ]);
    });

    it('ignores rows without an http URL in the second column', () => {
      const dir = mkdtempSync(join(tmpdir(), 'link-intake-'));
      const filePath = writeCsv(dir, 'links.csv', [
        't3_a,not-a-url',
        't3_b,',
        'only-one-column',
      ]);

      expect(FileInputService.readRedditUrlsFromCsv(filePath)).toEqual([]);
    });
  });

  describe('validateRedditUrl', () => {
    it('parses post URLs', () => {
      const url = 'https://www.reddit.com/r/test/comments/abc123/slug_here/';
      expect(FileInputService.validateRedditUrl(url)).toEqual({
        url,
        type: 'post',
        subreddit: 'test',
        postId: 'abc123',
      });
    });

    it('parses explicit comment URLs', () => {
      const url =
        'https://www.reddit.com/r/test/comments/abc123/slug/comment/xyz789/';
      expect(FileInputService.validateRedditUrl(url)).toEqual({
        url,
        type: 'comment',
        subreddit: 'test',
        postId: 'abc123',
        commentId: 'xyz789',
      });
    });

    it('parses shorthand comment URLs', () => {
      const url = 'https://www.reddit.com/r/test/comments/abc123/slug/xyz789/';
      expect(FileInputService.validateRedditUrl(url)).toEqual({
        url,
        type: 'comment',
        subreddit: 'test',
        postId: 'abc123',
        commentId: 'xyz789',
      });
    });

    it('returns invalid for non-Reddit URLs', () => {
      expect(FileInputService.validateRedditUrl('https://example.com/page')).toEqual({
        url: 'https://example.com/page',
        type: 'invalid',
      });
    });
  });

  describe('processRedditUrlsFromCsv', () => {
    it('splits valid and invalid URLs from a single CSV file', () => {
      const dir = mkdtempSync(join(tmpdir(), 'link-intake-'));
      const filePath = writeCsv(dir, 'mixed.csv', [
        'key,url',
        't3_a,https://www.reddit.com/r/foo/comments/abc123/post_one/',
        't3_b,https://example.com/not-reddit',
      ]);

      const { valid, invalid } = FileInputService.processRedditUrlsFromCsv(filePath);

      expect(valid).toHaveLength(1);
      expect(valid[0]?.postId).toBe('abc123');
      expect(invalid).toEqual(['https://example.com/not-reddit']);
    });
  });

  describe('readRedditPostsFromCsv', () => {
    it('maps valid post rows with slug-derived titles', () => {
      const dir = mkdtempSync(join(tmpdir(), 'link-intake-'));
      writeCsv(dir, 'posts.csv', [
        'key,url',
        't3_a,https://www.reddit.com/r/foo/comments/abc123/my_post_title/',
      ]);

      const posts = FileInputService.readRedditPostsFromCsv(dir);

      expect(posts).toEqual([
        {
          url: 'https://www.reddit.com/r/foo/comments/abc123/my_post_title/',
          title: 'my post title',
          subreddit: 'foo',
          author: 'Unknown',
        },
      ]);
    });

    it('uses reddit_post fallback title when slug is missing', () => {
      const dir = mkdtempSync(join(tmpdir(), 'link-intake-'));
      writeCsv(dir, 'posts.csv', [
        'key,url',
        't3_a,https://www.reddit.com/r/foo/comments/abc123/',
      ]);

      const posts = FileInputService.readRedditPostsFromCsv(dir);

      expect(posts[0]?.title).toBe('reddit_post');
    });
  });
});
