const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;

// Check for --showcase flag
const args = process.argv.slice(1);
const isShowcase = args.includes('--showcase');

// Enable remote debugging for CDP webview sharing
const DEBUG_PORT = 9222;
app.commandLine.appendSwitch('remote-debugging-port', String(DEBUG_PORT));
console.log(`CDP debugging enabled on port ${DEBUG_PORT}`);

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
      webviewTag: true,
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

  // CDP Shared Browser: discover webview target for Playwright connection
  ipcMain.handle('browser:get-cdp-target', async (event, webContentsId) => {
    try {
      console.log('[CDP] Discovering browser CDP endpoint on port', DEBUG_PORT);

      // Get browser-level WebSocket URL (Playwright needs this, not page-level)
      const versionData = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${DEBUG_PORT}/json/version`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(e); }
          });
        }).on('error', reject);
      });

      const browserWsUrl = versionData.webSocketDebuggerUrl;
      if (!browserWsUrl) {
        return { success: false, error: 'No browser WebSocket URL found' };
      }

      console.log('[CDP] Browser CDP endpoint:', browserWsUrl.substring(0, 60) + '...');

      // Also get the webview page info for the URL
      const targets = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${DEBUG_PORT}/json`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(e); }
          });
        }).on('error', reject);
      });

      targets.forEach((t, i) => console.log(`[CDP]   [${i}] id=${t.id} type=${t.type} url=${t.url} title="${t.title}"`));

      // Find the webview for URL info
      const webviewTarget = targets.find(t =>
        (t.type === 'webview' || t.type === 'page') &&
        !t.url?.startsWith('file://') &&
        !t.url?.startsWith('devtools://')
      );

      return {
        success: true,
        webSocketDebuggerUrl: browserWsUrl, // Browser-level URL for Playwright
        url: webviewTarget?.url || 'about:blank',
        title: webviewTarget?.title || '',
      };
    } catch (err) {
      console.error('[CDP] Failed:', err.message);
      return { success: false, error: err.message };
    }
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
