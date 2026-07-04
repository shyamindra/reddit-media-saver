import { resolveMediaFromPostUrl } from '../linkResolution/resolveFromPostUrl';
import { resolvedDirectDownloads } from '../linkResolution/resolvePostMedia';
import { createAxiosJsonStrategy } from './axiosJsonStrategy';

jest.mock('../linkResolution/resolveFromPostUrl');
jest.mock('../download/directMediaDownload', () => ({
  downloadDirectMediaUrl: jest.fn(async (url: string) => `/downloads/Media/${url.split('/').pop()}`),
}));

const mockedResolve = resolveMediaFromPostUrl as jest.MockedFunction<typeof resolveMediaFromPostUrl>;

describe('axiosJsonStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('downloads resolved direct media URLs from post JSON', async () => {
    mockedResolve.mockResolvedValueOnce([
      {
        url: 'https://i.redd.it/photo.jpg',
        mediaType: 'image',
        quality: 'gallery',
      },
    ]);

    const strategy = createAxiosJsonStrategy({ browser: 'firefox' });
    const result = await strategy.downloadUrl(
      'https://www.reddit.com/r/test/comments/abc/slug/',
      'post',
    );

    expect(result.success).toBe(true);
    expect(mockedResolve).toHaveBeenCalledWith(
      'https://www.reddit.com/r/test/comments/abc/slug/',
      expect.objectContaining({ useCookies: true, browser: 'firefox' }),
    );
  });

  it('returns failure when no media is resolved', async () => {
    mockedResolve.mockResolvedValueOnce([]);

    const strategy = createAxiosJsonStrategy({ browser: 'firefox' });
    const result = await strategy.downloadUrl(
      'https://www.reddit.com/r/test/comments/empty/slug/',
      'post',
    );

    expect(result.success).toBe(false);
  });
});
