export function extractPostId(url: string): string | null {
  const match = url.match(/\/comments\/([^/]+)/);
  return match ? match[1] : null;
}

export function extractSubredditFromUrl(url: string): string {
  const match = url.match(/\/r\/([^/]+)\//);
  return match?.[1] ?? 'unknown';
}

export function titleFromPostUrl(url: string): string {
  const match = url.match(/\/comments\/[^/]+\/([^/?]+)/);
  if (match?.[1] && match[1] !== 'comment') {
    return match[1].replace(/_/g, ' ');
  }
  return 'reddit_post';
}
