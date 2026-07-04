import { formatSubredditCsv, postsToLinkBatch } from './subredditCsv';

describe('subredditCsv', () => {
  describe('formatSubredditCsv', () => {
    it('writes key,url,title rows with escaped titles', () => {
      const csv = formatSubredditCsv([
        { url: 'https://www.reddit.com/r/test/comments/abc/slug/', title: 'Hello "world"' },
        { url: 'https://www.reddit.com/r/test/comments/def/other/', title: 'Second' },
      ]);

      expect(csv).toBe(
        [
          'key,url,title',
          'top001,https://www.reddit.com/r/test/comments/abc/slug/,"Hello ""world"""',
          'top002,https://www.reddit.com/r/test/comments/def/other/,"Second"',
          '',
        ].join('\n'),
      );
    });
  });

  describe('postsToLinkBatch', () => {
    it('maps scraped posts to post-type link batch items', () => {
      expect(
        postsToLinkBatch([{ url: 'https://reddit.com/a', title: 'A' }]),
      ).toEqual([{ url: 'https://reddit.com/a', type: 'post' }]);
    });
  });
});
