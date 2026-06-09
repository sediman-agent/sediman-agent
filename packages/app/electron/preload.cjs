const { contextBridge, ipcRenderer } = require('electron');

// Check for --showcase flag
const isShowcase = process.argv.includes('--showcase');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Check if running in showcase mode
  isShowcase: () => isShowcase,

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => process.platform,

  // Browser controls (unified API)
  browser: {
    // Visibility control
    show: () => ipcRenderer.invoke('browser-show'),
    hide: () => ipcRenderer.invoke('browser-hide'),
    resize: (width) => ipcRenderer.invoke('browser-resize', width),

    // Navigation
    navigate: (url) => ipcRenderer.invoke('browser-navigate', url),
    back: () => ipcRenderer.invoke('browser-back'),
    forward: () => ipcRenderer.invoke('browser-forward'),
    refresh: () => ipcRenderer.invoke('browser-refresh'),

    // State
    getState: () => ipcRenderer.invoke('browser-get-state'),
    screenshot: () => ipcRenderer.invoke('browser-screenshot'),

    // IPC-based browser execution (for agent control)
    exec: {
      navigate: (url) => ipcRenderer.invoke('browser-exec:navigate', url),
      click: (x, y) => ipcRenderer.invoke('browser-exec:click', x, y),
      type: (selector, text) => ipcRenderer.invoke('browser-exec:type', selector, text),
      snapshot: () => ipcRenderer.invoke('browser-exec:snapshot'),
      evaluate: (script) => ipcRenderer.invoke('browser-exec:evaluate', script),
    },

    // CDP for shared browser mode (deprecated - using IPC exec instead)
    getCdpTarget: (webContentsId) => {
      console.log('[Preload] getCdpTarget called with webContentsId:', webContentsId);
      return ipcRenderer.invoke('browser:get-cdp-target', webContentsId);
    },
  },

  // Agent action listener (for visual feedback)
  onAgentAction: (callback) => {
    const listener = (event, action) => callback(action);
    ipcRenderer.on('agent-action', listener);
    return () => ipcRenderer.removeListener('agent-action', listener);
  },

  // File operations
  selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
  selectFiles: () => ipcRenderer.invoke('dialog:selectFiles'),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),

  // Events - unified message handling
  onMessage: (callback) => {
    const listener = (event, message) => callback(message);
    ipcRenderer.on('main-message', listener);
    return () => ipcRenderer.removeListener('main-message', listener);
  },

  sendMessage: (message) => ipcRenderer.send('renderer-message', message),
});
