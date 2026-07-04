export function isHtmlContent(content: string): boolean {
  const sample = content.slice(0, 1024).toLowerCase();
  return (
    sample.includes('<!doctype html') ||
    sample.includes('<html') ||
    sample.includes('<head') ||
    sample.includes('<body') ||
    sample.includes('<title>') ||
    sample.includes('<meta') ||
    sample.includes('<script') ||
    sample.includes('<style>')
  );
}

export function extractVideoUrlsFromHtml(htmlContent: string): string[] {
  const decodedContent = htmlContent
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  const urls: string[] = [];

  const redgifsMeta = decodedContent.match(/<meta property="og:video" content="([^"]+)"/);
  if (redgifsMeta) urls.push(redgifsMeta[1]);

  const jsonLd = decodedContent.match(/"contentUrl":"([^"]+\.mp4)"/);
  if (jsonLd) urls.push(jsonLd[1]);

  for (const pattern of [
    /https:\/\/media\.redgifs\.com\/[a-zA-Z0-9_-]+\.mp4/g,
    /https:\/\/media\.redgifs\.com\/[a-zA-Z0-9_-]+-silent\.mp4/g,
    /https:\/\/v\.redd\.it\/[a-zA-Z0-9]+/g,
    /https:\/\/v\.redd\.it\/[a-zA-Z0-9]+\/DASH_96\.mp4/g,
    /https:\/\/packaged-media\.redd\.it\/[a-zA-Z0-9]+\/pb\/m2-res_[0-9]+p\.mp4\?[^"'\s]+/g,
    /https:\/\/[^"'\s]+\.(mp4|webm|mov|avi|mkv)/g,
  ]) {
    const matches = decodedContent.match(pattern);
    if (matches) {
      if (pattern.source.includes('packaged-media')) {
        urls.push(...matches.map((url) => url.split('&quot;')[0]));
      } else {
        urls.push(...matches);
      }
    }
  }

  return [...new Set(urls)];
}
