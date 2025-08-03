var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main.ts
var import_electron = require("electron");
var path = __toESM(require("path"), 1);
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL ? path.join(process.env.DIST, "../public") : process.env.DIST;
var win;
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new import_electron.BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
    win = null;
  }
});
import_electron.app.whenReady().then(createWindow);
import_electron.app.on("activate", () => {
  const allWindows = import_electron.BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});
import_electron.ipcMain.handle("reddit-auth", async (event, ...args) => {
  console.log("Reddit auth requested:", args);
  return { success: false, message: "Not implemented yet" };
});
import_electron.ipcMain.handle("download-content", async (event, ...args) => {
  console.log("Download content requested:", args);
  return { success: false, message: "Not implemented yet" };
});
import_electron.ipcMain.handle("get-saved-content", async (event, ...args) => {
  console.log("Get saved content requested:", args);
  return { success: false, message: "Not implemented yet" };
});
