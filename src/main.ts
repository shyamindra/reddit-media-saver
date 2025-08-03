import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// ├─┬─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST, '../public')
  : process.env.DIST;

let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'] || 'http://localhost:5173';

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

function createWindow() {
  console.log('🚀 Creating Electron window...');
  console.log('📁 Dist path:', process.env.DIST);
  console.log('🌐 Dev server URL:', VITE_DEV_SERVER_URL);
  
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Add error handling for window creation
  win.on('closed', () => {
    console.log('🔒 Window closed');
    win = null;
  });

  // Add error handling for page load
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Page failed to load:', {
      errorCode,
      errorDescription,
      validatedURL
    });
  });

  win.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded successfully');
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  // Add console logging from renderer process
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message, `(${sourceId}:${line})`);
  });

  if (VITE_DEV_SERVER_URL) {
    console.log('🌐 Loading from dev server:', VITE_DEV_SERVER_URL);
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    const indexPath = path.join(process.env.DIST, 'index.html');
    console.log('📄 Loading from file:', indexPath);
    
    // Check if the file exists
    if (!fs.existsSync(indexPath)) {
      console.error('❌ index.html not found at:', indexPath);
      console.error('💡 Make sure to run "npm run build" first');
      win.loadURL('data:text/html,<h1>Build Error</h1><p>index.html not found. Please run "npm run build" first.</p>');
      return;
    }
    
    win.loadFile(indexPath);
  }

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });
}

app.on('window-all-closed', () => {
  console.log('🔒 All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.whenReady().then(() => {
  console.log('🎉 App is ready, creating window...');
  createWindow();
});

app.on('activate', () => {
  console.log('🔄 App activated');
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// IPC handlers for Reddit API and file system operations
ipcMain.handle('reddit-auth', async (event, code: string) => {
  try {
    console.log('🔐 Reddit auth requested with code:', code);
    
    // Get environment variables
    const clientId = process.env.VITE_REDDIT_CLIENT_ID;
    const clientSecret = process.env.VITE_REDDIT_CLIENT_SECRET;
    const redirectUri = 'http://localhost:5173/auth/callback';
    
    console.log('🔑 Auth config:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      redirectUri
    });
    
    if (!clientId || !clientSecret) {
      console.error('❌ Reddit API credentials not configured');
      return { success: false, message: 'Reddit API credentials not configured' };
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'User-Agent': 'RedditSaverApp/1.0.0'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token exchange failed:', errorText);
      return { success: false, message: `Token exchange failed: ${tokenResponse.status}` };
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token exchange successful');
    
    // Get user information
    const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'RedditSaverApp/1.0.0'
      }
    });

    if (!userResponse.ok) {
      console.error('❌ Failed to get user information');
      return { success: false, message: 'Failed to get user information' };
    }

    const userData = await userResponse.json();
    console.log('✅ User info retrieved:', userData.name);
    
    // Store the authentication data (you might want to save this to a file or database)
    console.log('💾 Authentication successful for user:', userData.name);
    
    return { 
      success: true, 
      token: tokenData,
      user: userData
    };
  } catch (error) {
    console.error('❌ Reddit auth error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Authentication failed' 
    };
  }
});

ipcMain.handle('download-content', async (event, ...args) => {
  // TODO: Implement content download
  console.log('📥 Download content requested:', args);
  return { success: false, message: 'Not implemented yet' };
});

ipcMain.handle('get-saved-content', async (event, ...args) => {
  // TODO: Implement fetching saved content
  console.log('📋 Get saved content requested:', args);
  return { success: false, message: 'Not implemented yet' };
});
