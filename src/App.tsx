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
    scopes: ['history', 'read'],
    userAgent: 'RedditSaverApp/1.0.0'
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
  return <AppComponent config={defaultConfig} />;
}

export default App;
