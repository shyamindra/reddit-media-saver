import type { ResolvePostMediaContext, ResolvedMedia, ResolvedMediaType } from './types';

function decodeRedditUrl(url: string): string {
  return url.replace(/&amp;/g, '&');
}

function isStreamUrl(url: string): boolean {
  return /\.(m3u8|mpd)(\?|$)/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return (
    /\.(mp4|webm|mov|gifv)(\?|$)/i.test(url) ||
    /v\.redd\.it|redgifs\.com/i.test(url) ||
    isStreamUrl(url)
  );
}

function isGifUrl(url: string): boolean {
  return /\.gif(\?|$)/i.test(url) || /gfycat\.com/i.test(url);
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp)(\?|$)/i.test(url) || /i\.redd\.it|preview\.redd\.it/i.test(url);
}

function mediaTypeForUrl(url: string): ResolvedMediaType | null {
  if (isStreamUrl(url)) return 'stream';
  if (isVideoUrl(url)) return isGifUrl(url) ? 'gif' : 'video';
  if (isImageUrl(url)) return 'image';
  return null;
}

function withContext(
  item: Omit<ResolvedMedia, 'title' | 'subreddit' | 'postId' | 'sourceUrl'>,
  context?: ResolvePostMediaContext,
): ResolvedMedia {
  return {
    ...item,
    title: context?.title,
    subreddit: context?.subreddit,
    postId: context?.postId,
    sourceUrl: context?.sourceUrl,
  };
}

function addCandidate(
  candidates: ResolvedMedia[],
  url: string,
  mediaType: ResolvedMediaType,
  quality: string | undefined,
  context?: ResolvePostMediaContext,
): void {
  const decoded = decodeRedditUrl(url);
  const resolvedType = mediaTypeForUrl(decoded) ?? mediaType;
  candidates.push(withContext({ url: decoded, mediaType: resolvedType, quality }, context));
}

function extractRedditHostedVideo(
  postData: Record<string, unknown>,
  context?: ResolvePostMediaContext,
): ResolvedMedia[] {
  const results: ResolvedMedia[] = [];
  const media = (postData.media ?? postData.secure_media) as
    | { reddit_video?: { fallback_url?: string; dash_url?: string; hls_url?: string } }
    | undefined;

  const redditVideo = media?.reddit_video;
  if (!redditVideo) return results;

  if (redditVideo.fallback_url) {
    addCandidate(results, redditVideo.fallback_url, 'video', 'fallback', context);
  } else if (redditVideo.dash_url) {
    addCandidate(results, redditVideo.dash_url, 'stream', 'dash', context);
  } else if (redditVideo.hls_url) {
    addCandidate(results, redditVideo.hls_url, 'stream', 'hls', context);
  }

  return results;
}

function extractPreviewImages(
  postData: Record<string, unknown>,
  context?: ResolvePostMediaContext,
): ResolvedMedia[] {
  const results: ResolvedMedia[] = [];
  const preview = postData.preview as
    | { images?: Array<{ source?: { url?: string }; resolutions?: Array<{ url?: string; width?: number }> }> }
    | undefined;

  for (const image of preview?.images ?? []) {
    const highestRes = image.resolutions?.[image.resolutions.length - 1];
    if (highestRes?.url && !isVideoUrl(highestRes.url)) {
      addCandidate(
        results,
        highestRes.url,
        'image',
        highestRes.width ? `${highestRes.width}w` : 'preview',
        context,
      );
      continue;
    }

    if (image.source?.url && !isVideoUrl(image.source.url)) {
      addCandidate(results, image.source.url, 'image', 'source', context);
    }
  }

  return results;
}

function extractGalleryItems(
  postData: Record<string, unknown>,
  context?: ResolvePostMediaContext,
): ResolvedMedia[] {
  const results: ResolvedMedia[] = [];
  const galleryData = postData.gallery_data as { items?: Array<{ media_id?: string }> } | undefined;
  const mediaMetadata = postData.media_metadata as
    | Record<string, { e?: string; s?: { u?: string }; hlsUrl?: string; dashUrl?: string }>
    | undefined;

  for (const item of galleryData?.items ?? []) {
    if (!item.media_id || !mediaMetadata?.[item.media_id]) continue;
    const metadata = mediaMetadata[item.media_id];

    if (metadata.e === 'RedditVideo') {
      if (metadata.s?.u) {
        addCandidate(results, metadata.s.u, 'video', 'gallery', context);
      } else if (metadata.hlsUrl) {
        addCandidate(results, metadata.hlsUrl, 'stream', 'gallery-hls', context);
      } else if (metadata.dashUrl) {
        addCandidate(results, metadata.dashUrl, 'stream', 'gallery-dash', context);
      }
      continue;
    }

    if (metadata.s?.u && !isVideoUrl(metadata.s.u)) {
      addCandidate(results, metadata.s.u, 'image', 'gallery', context);
    }
  }

  return results;
}

function extractPrimaryUrl(
  postData: Record<string, unknown>,
  context?: ResolvePostMediaContext,
): ResolvedMedia[] {
  const primaryUrl = typeof postData.url === 'string' ? postData.url : '';
  if (!primaryUrl || primaryUrl.startsWith('https://www.reddit.com')) return [];

  const mediaType = mediaTypeForUrl(primaryUrl);
  if (!mediaType) return [];

  return [withContext({ url: decodeRedditUrl(primaryUrl), mediaType, quality: 'primary' }, context)];
}

function extractEmbeddedUrls(
  postData: Record<string, unknown>,
  context?: ResolvePostMediaContext,
): ResolvedMedia[] {
  const selftext = typeof postData.selftext === 'string' ? postData.selftext : '';
  if (!selftext) return [];

  const results: ResolvedMedia[] = [];
  const matches = selftext.match(/https?:\/\/[^\s)]+\.(mp4|webm|mov)/gi) ?? [];

  for (const url of matches) {
    addCandidate(results, url, 'video', 'embedded', context);
  }

  return results;
}

function dedupeResolvedMedia(items: ResolvedMedia[]): ResolvedMedia[] {
  const seen = new Set<string>();
  const deduped: ResolvedMedia[] = [];

  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    deduped.push(item);
  }

  return deduped;
}

/**
 * Resolve concrete download targets from Reddit post JSON data.
 */
export function resolvePostMedia(
  postData: Record<string, unknown>,
  context?: ResolvePostMediaContext,
): ResolvedMedia[] {
  const candidates: ResolvedMedia[] = [
    ...extractRedditHostedVideo(postData, context),
    ...extractPrimaryUrl(postData, context),
    ...extractGalleryItems(postData, context),
    ...extractPreviewImages(postData, context),
    ...extractEmbeddedUrls(postData, context),
  ];

  const videos = dedupeResolvedMedia(
    candidates.filter((item) => item.mediaType === 'video' || item.mediaType === 'stream'),
  );
  const images = dedupeResolvedMedia(
    candidates.filter((item) => item.mediaType === 'image' || item.mediaType === 'gif'),
  );

  return [...videos, ...images];
}

export function resolvedDirectDownloads(media: ResolvedMedia[]): ResolvedMedia[] {
  return media.filter((item) => item.mediaType !== 'stream');
}
