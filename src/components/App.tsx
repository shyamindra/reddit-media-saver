import React, { useState, useEffect } from 'react';
import { Auth } from './Auth';
import { DownloadManager } from './DownloadManager';
import { ContentBrowser } from './ContentBrowser';
import { SettingsPanel } from './SettingsPanel';
import { DebugPanel } from './DebugPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { authService } from '../services/authService';
import type { AuthConfig } from '../types/reddit';
import { contentService } from '../services/contentService';
import { StorageService } from '../services/storageService';
import type { StorageConfig, AppConfig } from '../types';
import { databaseManager } from '../services/databaseService';
import { logger } from '../utils/logger';
import type { AuthState } from '../types/reddit';
import type { ContentItem } from '../types';

interface AppProps {
  config: AppConfig;
}

type AppView = 'auth' | 'content' | 'downloads' | 'settings';

export const App: React.FC<AppProps> = ({ config }) => {
  const [currentView, setCurrentView] = useState<AppView>('auth');
  const [authState, setAuthState] = useState<AuthState>(authService.getState());
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    console.log('App component initializing with config:', config);
    
    try {
      // Initialize services
      authService.initialize(config.auth);
      console.log('Auth service initialized');
      
      const storage = new StorageService(config.storage);
      storage.initialize();
      console.log('Storage service initialized');

      // Initialize database
      databaseManager.initialize().catch(error => {
        logger.logError(error, 'App initialization');
        console.error('Failed to initialize database:', error);
        setError('Failed to initialize database');
      });

      // Subscribe to auth state changes
      const unsubscribe = authService.subscribe((state) => {
        console.log('Auth state changed:', state);
        setAuthState(state);
        if (state.isAuthenticated && currentView === 'auth') {
          setCurrentView('content');
        }
      });

      // Log app initialization
      logger.info('App initialized successfully', { config: { auth: !!config.auth, storage: !!config.storage } });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error during app initialization:', error);
      setError('Failed to initialize app');
    }
  }, [config]);

  const handleAuthSuccess = async (user: any) => {
    try {
      console.log('🔄 Starting content fetch for user:', user.name);
      setIsLoading(true);
      setError(null);
      
      // Fetch saved content
      console.log('📡 Fetching saved content...');
      const result = await contentService.fetchAllSavedContent(user.name, { limit: 50 });
      console.log('✅ Content fetched successfully:', result.items.length, 'items');
      setContentItems(result.items);
      
      // Save content to database
      console.log('💾 Saving content to database...');
      for (const item of result.items) {
        await databaseManager.saveContent(item);
      }
      console.log('✅ Content saved to database');
      
      console.log('🔄 Switching to content view');
      setCurrentView('content');
    } catch (err) {
      console.error('❌ Failed to fetch content:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (error: string) => {
    setError(error);
  };

  const handleDownloadComplete = (itemId: string, success: boolean) => {
    if (success) {
      // Update content items to reflect download status
      setContentItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, downloaded: true }
            : item
        )
      );
    }
  };

  const renderNavigation = () => {
    if (!authState.isAuthenticated) return null;

    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Reddit Media Saver</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setCurrentView('content')}
                  className={`${
                    currentView === 'content'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Content
                </button>
                <button
                  onClick={() => setCurrentView('downloads')}
                  className={`${
                    currentView === 'downloads'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Downloads
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`${
                    currentView === 'settings'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Settings
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-sm text-gray-500">
                  {authState.user?.name}
                </span>
              </div>
              <div className="ml-4 flex items-center space-x-2">
                {import.meta.env.DEV && (
                  <button
                    onClick={() => setShowDebugPanel(true)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border"
                    title="Debug Panel"
                  >
                    🐛
                  </button>
                )}
                <button
                  onClick={() => authService.logout()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  };

  const renderContent = () => {
    console.log('🎯 Rendering content - View:', currentView, 'Items:', contentItems.length, 'Loading:', isLoading, 'Error:', error);
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setError(null)}
                    className="bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'auth':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Auth
              config={config.auth}
              onAuthSuccess={handleAuthSuccess}
              onAuthError={handleAuthError}
            />
          </div>
        );

      case 'content':
        console.log('📱 Rendering ContentBrowser with', contentItems.length, 'items');
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ContentBrowser
              items={contentItems}
              onDownloadRequest={(items) => {
                setCurrentView('downloads');
                // Pass items to download manager
              }}
            />
          </div>
        );

      case 'downloads':
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <DownloadManager
              items={contentItems}
              onDownloadComplete={handleDownloadComplete}
            />
          </div>
        );

      case 'settings':
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SettingsPanel config={config} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {renderNavigation()}
        {renderContent()}
        <DebugPanel
          isVisible={showDebugPanel}
          onClose={() => setShowDebugPanel(false)}
        />
      </div>
    </ErrorBoundary>
  );
}; 