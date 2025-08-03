import React from 'react';
import './App.css';
import { App as AppComponent, AppConfig } from './components/App';

// Extend Window interface to include our electronAPI
declare global {
  interface Window {
    electronAPI: {
      redditAuth: (...args: unknown[]) => Promise<unknown>;
      downloadContent: (...args: unknown[]) => Promise<unknown>;
      getSavedContent: (...args: unknown[]) => Promise<unknown>;
      selectDirectory: (...args: unknown[]) => Promise<unknown>;
      saveFile: (...args: unknown[]) => Promise<unknown>;
      onMainProcessMessage: (callback: (message: string) => void) => void;
      onDownloadProgress: (callback: (progress: unknown) => void) => void;
      onAuthStatus: (callback: (status: unknown) => void) => void;
    };
  }
}

// Default configuration
const defaultConfig: AppConfig = {
  auth: {
    clientId: process.env.REDDIT_CLIENT_ID || '',
    clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
    redirectUri: 'http://localhost:3000/auth/callback',
    scope: 'history read'
  },
  storage: {
    basePath: './downloads',
    organizeBySubreddit: true,
    organizeByAuthor: false,
    createSubfolders: true,
    generateHtmlFiles: true
  }
};

function App() {
  // Check if Reddit API credentials are configured
  if (!defaultConfig.auth.clientId || !defaultConfig.auth.clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Reddit API Credentials Required
            </h2>
            <p className="text-gray-600 mb-4">
              This app requires Reddit API credentials to function. Please set up your credentials to continue.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h3 className="font-medium text-gray-900 mb-2">Setup Instructions:</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Reddit App Preferences</a></li>
                <li>2. Click "Create App" or "Create Another App"</li>
                <li>3. Fill in the form:
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Name: "Reddit Media Saver"</li>
                    <li>• App type: "web app"</li>
                    <li>• Description: "Personal media saver"</li>
                    <li>• Redirect URI: "http://localhost:3000/auth/callback"</li>
                  </ul>
                </li>
                <li>4. Copy the client ID (under the app name)</li>
                <li>5. Copy the client secret (click "secret")</li>
                <li>6. Create a <code className="bg-gray-200 px-1 rounded">.env</code> file in the project root with:</li>
              </ol>
              <div className="bg-gray-800 text-green-400 p-3 rounded mt-2 text-xs font-mono">
                REDDIT_CLIENT_ID=your_client_id_here<br/>
                REDDIT_CLIENT_SECRET=your_client_secret_here
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              After setting up credentials, restart the development server.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AppComponent config={defaultConfig} />;
}

export default App;
