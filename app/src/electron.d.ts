interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  navigate: (url: string) => Promise<{ success: boolean }>;
  screenshot: () => Promise<{ success: boolean; data?: string }>;
  execute: (script: string) => Promise<{ success: boolean; result?: unknown }>;
  openExternal: (url: string) => void;
  path: {
    join: (...args: string[]) => string;
    dirname: (file: string) => string;
    basename: (file: string) => string;
  };
  getVersion: () => Promise<string>;
  getName: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
