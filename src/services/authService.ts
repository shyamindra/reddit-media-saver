import { redditApi } from './redditApi';
import type { OAuthToken, AuthConfig, AuthState } from '../types/reddit';

export class AuthService {
  private config: AuthConfig | null = null;
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
    error: null,
  };
  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    // Load saved token on initialization
    this.loadSavedToken();
  }

  /**
   * Initialize authentication with Reddit OAuth2 configuration
   */
  public initialize(config: AuthConfig): void {
    this.config = config;
  }

  /**
   * Get current authentication state
   */
  public getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Subscribe to authentication state changes
   */
  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Start OAuth2 authentication flow
   */
  public async startAuth(): Promise<string> {
    if (!this.config) {
      throw new Error('Authentication not initialized. Call initialize() first.');
    }

    this.updateState({ isLoading: true, error: null });

    try {
      const authUrl = redditApi.getAuthorizationUrl(
        this.config.clientId,
        this.config.redirectUri,
        this.config.scope || 'history read'
      );

      this.updateState({ isLoading: false });
      return authUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start authentication';
      this.updateState({ isLoading: false, error: errorMessage });
      throw error;
    }
  }

  /**
   * Complete OAuth2 authentication with authorization code
   */
  public async completeAuth(code: string): Promise<void> {
    if (!this.config) {
      throw new Error('Authentication not initialized. Call initialize() first.');
    }

    this.updateState({ isLoading: true, error: null });

    try {
      // Exchange code for token
      const token = await redditApi.exchangeCodeForToken(
        this.config.clientId,
        this.config.clientSecret,
        code,
        this.config.redirectUri
      );

      // Get user information
      const user = await redditApi.getUserInfo();

      // Save token and user info
      this.saveToken(token);
      this.saveUser(user);

      this.updateState({
        isAuthenticated: true,
        user,
        token,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete authentication';
      this.updateState({ isLoading: false, error: errorMessage });
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  public async refreshAuth(): Promise<void> {
    if (!this.state.token) {
      throw new Error('No token available to refresh');
    }

    this.updateState({ isLoading: true, error: null });

    try {
      const token = await redditApi.refreshAccessToken();
      this.saveToken(token);
      
      this.updateState({
        token,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh token';
      this.updateState({ isLoading: false, error: errorMessage });
      
      // If refresh fails, clear authentication
      await this.logout();
      throw error;
    }
  }

  /**
   * Logout and clear authentication
   */
  public async logout(): Promise<void> {
    this.updateState({ isLoading: true });

    try {
      // Clear stored data
      this.clearStoredData();
      
      // Clear API tokens
      redditApi.setAccessToken('');
      redditApi.setRefreshToken('');

      this.updateState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout';
      this.updateState({ isLoading: false, error: errorMessage });
      throw error;
    }
  }

  /**
   * Check if user is authenticated and token is valid
   */
  public async checkAuth(): Promise<boolean> {
    if (!this.state.isAuthenticated || !this.state.token) {
      return false;
    }

    // Check if token is expired
    if (Date.now() >= this.state.token.expires_at) {
      try {
        await this.refreshAuth();
        return true;
      } catch (error) {
        await this.logout();
        return false;
      }
    }

    return true;
  }

  /**
   * Save token to secure storage
   */
  private saveToken(token: OAuthToken): void {
    try {
      // In a real app, you'd use a secure storage method
      // For now, we'll use localStorage (not recommended for production)
      localStorage.setItem('reddit_token', JSON.stringify(token));
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  /**
   * Load saved token from storage
   */
  private loadSavedToken(): void {
    try {
      const tokenData = localStorage.getItem('reddit_token');
      if (tokenData) {
        const token: OAuthToken = JSON.parse(tokenData);
        
        // Check if token is still valid
        if (Date.now() < token.expires_at) {
          redditApi.setAccessToken(token.access_token);
          if (token.refresh_token) {
            redditApi.setRefreshToken(token.refresh_token);
          }
          
          this.updateState({
            isAuthenticated: true,
            token,
            isLoading: false,
          });

          // Load user info
          this.loadUserInfo();
        } else {
          // Token expired, clear it
          this.clearStoredData();
        }
      }
    } catch (error) {
      console.error('Failed to load saved token:', error);
      this.clearStoredData();
    }
  }

  /**
   * Save user information
   */
  private saveUser(user: any): void {
    try {
      localStorage.setItem('reddit_user', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  }

  /**
   * Load user information
   */
  private async loadUserInfo(): Promise<void> {
    try {
      const userData = localStorage.getItem('reddit_user');
      if (userData) {
        const user = JSON.parse(userData);
        this.updateState({ user });
      } else {
        // Fetch user info from API
        const user = await redditApi.getUserInfo();
        this.saveUser(user);
        this.updateState({ user });
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  }

  /**
   * Clear all stored authentication data
   */
  private clearStoredData(): void {
    try {
      localStorage.removeItem('reddit_token');
      localStorage.removeItem('reddit_user');
    } catch (error) {
      console.error('Failed to clear stored data:', error);
    }
  }

  /**
   * Get current user information
   */
  public getUser(): any | null {
    return this.state.user;
  }

  /**
   * Get current token
   */
  public getToken(): OAuthToken | null {
    return this.state.token;
  }

  /**
   * Check if authentication is loading
   */
  public isLoading(): boolean {
    return this.state.isLoading;
  }

  /**
   * Get current error message
   */
  public getError(): string | null {
    return this.state.error;
  }
}

// Re-export types for backward compatibility
export type { AuthConfig, AuthState } from '../types/reddit';

// Export singleton instance
export const authService = new AuthService(); 