export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  url: string;
  permalink: string;
  created_utc: number;
  saved: boolean;
  is_video: boolean;
  is_self: boolean;
  selftext?: string;
  media?: {
    reddit_video?: {
      fallback_url: string;
    };
  };
  preview?: {
    images: Array<{
      source: {
        url: string;
        width: number;
        height: number;
      };
      resolutions: Array<{
        url: string;
        width: number;
        height: number;
      }>;
    }>;
  };
  secure_media?: {
    reddit_video?: {
      fallback_url: string;
    };
  };
  post_hint?: string;
  domain: string;
  thumbnail: string;
  num_comments: number;
  score: number;
  upvote_ratio: number;
}

export interface RedditComment {
  id: string;
  body: string;
  subreddit: string;
  author: string;
  permalink: string;
  created_utc: number;
  saved: boolean;
  link_title: string;
  link_url: string;
  link_id: string;
  parent_id: string;
  score: number;
}

export interface RedditApiResponse<T> {
  data: {
    children: Array<{
      data: T;
      kind: string;
    }>;
    after: string | null;
    before: string | null;
  };
}

export interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  expires_at: number;
} 