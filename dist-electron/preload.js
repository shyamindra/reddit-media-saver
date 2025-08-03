// src/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Reddit API operations
  redditAuth: (...args) => import_electron.ipcRenderer.invoke("reddit-auth", ...args),
  downloadContent: (...args) => import_electron.ipcRenderer.invoke("download-content", ...args),
  getSavedContent: (...args) => import_electron.ipcRenderer.invoke("get-saved-content", ...args),
  // File system operations
  selectDirectory: (...args) => import_electron.ipcRenderer.invoke("select-directory", ...args),
  saveFile: (...args) => import_electron.ipcRenderer.invoke("save-file", ...args),
  // App lifecycle
  onMainProcessMessage: (callback) => {
    import_electron.ipcRenderer.on("main-process-message", (event, message) => callback(message));
  },
  // Progress updates
  onDownloadProgress: (callback) => {
    import_electron.ipcRenderer.on("download-progress", (event, progress) => callback(progress));
  },
  onAuthStatus: (callback) => {
    import_electron.ipcRenderer.on("auth-status", (event, status) => callback(status));
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
