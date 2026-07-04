import { fetchPost } from '../services/redditFetchService';
import type { RedditFetchOptions } from '../services/redditFetchService';
import { resolvePostMedia } from './resolvePostMedia';
import type { ResolvedMedia, ResolvePostMediaContext } from './types';

export interface ResolveFromPostUrlOptions extends RedditFetchOptions {
  context?: ResolvePostMediaContext;
}

export async function resolveMediaFromPostUrl(
  postUrl: string,
  options: ResolveFromPostUrlOptions = {},
): Promise<ResolvedMedia[]> {
  const postData = await fetchPost(postUrl, options);
  if (!postData) return [];

  const context: ResolvePostMediaContext = {
    sourceUrl: postUrl,
    title: typeof postData.title === 'string' ? postData.title : options.context?.title,
    subreddit:
      typeof postData.subreddit === 'string' ? postData.subreddit : options.context?.subreddit,
    postId: typeof postData.id === 'string' ? postData.id : options.context?.postId,
    ...options.context,
  };

  return resolvePostMedia(postData, context);
}
