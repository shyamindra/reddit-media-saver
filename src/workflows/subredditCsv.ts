import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { LinkBatchItem } from '../download/types';

export interface SubredditPost {
  url: string;
  title: string;
}

export function formatSubredditCsv(posts: SubredditPost[]): string {
  const lines = ['key,url,title'];
  posts.forEach((post, i) => {
    const key = `top${String(i + 1).padStart(3, '0')}`;
    const escapedTitle = post.title.replace(/"/g, '""');
    lines.push(`${key},${post.url},"${escapedTitle}"`);
  });
  return lines.join('\n') + '\n';
}

export function writeSubredditCsv(posts: SubredditPost[], outputPath: string): void {
  const dir = join(process.cwd(), outputPath).replace(/\/[^/]+$/, '');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(process.cwd(), outputPath), formatSubredditCsv(posts), 'utf8');
}

export function postsToLinkBatch(posts: SubredditPost[]): LinkBatchItem[] {
  return posts.map((post) => ({ url: post.url, type: 'post' }));
}
