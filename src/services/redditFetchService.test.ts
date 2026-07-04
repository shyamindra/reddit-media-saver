import axios from 'axios';
import { fetchListing, fetchPost } from './redditFetchService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../services/browserSessionService', () => ({
  loadRedditCookieHeader: jest.fn(() => 'reddit_session=abc'),
}));

const LISTING_PAGE_1 = {
  data: {
    children: [
      {
        data: {
          id: 'post1',
          title: 'First post',
          permalink: '/r/test/comments/post1/slug/',
          subreddit: 'test',
          url: 'https://www.reddit.com/r/test/comments/post1/slug/',
          stickied: false,
        },
      },
    ],
    after: 't3_page2',
  },
};

const LISTING_PAGE_2 = {
  data: {
    children: [
      {
        data: {
          id: 'post2',
          title: 'Second post',
          permalink: '/r/test/comments/post2/slug/',
          subreddit: 'test',
          url: 'https://www.reddit.com/r/test/comments/post2/slug/',
          stickied: false,
        },
      },
    ],
    after: null,
  },
};

const POST_JSON = [
  {
    data: {
      children: [
        {
          data: {
            id: 'gallery1',
            title: 'Gallery post',
            gallery_data: { items: [{ media_id: 'img1' }] },
            media_metadata: {
              img1: { s: { u: 'https://i.redd.it/photo.jpg' } },
            },
          },
        },
      ],
    },
  },
];

describe('redditFetchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchListing', () => {
    it('paginates until limit is reached', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200, data: LISTING_PAGE_1 })
        .mockResolvedValueOnce({ status: 200, data: LISTING_PAGE_2 });

      const posts = await fetchListing({
        subreddit: 'test',
        sort: 'top',
        time: 'all',
        limit: 2,
        delayMs: 0,
      });

      expect(posts).toHaveLength(2);
      expect(posts[0].id).toBe('post1');
      expect(posts[1].id).toBe('post2');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);

      const secondCallUrl = mockedAxios.get.mock.calls[1][0] as string;
      expect(secondCallUrl).toContain('after=t3_page2');
    });

    it('skips stickied posts', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            children: [
              {
                data: {
                  id: 'pinned',
                  title: 'Pinned',
                  permalink: '/r/test/comments/pinned/s/',
                  stickied: true,
                },
              },
              {
                data: {
                  id: 'real',
                  title: 'Real',
                  permalink: '/r/test/comments/real/s/',
                  subreddit: 'test',
                  stickied: false,
                },
              },
            ],
            after: null,
          },
        },
      });

      const posts = await fetchListing({
        subreddit: 'test',
        sort: 'hot',
        limit: 5,
        delayMs: 0,
      });

      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe('real');
    });
  });

  describe('fetchPost', () => {
    it('fetches post JSON without cookies by default', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 200, data: POST_JSON });

      const postData = await fetchPost(
        'https://www.reddit.com/r/test/comments/gallery1/slug/',
      );

      expect(postData?.id).toBe('gallery1');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.reddit.com/r/test/comments/gallery1/slug.json',
        expect.objectContaining({
          headers: expect.not.objectContaining({ Cookie: expect.any(String) }),
        }),
      );
    });

    it('includes Firefox cookies when authenticated fetch is requested', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 200, data: POST_JSON });

      await fetchPost('https://www.reddit.com/r/test/comments/gallery1/slug/', {
        useCookies: true,
        browser: 'firefox',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Cookie: 'reddit_session=abc' }),
        }),
      );
    });

    it('returns null on 429 without throwing', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 429, data: {} });

      const postData = await fetchPost('https://www.reddit.com/r/test/comments/x/slug/');

      expect(postData).toBeNull();
    });
  });
});
