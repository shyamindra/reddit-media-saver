import React, { useState, useEffect } from 'react';
import type { AppConfig } from './App';
import { StorageConfig } from '../services/storageService';
import { MediaUtils } from '../utils/mediaUtils';

interface SettingsPanelProps {
  config: AppConfig;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config }) => {
  const [storageConfig, setStorageConfig] = useState<StorageConfig>(config.storage);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setStorageConfig(config.storage);
  }, [config.storage]);

  const handleStoragePathChange = async () => {
    if (window.electronAPI?.selectDirectory) {
      try {
        const result = await window.electronAPI.selectDirectory();
        if (result && typeof result === 'string') {
          setStorageConfig(prev => ({ ...prev, basePath: result }));
        }
      } catch (error) {
        console.error('Failed to select directory:', error);
      }
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // Here you would typically save the settings to a configuration file
      // or update the app's configuration
      console.log('Saving settings:', storageConfig);
      
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    setStorageConfig(config.storage);
    setMessage(null);
  };

  const formatFileSize = (bytes: number) => {
    return MediaUtils.formatFileSize(bytes);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure your Reddit Media Saver preferences</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Storage Settings */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Storage Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Location
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={storageConfig.basePath}
                onChange={(e) => setStorageConfig(prev => ({ ...prev, basePath: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Select storage directory..."
              />
              <button
                onClick={handleStoragePathChange}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Browse
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Choose where your downloaded content will be stored
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={storageConfig.organizeBySubreddit}
                  onChange={(e) => setStorageConfig(prev => ({ 
                    ...prev, 
                    organizeBySubreddit: e.target.checked 
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Organize by Subreddit
                </span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Create subfolders for each subreddit
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={storageConfig.organizeByAuthor}
                  onChange={(e) => setStorageConfig(prev => ({ 
                    ...prev, 
                    organizeByAuthor: e.target.checked 
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Organize by Author
                </span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Create subfolders for each author
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={storageConfig.createSubfolders}
                  onChange={(e) => setStorageConfig(prev => ({ 
                    ...prev, 
                    createSubfolders: e.target.checked 
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Create Subfolders
                </span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Automatically organize similar files into subfolders
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={storageConfig.generateHtmlFiles}
                  onChange={(e) => setStorageConfig(prev => ({ 
                    ...prev, 
                    generateHtmlFiles: e.target.checked 
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Generate HTML Files
                </span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Create HTML files for easy content viewing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Settings */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Download Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Concurrent Downloads
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3" selected>3</option>
              <option value="5">5</option>
              <option value="10">10</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Number of downloads to process simultaneously
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Download Timeout (seconds)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              defaultValue="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Maximum time to wait for a download to complete
            </p>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Skip Existing Files
              </span>
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Don't re-download files that already exist
            </p>
          </div>
        </div>
      </div>

      {/* Application Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Application Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Version</h3>
            <p className="text-sm text-gray-900">1.0.0</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Build Date</h3>
            <p className="text-sm text-gray-900">{new Date().toLocaleDateString()}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Platform</h3>
            <p className="text-sm text-gray-900">
              {navigator.platform} - {navigator.userAgent.includes('Electron') ? 'Electron' : 'Browser'}
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Storage Used</h3>
            <p className="text-sm text-gray-900">Calculating...</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleResetSettings}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Reset to Defaults
        </button>
        
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}; 