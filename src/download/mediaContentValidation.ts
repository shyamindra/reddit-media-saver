import { isHtmlContent } from '../repair/htmlContent';

export function isHtmlMediaBuffer(data: Buffer): boolean {
  if (data.length === 0) return false;
  const sample = data.subarray(0, Math.min(512, data.length)).toString('utf8');
  return isHtmlContent(sample);
}

export function validateMediaBuffer(data: Buffer): void {
  if (isHtmlMediaBuffer(data)) {
    throw new Error('Refusing to save HTML response as media');
  }
}
