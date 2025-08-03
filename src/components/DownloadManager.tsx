import React, { useState, useEffect } from 'react';
import type { ContentItem, DownloadProgress } from '../types';
import { downloadService } from '../services/downloadService';

interface DownloadManagerProps {
  items: ContentItem[];
  onDownloadComplete?: (itemId: string, success: boolean) => void;
}

export const DownloadManager: React.FC<DownloadManagerProps> = ({ items, onDownloadComplete }) => {
  const [downloadProgress, setDownloadProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadQueue, setDownloadQueue] = useState<ContentItem[]>([]);

  useEffect(() => {
    const progressMap = new Map<string, DownloadProgress>();
    items.forEach(item => {
      if (item.media && item.media.type !== 'text' && item.media.type !== 'link') {
        progressMap.set(item.id, {
          itemId: item.id,
          status: 'pending',
          progress: 0,
        });
      }
    });
    setDownloadProgress(progressMap);
  }, [items]);

  const updateProgress = (itemId: string, progress: DownloadProgress) => {
    setDownloadProgress(prev => new Map(prev).set(itemId, progress));
  };

  const startDownload = async (item: ContentItem) => {
    if (!item.media?.url) return;

    updateProgress(item.id, {
      itemId: item.id,
      status: 'downloading',
      progress: 0,
      startTime: Date.now(),
    });

    try {
      const result = await downloadService.downloadMedia(item);
      
      if (result.success) {
        updateProgress(item.id, {
          itemId: item.id,
          status: 'completed',
          progress: 100,
          endTime: Date.now(),
        });
        onDownloadComplete?.(item.id, true);
      } else {
        updateProgress(item.id, {
          itemId: item.id,
          status: 'failed',
          progress: 0,
          error: result.error,
          endTime: Date.now(),
        });
      }
    } catch (error) {
      updateProgress(item.id, {
        itemId: item.id,
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Download failed',
        endTime: Date.now(),
      });
    }
  };

  const downloadAll = () => {
    const mediaItems = items.filter(item => 
      item.media && item.media.type !== 'text' && item.media.type !== 'link'
    );
    setDownloadQueue(mediaItems);
    setIsDownloading(true);
    
    // Process downloads sequentially
    mediaItems.forEach(async (item, index) => {
      setTimeout(() => startDownload(item), index * 1000);
    });
  };

  const cancelAll = () => {
    downloadService.cancelAllDownloads();
    setDownloadQueue([]);
    setIsDownloading(false);
  };

  const getStats = () => {
    const total = downloadProgress.size;
    const completed = Array.from(downloadProgress.values()).filter(p => p.status === 'completed').length;
    const failed = Array.from(downloadProgress.values()).filter(p => p.status === 'failed').length;
    const downloading = Array.from(downloadProgress.values()).filter(p => p.status === 'downloading').length;
    return { total, completed, failed, downloading };
  };

  const stats = getStats();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Download Manager</h2>
        <div className="flex space-x-2">
          <button
            onClick={downloadAll}
            disabled={isDownloading || stats.total === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Download All
          </button>
          <button
            onClick={cancelAll}
            disabled={!isDownloading}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.downloading}</div>
          <div className="text-sm text-gray-600">Downloading</div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {Array.from(downloadProgress.entries()).map(([itemId, progress]) => {
          const item = items.find(i => i.id === itemId);
          if (!item) return null;

          return (
            <div key={itemId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 truncate">{item.title}</div>
                  <div className="text-sm text-gray-600">{item.media?.type} • {item.subreddit}</div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  progress.status === 'completed' ? 'bg-green-100 text-green-800' :
                  progress.status === 'failed' ? 'bg-red-100 text-red-800' :
                  progress.status === 'downloading' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {progress.status}
                </span>
              </div>
              
              {progress.status === 'downloading' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  ></div>
                </div>
              )}
              
              {progress.error && (
                <div className="mt-2 text-sm text-red-600">{progress.error}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DownloadManager; 