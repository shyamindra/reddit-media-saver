import { extractVideoUrlsFromHtml } from '../repair/htmlContent';

const GFYCAT_PATTERN = /^https?:\/\/(?:www\.)?gfycat\.com\/([a-zA-Z0-9_-]+)/i;

export function rewriteGfycatToRedgifs(url: string): string | null {
  const match = url.match(GFYCAT_PATTERN);
  if (!match) return null;
  return `https://www.redgifs.com/watch/${match[1]}`;
}

export function normalizeExternalMediaUrl(url: string): string {
  return rewriteGfycatToRedgifs(url) ?? url;
}

export function isRedgifsWatchUrl(url: string): boolean {
  return /redgifs\.com\/watch\//i.test(url);
}

export function pickDirectRedgifsMp4(html: string): string | null {
  const urls = extractVideoUrlsFromHtml(html);
  return urls.find((candidate) => candidate.includes('media.redgifs.com')) ?? null;
}

export async function resolveDirectMediaUrl(
  url: string,
  fetchHtml: (targetUrl: string) => Promise<string> = defaultFetchHtml,
): Promise<string> {
  const normalized = normalizeExternalMediaUrl(url);

  if (isRedgifsWatchUrl(normalized)) {
    const html = await fetchHtml(normalized);
    const direct = pickDirectRedgifsMp4(html);
    if (!direct) {
      throw new Error(`No direct Redgifs MP4 found for ${normalized}`);
    }
    return direct;
  }

  return normalized;
}

async function defaultFetchHtml(targetUrl: string): Promise<string> {
  const axios = (await import('axios')).default;
  const response = await axios.get<string>(targetUrl, {
    responseType: 'text',
    timeout: 30_000,
    validateStatus: (status) => status < 500,
  });
  if (response.status !== 200) {
    throw new Error(`Failed to fetch ${targetUrl}: HTTP ${response.status}`);
  }
  return response.data;
}
