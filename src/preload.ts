import { contextBridge, ipcRenderer } from 'electron';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  // Reddit API operations
  redditAuth: (...args: unknown[]) =>
    ipcRenderer.invoke('reddit-auth', ...args),
  downloadContent: (...args: unknown[]) =>
    ipcRenderer.invoke('download-content', ...args),
  getSavedContent: (...args: unknown[]) =>
    ipcRenderer.invoke('get-saved-content', ...args),

  // File system operations
  selectDirectory: (...args: unknown[]) =>
    ipcRenderer.invoke('select-directory', ...args),
  saveFile: (...args: unknown[]) => ipcRenderer.invoke('save-file', ...args),

  // App lifecycle
  onMainProcessMessage: (callback: (message: string) => void) => {
    ipcRenderer.on('main-process-message', (event, message) =>
      callback(message)
    );
  },

  // Progress updates
  onDownloadProgress: (callback: (progress: unknown) => void) => {
    ipcRenderer.on('download-progress', (event, progress) =>
      callback(progress)
    );
  },

  onAuthStatus: (callback: (status: unknown) => void) => {
    ipcRenderer.on('auth-status', (event, status) => callback(status));
  },
});

// --------- Preload scripts are loaded before other scripts ---------
// You can access Node.js APIs in the preload scripts.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector: string, text: string) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]!);
  }
});
