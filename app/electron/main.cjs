const path = require('path');

// In Electron, the API is available globally when running with electron binary
// The module loading issue suggests we need to access it differently
const { app, BrowserWindow, ipcMain, session, protocol } = require('electron');

// Simple check for development environment
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === 'true' || true; // Always use dev mode for now

let mainWindow = null;

// Register schemes before app is ready (must be done early)
if (isDev) {
  protocol.registerSchemesAsPrivileged([{ scheme: 'http', privileges: { standard: true, secure: true, fetch: true } }]);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#09090b',
    show: false,
    titleBarStyle: 'hiddenInset',
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webviewTag: true, // Enable webview tag for browser integration
      preload: path.join(__dirname, 'preload.cjs'),
      // Allow loading local files and dev server
      webSecurity: !isDev,
    }
  });

  // Allow navigating to dev server in development
  if (isDev) {
    mainWindow.webContents.session.webRequest.onBeforeRequest(
      { urls: ['http://localhost:*/*', 'ws://localhost:*/*'] },
      (details, callback) => {
        callback({ cancel: false });
      }
    );
  }

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:1420' // Dev server from current setup
      : `file://${path.join(__dirname, '../dist/index.html')}`
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Browser control IPC handlers
ipcMain.handle('browser:navigate', async (event, url) => {
  console.log('Browser navigate to:', url);
  // Will be handled by the webview in the renderer process
  return { success: true };
});

ipcMain.handle('browser:screenshot', async () => {
  console.log('Browser screenshot requested');
  // Will be handled by the webview in the renderer process
  return { success: true };
});

ipcMain.handle('browser:execute', async (event, script) => {
  console.log('Browser execute script:', script);
  return { success: true };
});
