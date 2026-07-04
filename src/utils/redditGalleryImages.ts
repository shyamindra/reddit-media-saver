import { resolvePostMedia } from '../linkResolution/resolvePostMedia';

/** @deprecated Use linkResolution.resolvePostMedia — image URLs only helper */
export function extractImageUrlsFromPostData(postData: Record<string, unknown>): string[] {
  return resolvePostMedia(postData)
    .filter((item) => item.mediaType === 'image' || item.mediaType === 'gif')
    .map((item) => item.url);
}

export function extractImageUrlsFromListingJson(listing: unknown): string[] {
  const entries = listing as Array<{
    data?: { children?: Array<{ data?: Record<string, unknown> }> };
  }>;
  const postData = entries?.[0]?.data?.children?.[0]?.data;
  if (!postData) return [];
  return extractImageUrlsFromPostData(postData);
}
