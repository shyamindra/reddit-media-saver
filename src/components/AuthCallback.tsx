import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import type { AuthConfig } from '../types/reddit';
import { loadAppConfig } from '../config/appConfig';

export const AuthCallback: React.FC = () => {
  console.log('🎯 AuthCallback component rendered');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 AuthCallback component mounted');
        console.log('📍 Current URL:', window.location.href);
        console.log('🔍 Window opener:', window.opener ? 'exists' : 'none');
        console.log('🔍 Window name:', window.name);
        
        // Initialize auth service with the same config as main app
        const appConfig = loadAppConfig();
        const authConfig: AuthConfig = {
          clientId: import.meta.env.VITE_REDDIT_CLIENT_ID || '',
          clientSecret: import.meta.env.VITE_REDDIT_CLIENT_SECRET || '',
          redirectUri: appConfig.auth.redirectUri,
          scope: appConfig.auth.scope
        };
        
        console.log('🔧 Initializing auth service with config:', authConfig);
        authService.initialize(authConfig);

        // Get the authorization code from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        console.log('🔍 URL Parameters:', {
          code: code ? 'present' : 'missing',
          error: error || 'none',
          state: state || 'none'
        });
        
        console.log('🔍 Full URL:', window.location.href);
        console.log('🔍 URL hash:', window.location.hash);

        if (error) {
          console.error('❌ OAuth error:', error);
          setError(`Authentication failed: ${error}`);
          setStatus('error');
          return;
        }

        if (!code) {
          console.error('❌ No authorization code received');
          setError('No authorization code received');
          setStatus('error');
          return;
        }

        // Complete the OAuth flow with the real Reddit API
        console.log('🔑 Auth code received:', code);
        
        // Complete authentication with Reddit API
        console.log('🔄 Completing authentication...');
        try {
          await authService.completeAuth(code);
          console.log('✅ Authentication completed successfully');
          console.log('🔒 Closing popup window...');
        } catch (error) {
          console.error('❌ Authentication completion failed:', error);
          console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          throw error; // Re-throw to show error in UI
        }
        
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