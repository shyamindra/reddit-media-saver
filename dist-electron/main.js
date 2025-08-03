// src/main.ts
import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL ? path.join(process.env.DIST, "../public") : process.env.DIST;
var win;
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"] || "http://localhost:5177";
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
function createWindow() {
  console.log("\u{1F680} Creating Electron window...");
  console.log("\u{1F4C1} Dist path:", process.env.DIST);
  console.log("\u{1F310} Dev server URL:", VITE_DEV_SERVER_URL);
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });
  win.on("closed", () => {
    console.log("\u{1F512} Window closed");
    win = null;
  });
  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("\u274C Page failed to load:", {
      errorCode,
      errorDescription,
      validatedURL
    });
  });
  win.webContents.on("did-finish-load", () => {
    console.log("\u2705 Page loaded successfully");
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message, `(${sourceId}:${line})`);
  });
  if (VITE_DEV_SERVER_URL) {
    console.log("\u{1F310} Loading from dev server:", VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    const indexPath = path.join(process.env.DIST, "index.html");
    console.log("\u{1F4C4} Loading from file:", indexPath);
    if (!fs.existsSync(indexPath)) {
      console.error("\u274C index.html not found at:", indexPath);
      console.error('\u{1F4A1} Make sure to run "npm run build" first');
      win.loadURL('data:text/html,<h1>Build Error</h1><p>index.html not found. Please run "npm run build" first.</p>');
      return;
    }
    win.loadFile(indexPath);
  }
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
}
app.on("window-all-closed", () => {
  console.log("\u{1F512} All windows closed");
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.whenReady().then(() => {
  console.log("\u{1F389} App is ready, creating window...");
  createWindow();
});
app.on("activate", () => {
  console.log("\u{1F504} App activated");
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});
ipcMain.handle("reddit-auth", async (event, code) => {
  try {
    console.log("\u{1F510} Reddit auth requested with code:", code);
    const clientId = process.env.VITE_REDDIT_CLIENT_ID;
    const clientSecret = process.env.VITE_REDDIT_CLIENT_SECRET;
    const redirectUri = "http://localhost:5173/auth/callback";
    console.log("\u{1F511} Auth config:", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      redirectUri
    });
    if (!clientId || !clientSecret) {
      console.error("\u274C Reddit API credentials not configured");
      return { success: false, message: "Reddit API credentials not configured" };
    }
    const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "User-Agent": "RedditSaverApp/1.0.0"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("\u274C Token exchange failed:", errorText);
      return { success: false, message: `Token exchange failed: ${tokenResponse.status}` };
    }
    const tokenData = await tokenResponse.json();
    console.log("\u2705 Token exchange successful");
    const userResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "User-Agent": "RedditSaverApp/1.0.0"
      }
    });
    if (!userResponse.ok) {
      console.error("\u274C Failed to get user information");
      return { success: false, message: "Failed to get user information" };
    }
    const userData = await userResponse.json();
    console.log("\u2705 User info retrieved:", userData.name);
    console.log("\u{1F4BE} Authentication successful for user:", userData.name);
    return {
      success: true,
      token: tokenData,
      user: userData
    };
  } catch (error) {
    console.error("\u274C Reddit auth error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Authentication failed"
    };
  }
});
ipcMain.handle("download-content", async (event, ...args) => {
  console.log("\u{1F4E5} Download content requested:", args);
  return { success: false, message: "Not implemented yet" };
});
ipcMain.handle("get-saved-content", async (event, ...args) => {
  console.log("\u{1F4CB} Get saved content requested:", args);
  return { success: false, message: "Not implemented yet" };
});
//# sourceMappingURL=main.js.map
