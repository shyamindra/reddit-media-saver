// src/preload.ts
import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
  // Reddit API operations
  redditAuth: (...args) => ipcRenderer.invoke("reddit-auth", ...args),
  downloadContent: (...args) => ipcRenderer.invoke("download-content", ...args),
  getSavedContent: (...args) => ipcRenderer.invoke("get-saved-content", ...args),
  // File system operations
  selectDirectory: (...args) => ipcRenderer.invoke("select-directory", ...args),
  saveFile: (...args) => ipcRenderer.invoke("save-file", ...args),
  // App lifecycle
  onMainProcessMessage: (callback) => {
    ipcRenderer.on(
      "main-process-message",
      (event, message) => callback(message)
    );
  },
  // Progress updates
  onDownloadProgress: (callback) => {
    ipcRenderer.on(
      "download-progress",
      (event, progress) => callback(progress)
    );
  },
  onAuthStatus: (callback) => {
    ipcRenderer.on("auth-status", (event, status) => callback(status));
  }
});
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };
  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
//# sourceMappingURL=preload.js.map
