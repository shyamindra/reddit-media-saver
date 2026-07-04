export type ResolvedMediaType = 'image' | 'video' | 'gif' | 'stream';

export interface ResolvedMedia {
  url: string;
  mediaType: ResolvedMediaType;
  quality?: string;
  title?: string;
  subreddit?: string;
  postId?: string;
  sourceUrl?: string;
}

export interface ResolvePostMediaContext {
  title?: string;
  subreddit?: string;
  postId?: string;
  sourceUrl?: string;
}
