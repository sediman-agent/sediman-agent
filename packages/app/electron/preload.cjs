const { contextBridge, ipcRenderer } = require('electron');

// Check for --showcase flag
const isShowcase = process.argv.includes('--showcase');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Check if running in showcase mode
  isShowcase: () => isShowcase,
  // Browser visibility control
  browserShow: () => ipcRenderer.invoke('browser-show'),
  browserHide: () => ipcRenderer.invoke('browser-hide'),

  // Browser control methods
  browserNavigate: (url) => ipcRenderer.invoke('browser-navigate', url),
  browserBack: () => ipcRenderer.invoke('browser-back'),
  browserForward: () => ipcRenderer.invoke('browser-forward'),
  browserRefresh: () => ipcRenderer.invoke('browser-refresh'),
  browserGetState: () => ipcRenderer.invoke('browser-get-state'),
  browserScreenshot: () => ipcRenderer.invoke('browser-screenshot'),

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

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => process.platform,

  // CDP Shared Browser
  browser: {
    getCdpTarget: (webContentsId) => ipcRenderer.invoke('browser:get-cdp-target', webContentsId),
  },

  // Events
  onMessage: (callback) => {
    const subscription = (event, message) => callback(message);
    ipcRenderer.on('main-message', subscription);
    return () => ipcRenderer.removeListener('main-message', subscription);
  },

  sendMessage: (message) => ipcRenderer.send('renderer-message', message),
});
