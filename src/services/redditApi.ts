import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { RedditPost, RedditComment, RedditApiResponse, OAuthToken } from '../types/reddit';

// Reddit API Configuration
const REDDIT_API_BASE = import.meta.env.DEV ? '/api/reddit' : 'https://oauth.reddit.com';
const REDDIT_WWW_BASE = 'https://www.reddit.com';
const REDDIT_OAUTH_BASE = import.meta.env.DEV ? '/api/oauth' : 'https://www.reddit.com/api/v1';

// Reddit API Rate Limits
const RATE_LIMIT_REQUESTS = 60; // requests per window
const RATE_LIMIT_WINDOW = 60; // seconds

export class RedditApiService {
  private api: AxiosInstance;
  private wwwApi: AxiosInstance;
  private oauthApi: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private rateLimitRemaining: number = RATE_LIMIT_REQUESTS;
  private rateLimitReset: number = Date.now() + (RATE_LIMIT_WINDOW * 1000);

  constructor() {
    // Main API client for authenticated requests
    this.api = axios.create({
      baseURL: REDDIT_API_BASE,
      timeout: 30000,
      headers: {
        'User-Agent': 'RedditSaverApp/1.0.0 (by /u/your_username)',
      },
    });

    // WWW API client for unauthenticated requests
    this.wwwApi = axios.create({
      baseURL: REDDIT_WWW_BASE,
      timeout: 30000,
      headers: {
        'User-Agent': 'RedditSaverApp/1.0.0 (by /u/your_username)',
      },
    });

    // OAuth API client for authentication
    this.oauthApi = axios.create({
      baseURL: REDDIT_OAUTH_BASE,
      timeout: 30000,
      headers: {
        'User-Agent': 'RedditSaverApp/1.0.0 (by /u/your_username)',
      },
    });

    // Add response interceptor for rate limiting
    this.api.interceptors.response.use(
      (response) => {
        this.handleRateLimitHeaders(response);
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          return this.refreshAccessToken().then(() => {
            // Retry the original request
            const config = error.config;
            config.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.api.request(config);
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Handle rate limit headers from Reddit API responses
   */
  private handleRateLimitHeaders(response: AxiosResponse): void {
    const remaining = response.headers['x-ratelimit-remaining'];
    const reset = response.headers['x-ratelimit-reset'];

    if (remaining !== undefined) {
      this.rateLimitRemaining = parseInt(remaining, 10);
    }

    if (reset !== undefined) {
      this.rateLimitReset = parseInt(reset, 10) * 1000;
    }
  }

  /**
   * Check if we're within rate limits
   */
  private async checkRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 0) {
      const waitTime = Math.max(0, this.rateLimitReset - Date.now());
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.rateLimitRemaining = RATE_LIMIT_REQUESTS;
    }
  }

  /**
   * Set access token for authenticated requests
   */
  public setAccessToken(token: string): void {
    this.accessToken = token;
    this.api.defaults.headers.Authorization = `Bearer ${token}`;
  }

  /**
   * Set refresh token for token renewal
   */
  public setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  /**
   * Check if current token is valid
   */
  public isTokenValid(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiresAt;
  }

  /**
   * Get OAuth authorization URL for user to visit
   */
  public getAuthorizationUrl(clientId: string, redirectUri: string, scope: string = 'history read'): string {
    const state = this.generateRandomState();
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      state: state,
      redirect_uri: redirectUri,
      duration: 'permanent',
      scope: scope,
    });

    return `${REDDIT_OAUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  public async exchangeCodeForToken(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
  ): Promise<OAuthToken> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    });

    const response = await this.oauthApi.post('/access_token', params, {
      auth: {
        username: clientId,
        password: clientSecret,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const tokenData = response.data;
    const token: OAuthToken = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
    };

    this.setAccessToken(token.access_token);
    if (token.refresh_token) {
      this.setRefreshToken(token.refresh_token);
    }
    this.tokenExpiresAt = token.expires_at;

    return token;
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(): Promise<OAuthToken> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    });

    const response = await this.oauthApi.post('/access_token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const tokenData = response.data;
    const token: OAuthToken = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
    };

    this.setAccessToken(token.access_token);
    this.tokenExpiresAt = token.expires_at;

    return token;
  }

  /**
   * Get user's saved posts with pagination
   */
  public async getSavedPosts(
    username: string,
    limit: number = 25,
    after?: string,
    before?: string
  ): Promise<RedditApiResponse<RedditPost>> {
    await this.checkRateLimit();

    const params: Record<string, string> = {
      limit: limit.toString(),
    };

    if (after) params.after = after;
    if (before) params.before = before;

    const response = await this.api.get(`/user/${username}/saved`, { params });
    return response.data;
  }

  /**
   * Get user's saved comments with pagination
   */
  public async getSavedComments(
    username: string,
    limit: number = 25,
    after?: string,
    before?: string
  ): Promise<RedditApiResponse<RedditComment>> {
    await this.checkRateLimit();

    const params: Record<string, string> = {
      limit: limit.toString(),
    };

    if (after) params.after = after;
    if (before) params.before = before;

    const response = await this.api.get(`/user/${username}/saved`, { params });
    return response.data;
  }

  /**
   * Get user information
   */
  public async getUserInfo(): Promise<any> {
    await this.checkRateLimit();
    const response = await this.api.get('/api/v1/me');
    return response.data;
  }

  /**
   * Get subreddit information
   */
  public async getSubredditInfo(subreddit: string): Promise<any> {
    await this.checkRateLimit();
    const response = await this.wwwApi.get(`/r/${subreddit}/about.json`);
    return response.data;
  }

  /**
   * Get post information by ID
   */
  public async getPostInfo(postId: string): Promise<any> {
    await this.checkRateLimit();
    const response = await this.api.get(`/comments/${postId}.json`);
    return response.data;
  }

  /**
   * Generate random state for OAuth security
   */
  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(): { remaining: number; reset: number } {
    return {
      remaining: this.rateLimitRemaining,
      reset: this.rateLimitReset,
    };
  }
}

// Re-export types for backward compatibility
export type { RedditPost, RedditComment, RedditApiResponse, OAuthToken } from '../types/reddit';

// Export singleton instance
export const redditApi = new RedditApiService(); 