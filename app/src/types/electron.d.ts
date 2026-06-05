/**
 * TypeScript declarations for Electron webview elements
 */

interface WebviewEventMap extends EventMap {
  'close': Event;
  'console-message': ConsoleMessageEvent;
  'did-start-loading': Event;
  'did-stop-loading': Event;
  'did-finish-load': Event;
  'did-fail-load': DidFailLoadEvent;
  'dom-ready': Event;
  'page-title-updated': PageTitleUpdatedEvent;
  'page-favicon-updated': PageFaviconUpdatedEvent;
  'new-window': NewWindowEvent;
  'will-navigate': WillNavigateEvent;
  'did-navigate': DidNavigateEvent;
  'did-navigate-in-page': DidNavigateInPageEvent;
  'crashed': CrashedEvent;
  'plugin-crashed': PluginCrashedEvent;
  'destroyed': Event;
  'media-started-playing': Event;
  'media-paused': Event;
  'unresponsive': Event;
  'responsive': Event;
  'context-menu': MouseEvent;
  'select-bluetooth-device': Event;
  'select-usb-device': Event;
  'permission-query': PermissionQueryEvent;
  'found-in-page': FoundInPageEvent;
}

interface ConsoleMessageEvent extends Event {
  type: 'console-message';
  level: number;
  message: string;
  line: number;
  sourceId: string;
}

interface DidFailLoadEvent extends Event {
  type: 'did-fail-load';
  errorCode: number;
  errorDescription: string;
  validatedURL: string;
  isMainFrame: boolean;
}

interface PageTitleUpdatedEvent extends Event {
  type: 'page-title-updated';
  title: string;
  explicitSet: boolean;
}

interface PageFaviconUpdatedEvent extends Event {
  type: 'page-favicon-updated';
  favicons: string[];
}

interface NewWindowEvent extends Event {
  type: 'new-window';
  url: string;
  frameName: string;
  disposition: string;
  options: object;
}

interface WillNavigateEvent extends Event {
  type: 'will-navigate';
  url: string;
  isMainFrame: boolean;
  isSameDocument: boolean;
}

interface DidNavigateEvent extends Event {
  type: 'did-navigate';
  url: string;
  isMainFrame: boolean;
}

interface DidNavigateInPageEvent extends Event {
  type: 'did-navigate-in-page';
  url: string;
  isMainFrame: boolean;
}

interface CrashedEvent extends Event {
  type: 'crashed';
  killed: boolean;
  reason: string;
}

interface PluginCrashedEvent extends Event {
  type: 'plugin-crashed';
  name: string;
  version: string;
}

interface PermissionQueryEvent extends Event {
  type: 'permission-query';
  lastUrl: string;
  permission: string;
  request: PermissionRequest;
}

interface FoundInPageEvent extends Event {
  type: 'found-in-page';
  result: {
    requestId: number;
    finalUpdate: boolean;
    activeMatchOrdinal: number;
    matches: number;
    selectionArea: object;
  };
}

interface PermissionRequest {
  allow(): void;
  deny(): void;
}

interface HTMLWebViewElement extends HTMLElement {
  src: string;
  allowpopups: boolean | string;
  nodeintegration: boolean | string;
  contextIsolation: boolean | string;
  enableRemoteModule: boolean | string;
  partition: string;
  useragent: string;
  autosize: string;
  webpreferences: string;

  executeJavaScript(code: string): Promise<any>;
  getURL(): string;
  getTitle(): string;
  isLoading(): boolean;
  stop(): void;
  reload(): void;
  goBack(): void;
  goForward(): void;
  goToIndex(index: number): void;
  goToOffset(offset: number): void;
  getWebContentsId(): number;
  getWebContents(): any;
  setUserAgent(userAgent: string): void;
  insertCSS(css: string): void;
  print(): void;
  send(channel: string, ...args: any[]): void;
  openDevTools(): void;
  closeDevTools(): void;
  isDevToolsOpened(): boolean;
  isDevToolsFocused(): boolean;
  capturePage(rect?: object): Promise<any>;
  setAudioMuted(muted: boolean): void;
  isAudioMuted(): boolean;
  setZoomLevel(level: number): void;
  getZoomLevel(): number;
  setZoomFactor(factor: number): void;
  getZoomFactor(): number;
  findInPage(text: string, options?: object): Promise<number>;
  stopFindInPage(action: string): Promise<void>;
  addEventListener<K extends keyof WebviewEventMap>(
    type: K,
    listener: (this: HTMLWebViewElement, ev: WebviewEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof WebviewEventMap>(
    type: K,
    listener: (this: HTMLWebViewElement, ev: WebviewEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

interface Window {
  electronWebviewController?: {
    navigate: (url: string) => void;
    takeScreenshot: () => Promise<string | undefined>;
    getState: () => import('@/services/BrowserService').BrowserState;
    executeScript: <T = unknown>(script: string) => Promise<T | undefined>;
    getWebview: () => HTMLWebViewElement | null;
  };
}
