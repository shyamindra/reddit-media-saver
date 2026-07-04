function decodeRedditUrl(url: string): string {
  return url.replace(/&amp;/g, '&');
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|gifv|m3u8|mpd)(\?|$)/i.test(url) || /v\.redd\.it/i.test(url);
}

function isImageMediaUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url) || /i\.redd\.it|preview\.redd\.it/i.test(url);
}

/**
 * Extract direct image URLs from a Reddit post listing child (post `.json` data).
 * Mirrors gallery handling from ContentDownloadService.extractAllMediaUrls.
 */
export function extractImageUrlsFromPostData(postData: Record<string, unknown>): string[] {
  const urls: string[] = [];

  const primaryUrl = typeof postData.url === 'string' ? postData.url : '';
  if (primaryUrl && isImageMediaUrl(primaryUrl) && !isVideoUrl(primaryUrl)) {
    urls.push(decodeRedditUrl(primaryUrl));
  }

  const preview = postData.preview as
    | { images?: Array<{ source?: { url?: string }; resolutions?: Array<{ url?: string }> }> }
    | undefined;

  if (preview?.images) {
    for (const image of preview.images) {
      if (image.source?.url && !isVideoUrl(image.source.url)) {
        urls.push(decodeRedditUrl(image.source.url));
      }
      if (image.resolutions?.length) {
        const highestRes = image.resolutions[image.resolutions.length - 1];
        if (highestRes?.url && !isVideoUrl(highestRes.url)) {
          urls.push(decodeRedditUrl(highestRes.url));
        }
      }
    }
  }

  const galleryData = postData.gallery_data as { items?: Array<{ media_id?: string }> } | undefined;
  const mediaMetadata = postData.media_metadata as
    | Record<string, { e?: string; s?: { u?: string } }>
    | undefined;

  if (galleryData?.items && mediaMetadata) {
    for (const item of galleryData.items) {
      if (!item.media_id) continue;
      const mediaInfo = mediaMetadata[item.media_id]?.s;
      if (mediaInfo?.u && !isVideoUrl(mediaInfo.u)) {
        urls.push(decodeRedditUrl(mediaInfo.u));
      }
    }
  }

  return [...new Set(urls)];
}

export function extractImageUrlsFromListingJson(listing: unknown): string[] {
  const entries = listing as Array<{
    data?: { children?: Array<{ data?: Record<string, unknown> }> };
  }>;
  const postData = entries?.[0]?.data?.children?.[0]?.data;
  if (!postData) return [];
  return extractImageUrlsFromPostData(postData);
}
