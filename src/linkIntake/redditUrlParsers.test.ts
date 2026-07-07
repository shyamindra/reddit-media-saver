import {
  extractPostId,
  extractSubredditFromUrl,
  titleFromPostUrl,
} from './redditUrlParsers';

describe('redditUrlParsers', () => {
  const postUrl = 'https://www.reddit.com/r/foo/comments/abc123/my_post_title/';

  it('extracts post ID from comment URLs', () => {
    expect(extractPostId(postUrl)).toBe('abc123');
  });

  it('extracts subreddit from URL', () => {
    expect(extractSubredditFromUrl(postUrl)).toBe('foo');
  });

  it('derives title from slug with underscores replaced', () => {
    expect(titleFromPostUrl(postUrl)).toBe('my post title');
  });

  it('falls back to reddit_post when slug is missing', () => {
    expect(titleFromPostUrl('https://www.reddit.com/r/foo/comments/abc123/')).toBe('reddit_post');
  });
});
