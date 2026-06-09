import { useRef, useCallback, useEffect } from 'react';
import { browserService } from '@/services/BrowserService';

export interface WebviewControlReturn {
  webviewRef: React.RefObject<HTMLWebViewElement | null>;
  setWebviewRef: (node: HTMLWebViewElement | null) => void;
  registerWebview: () => void;
  setWebviewSource: (src: string) => void;
}

export function useWebviewControl(webviewSrc: string, isOpen: boolean): WebviewControlReturn {
  const webviewRef = useRef<HTMLWebViewElement | null>(null);

  // Callback ref to set src when webview mounts
  const setWebviewRef = useCallback((node: HTMLWebViewElement | null) => {
    if (node) {
      webviewRef.current = node;
      node.src = webviewSrc;
    }
  }, [webviewSrc]);

  // Register webview with BrowserService when mounted
  const registerWebview = useCallback(() => {
    if (webviewRef.current && isOpen) {
      browserService.registerWebview(webviewRef.current);
      browserService.activate();
    }
  }, [isOpen]);

  // Set webview src directly
  const setWebviewSource = useCallback((src: string) => {
    if (webviewRef.current && src && src !== 'about:blank') {
      webviewRef.current.src = src;
    }
  }, []);

  // Register when panel opens
  useEffect(() => {
    registerWebview();
  }, [registerWebview]);

  // Set webview src when webviewSrc state changes
  useEffect(() => {
    if (webviewRef.current && webviewSrc && webviewSrc !== 'about:blank') {
      webviewRef.current.src = webviewSrc;
    }
  }, [webviewSrc]);

  return {
    webviewRef,
    setWebviewRef,
    registerWebview,
    setWebviewSource,
  };
}
