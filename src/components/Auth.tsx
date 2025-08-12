import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import type { AuthConfig } from '../types/reddit';

interface AuthProps {
  config: AuthConfig;
  onAuthSuccess?: (user: any) => void;
  onAuthError?: (error: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ config, onAuthSuccess, onAuthError }) => {
  const [authState, setAuthState] = useState(authService.getState());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize auth service
    authService.initialize(config);
    setIsInitialized(true);

    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((state) => {
      setAuthState(state);
      
      if (state.isAuthenticated && state.user && onAuthSuccess) {
        onAuthSuccess(state.user);
      }
      
      if (state.error && onAuthError) {
        onAuthError(state.error);
      }
    });

    return () => unsubscribe();
  }, [config, onAuthSuccess, onAuthError]);

  const handleLogin = async () => {
    try {
      // Clear any cached authentication data
      console.log('🧹 Clearing cached auth data...');
      localStorage.removeItem('reddit_token');
      localStorage.removeItem('reddit_user');
      
      console.log('🚀 Starting Reddit OAuth...');
      const authUrl = await authService.startAuth();
      console.log('🔗 Auth URL:', authUrl);
      console.log('🔍 Auth URL type:', typeof authUrl);
      console.log('🔍 Auth URL length:', authUrl.length);
      
      // Open Reddit OAuth page in a new window
      const popup = window.open(authUrl, 'reddit-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
      
      if (!popup) {
        console.error('❌ Failed to open popup - popup blocked');
        return;
      }
      
      console.log('📱 Popup opened successfully');
      console.log('🔗 OAuth URL opened:', authUrl);
      
      // Check if popup is still open after a short delay
      setTimeout(() => {
        if (popup.closed) {
          console.error('❌ Popup closed immediately - this indicates an issue with the OAuth URL');
        } else {
          console.log('✅ Popup is still open - user should be able to complete login');
        }
      }, 2000);
      
      // Add event listener to detect when popup closes
      const checkClosed = setInterval(() => {
        if (popup && popup.closed) {
          console.log('🔒 Popup closed, checking auth state...');
          clearInterval(checkClosed);
          
          // Wait a moment for any async operations to complete
          setTimeout(() => {
            // Check if authentication was successful
            const currentState = authService.getState();
            console.log('📊 Current auth state:', currentState);
            
            if (currentState.isAuthenticated) {
              console.log('✅ Authentication successful!');
            } else {
              console.log('❌ Authentication failed or cancelled');
              console.log('🔍 Checking if popup was blocked or closed too quickly...');
              
              // Try to detect if popup was blocked
              try {
                const testPopup = window.open('about:blank', 'test', 'width=100,height=100');
                if (!testPopup) {
                  console.error('❌ Popup blocked by browser - please allow popups for this site');
                } else {
                  testPopup.close();
                  console.log('✅ Popups are allowed - the issue is likely with the OAuth flow');
                }
              } catch (e) {
                console.error('❌ Error testing popup:', e);
              }
            }
          }, 1000); // Increased timeout to 1 second
        }
      }, 500); // Check more frequently
      
    } catch (error) {
      console.error('Failed to start authentication:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await authService.refreshAuth();
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (authState.isAuthenticated && authState.user) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {authState.user.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome, {authState.user.name}!
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Connected to Reddit
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Token Status</p>
                <p className="text-xs text-gray-500">Click to re-authenticate</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800 px-3 py-1 rounded border border-red-200 hover:border-red-300"
              >
                Re-authenticate
              </button>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Account Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p>Karma: {authState.user.total_karma || 0}</p>
              <p>Account Age: {authState.user.created_utc ? 
                Math.floor((Date.now() / 1000 - authState.user.created_utc) / 86400) + ' days' : 
                'Unknown'
              }</p>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Refresh Token
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {authState.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{authState.error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Connect to Reddit
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Sign in to access your saved content
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                What we access
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Your saved posts and comments</li>
                  <li>Basic account information</li>
                  <li>Read-only access to your history</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={authState.isLoading}
          className="w-full bg-orange-600 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
          </svg>
          <span>Sign in with Reddit</span>
        </button>

        {authState.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{authState.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth; 