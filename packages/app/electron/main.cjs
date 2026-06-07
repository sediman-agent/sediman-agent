const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

// Check for --showcase flag
const args = process.argv.slice(1);
const isShowcase = args.includes('--showcase');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // Enable webview tag
      additionalArguments: isShowcase ? ['--showcase'] : [],
    },
    show: false,
  });

  // Open DevTools in development to help debug
  // mainWindow.webContents.openDevTools();

  // ALWAYS load from built files
  // The dist folder is created by `npm run build`
  const distPath = path.join(__dirname, '../dist/index.html');
  console.log('Loading from:', distPath);

  mainWindow.loadFile(distPath);

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
  });

  // Log renderer errors
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message} (line ${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
  });

  // Log uncaught errors
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
  });

  mainWindow.on('closed', () => {
    console.log('Window closed');
    mainWindow = null;
  });

  // Setup IPC handlers for browser control
  setupBrowserHandlers();
}

function setupBrowserHandlers() {
  console.log('Setting up browser handlers');

  // Show browser view - EMBEDDED in panel
  ipcMain.handle('browser-show', async () => {
    console.log('=== browser-show called (EMBEDDED) ===');

    try {
      // Just return success - the renderer will handle the webview element
      console.log('Browser will be shown via webview element in renderer');
      console.log('=== browser-show complete ===');
      return { success: true };
    } catch (err) {
      console.error('✗ Failed to show browser:', err);
      return { success: false, error: err.message };
    }
  });

  // Hide browser view
  ipcMain.handle('browser-hide', async () => {
    console.log('browser-hide called');
    // Browser is handled by webview element in renderer, nothing to do here
    return { success: true };
  });

  // Navigate to URL
  ipcMain.handle('browser-navigate', async (event, url) => {
    console.log('browser-navigate:', url);
    // Browser navigation is handled by webview element in renderer, nothing to do here
    return { success: true };
  });

  // Get browser state
  ipcMain.handle('browser-get-state', async () => {
    // Browser state is handled by webview element in renderer
    return { success: true, url: '', title: '', canGoBack: false, canGoForward: false, isLoading: false };
  });

  // Browser controls
  ipcMain.handle('browser-back', async () => {
    // Browser controls are handled by webview element in renderer
    return { success: true };
  });

  ipcMain.handle('browser-forward', async () => {
    // Browser controls are handled by webview element in renderer
    return { success: true };
  });

  ipcMain.handle('browser-refresh', async () => {
    // Browser refresh is handled by webview element in renderer
    return { success: true };
  });

  // Screenshot
  ipcMain.handle('browser-screenshot', async () => {
    // Screenshot is handled by webview element in renderer
    return { success: false, error: 'Screenshot not implemented for webview' };
  });

  // Get version
  ipcMain.handle('app:getVersion', async () => {
    return app.getVersion();
  });
}

app.whenReady().then(() => {
  console.log('App ready, creating window');
  createWindow();
});

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
