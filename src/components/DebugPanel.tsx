import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

interface DebugPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
}

interface SystemInfo {
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
  uptime: string;
  nodeVersion: string;
  platform: string;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'performance' | 'system' | 'database'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<Array<{ operation: string; duration: number; timestamp: number }>>([]);
  const [databaseStats, setDatabaseStats] = useState<any>(null);
  const [logLevel, setLogLevel] = useState<'error' | 'warn' | 'info' | 'debug'>('debug');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isVisible) return;

    const updateSystemInfo = () => {
      if (typeof process !== 'undefined') {
        const memUsage = process.memoryUsage();
        setSystemInfo({
          memory: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
          },
          uptime: `${Math.round(process.uptime())}s`,
          nodeVersion: process.version,
          platform: process.platform
        });
      }
    };

    const updateLogs = async () => {
      try {
        const logFiles = await logger.getLogFiles();
        // In a real implementation, you'd read the actual log files
        // For now, we'll simulate log entries
        const mockLogs: LogEntry[] = [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Debug panel initialized',
            meta: { component: 'DebugPanel' }
          },
          {
            timestamp: new Date(Date.now() - 1000).toISOString(),
            level: 'debug',
            message: 'System info updated',
            meta: { operation: 'updateSystemInfo' }
          }
        ];
        setLogs(mockLogs);
      } catch (error) {
        console.error('Failed to load logs:', error);
      }
    };

    const updateDatabaseStats = async () => {
      try {
        // In a real implementation, you'd get actual database stats
        setDatabaseStats({
          totalContent: 1250,
          totalMedia: 890,
          totalTags: 45,
          databaseSize: '15.2 MB',
          lastBackup: new Date().toISOString(),
          searchHistoryCount: 67
        });
      } catch (error) {
        console.error('Failed to load database stats:', error);
      }
    };

    updateSystemInfo();
    updateLogs();
    updateDatabaseStats();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        updateSystemInfo();
        updateLogs();
        updateDatabaseStats();
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isVisible, autoRefresh]);

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      case 'debug': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getLogLevelBgColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100';
      case 'warn': return 'bg-yellow-100';
      case 'info': return 'bg-blue-100';
      case 'debug': return 'bg-gray-100';
      default: return 'bg-gray-100';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Debug Panel</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'logs', label: 'Logs' },
            { id: 'performance', label: 'Performance' },
            { id: 'system', label: 'System' },
            { id: 'database', label: 'Database' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <select
                    value={logLevel}
                    onChange={(e) => setLogLevel(e.target.value as any)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="mr-2"
                    />
                    Auto refresh
                  </label>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={clearLogs}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Clear
                  </button>
                  <button
                    onClick={exportLogs}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Export
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded p-4 h-96 overflow-auto">
                {logs.map((log, index) => (
                  <div key={index} className={`mb-2 p-2 rounded ${getLogLevelBgColor(log.level)}`}>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getLogLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm mt-1">{log.message}</div>
                    {log.meta && (
                      <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performanceMetrics.map((metric, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded">
                    <div className="font-medium">{metric.operation}</div>
                    <div className="text-2xl font-bold text-blue-600">{metric.duration}ms</div>
                    <div className="text-xs text-gray-500">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'system' && systemInfo && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium mb-2">Memory Usage</h4>
                  <div className="space-y-1 text-sm">
                    <div>RSS: {systemInfo.memory.rss}</div>
                    <div>Heap Total: {systemInfo.memory.heapTotal}</div>
                    <div>Heap Used: {systemInfo.memory.heapUsed}</div>
                    <div>External: {systemInfo.memory.external}</div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium mb-2">System Info</h4>
                  <div className="space-y-1 text-sm">
                    <div>Uptime: {systemInfo.uptime}</div>
                    <div>Node Version: {systemInfo.nodeVersion}</div>
                    <div>Platform: {systemInfo.platform}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && databaseStats && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Database Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="font-medium">Total Content</div>
                  <div className="text-2xl font-bold text-blue-600">{databaseStats.totalContent}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="font-medium">Total Media</div>
                  <div className="text-2xl font-bold text-green-600">{databaseStats.totalMedia}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="font-medium">Total Tags</div>
                  <div className="text-2xl font-bold text-purple-600">{databaseStats.totalTags}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="font-medium">Database Size</div>
                  <div className="text-2xl font-bold text-orange-600">{databaseStats.databaseSize}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="font-medium">Search History</div>
                  <div className="text-2xl font-bold text-red-600">{databaseStats.searchHistoryCount}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="font-medium">Last Backup</div>
                  <div className="text-sm text-gray-600">
                    {new Date(databaseStats.lastBackup).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 