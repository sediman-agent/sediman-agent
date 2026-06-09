/**
 * Global type declarations for Electron webview elements
 */

declare global {
  interface Window {
    electronAPI?: {
      browserShow: () => Promise<any>;
      browserHide: () => Promise<any>;
      browserNavigate: (url: string) => Promise<any>;
      browserBack: () => Promise<any>;
      browserForward: () => Promise<any>;
      browserRefresh: () => Promise<any>;
      browserGetState: () => Promise<any>;
      browserScreenshot: () => Promise<any>;
      onAgentAction: (callback: (action: any) => void) => (() => void) | undefined;
      selectFile: () => Promise<any>;
      selectFiles: () => Promise<any>;
      saveFile: (options: any) => Promise<any>;
      getVersion: () => Promise<string>;
      getPlatform: () => string;
      onMessage: (callback: (message: any) => void) => (() => void) | undefined;
      sendMessage: (message: any) => void;
    };
    electronWebviewController?: {
      navigate: (url: string) => void;
      takeScreenshot: () => Promise<string | undefined>;
      getState: () => import('@/services/BrowserService').BrowserState;
      executeScript: <T = unknown>(script: string) => Promise<T | undefined>;
      getWebview: () => HTMLWebViewElement | null;
    };
  }

  // Extend the webview element to work with standard HTML properties
  // and add Electron-specific ones
  interface HTMLWebViewElement extends HTMLElement {
    src: string;
    executeJavaScript(code: string): Promise<any>;
    getURL(): string;
    getTitle(): string;
    stop(): void;
    reload(): void;
    goBack(): void;
    goForward(): void;
    getWebContents(): any;
    setUserAgent(userAgent: string): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLWebViewElement>, HTMLWebViewElement> & {
        src?: string;
        allowpopups?: boolean;
        partition?: string;
        useragent?: string;
      };
    }
  }
}

export {};
