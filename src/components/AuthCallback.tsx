import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import type { AuthConfig } from '../types/reddit';

export const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Initialize auth service with the same config as main app
        const authConfig: AuthConfig = {
          clientId: import.meta.env.VITE_REDDIT_CLIENT_ID || '',
          clientSecret: import.meta.env.VITE_REDDIT_CLIENT_SECRET || '',
          redirectUri: 'http://localhost:5173/auth/callback',
          scope: 'history read'
        };
        
        authService.initialize(authConfig);

        // Get the authorization code from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          setError(`Authentication failed: ${error}`);
          setStatus('error');
          return;
        }

        if (!code) {
          setError('No authorization code received');
          setStatus('error');
          return;
        }

        // For browser testing, simulate successful authentication
        // In a real Electron app, this would use the Electron API
        console.log('Auth code received:', code);
        
        // Simulate successful authentication for testing
        const mockUser = {
          name: 'test_user',
          id: 'test_id',
          created_utc: Date.now() / 1000
        };
        
        const mockToken = {
          access_token: 'mock_access_token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock_refresh_token',
          scope: 'history read',
          expires_at: Date.now() + (3600 * 1000)
        };
        
        // Update auth service state with mock data
        authService.initialize({
          clientId: import.meta.env.VITE_REDDIT_CLIENT_ID || '',
          clientSecret: import.meta.env.VITE_REDDIT_CLIENT_SECRET || '',
          redirectUri: 'http://localhost:5173/auth/callback',
          scope: 'history read'
        });
        
        authService['saveToken'](mockToken);
        authService['saveUser'](mockUser);
        authService['updateState']({
          isAuthenticated: true,
          user: mockUser,
          token: mockToken,
          isLoading: false,
          error: null,
        });
        
        console.log('Mock authentication completed successfully');
        
        setStatus('success');
        
        // Close the popup window or redirect
        if (window.opener) {
          // This is a popup window, close it
          window.close();
        } else {
          // This is the main window, redirect to the main app
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleCallback();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.close()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Authentication Successful!
        </h2>
        <p className="text-gray-600">You can close this window now.</p>
      </div>
    </div>
  );
}; 