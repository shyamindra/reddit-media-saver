import { isRedgifsWatchUrl } from '../linkResolution/normalizeMediaUrl';
import type { ResolvedMedia, ResolvedMediaType } from '../linkResolution/types';
import type { YtdlpFailureKind } from '../utils/ytdlpFailure';
import { isDeadExternalHost, isDirectRedditMediaUrl } from '../utils/ytdlpFailure';

export function isRedditPreviewThumbnail(url: string): boolean {
  return /external-preview\.redd\.it/i.test(url);
}

export function isMotionMediaType(mediaType: ResolvedMediaType): boolean {
  return mediaType === 'video' || mediaType === 'gif';
}

export function isMotionMedia(item: ResolvedMedia): boolean {
  if (isMotionMediaType(item.mediaType)) return true;
  return /\.gif(\?|$)/i.test(item.url) && /i\.redd\.it/i.test(item.url);
}

export function shouldSkipJsonFallbackItem(
  item: ResolvedMedia,
  motionTargetFailed: boolean,
): boolean {
  if (!motionTargetFailed) return false;
  if (isRedditPreviewThumbnail(item.url)) return true;
  if (isRedgifsWatchUrl(item.url)) return true;
  return false;
}

export function jsonFallbackSucceeded(
  resolved: ResolvedMedia[],
  savedMotionCount: number,
  savedImageCount: number,
): boolean {
  const expectedMotion = resolved.filter(isMotionMedia);
  if (expectedMotion.length === 0) {
    return savedImageCount > 0;
  }
  return savedMotionCount > 0;
}

export function shouldSkipRedgifsInStderr(failureKind: YtdlpFailureKind): boolean {
  return failureKind === 'gone' || failureKind === 'dead_host';
}

export function filterStderrFallbackCandidates(
  candidates: string[],
  failureKind: YtdlpFailureKind,
  normalizeUrl: (url: string) => string,
): string[] {
  if (failureKind === 'redirect_loop') {
    return candidates.filter((candidate) => isDirectRedditMediaUrl(candidate));
  }

  const skipRedgifs = shouldSkipRedgifsInStderr(failureKind);

  return candidates.filter((candidate) => {
    if (isDeadExternalHost(candidate)) return false;
    const normalized = normalizeUrl(candidate);
    if (skipRedgifs && isRedgifsWatchUrl(normalized)) return false;
    return true;
  });
}
