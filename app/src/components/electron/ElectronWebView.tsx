import { useEffect, useRef } from 'react';
import { browserService } from '@/services/BrowserService';
import { useSandboxStore } from '@/stores/useSandboxStore';

interface ElectronWebViewProps {
  url?: string;
  onNavigate?: (url: string) => void;
  style?: React.CSSProperties;
  onReady?: () => void;
}

export function ElectronWebView({
  url = 'https://www.google.com',
  onNavigate,
  style,
  onReady,
}: ElectronWebViewProps) {
  const webviewRef = useRef<HTMLWebViewElement>(null);
  const isActive = useSandboxStore(state => state.isActive);

  // Register webview with browser service when ready
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    // Register with browser service for IPC communication
    browserService.registerWebview(webview);

    // Set initial URL
    if (url) {
      webview.src = url;
    }

    // Activate browser service
    browserService.activate();

    console.log('[ElectronWebView] Initialized with BrowserService');

    // Cleanup on unmount
    return () => {
      browserService.deactivate();
    };
  }, [url]);

  // Setup event listeners for navigation callbacks
  useEffect(() => {
    const handleNavigate = ({ url: newUrl }: { url: string }) => {
      if (onNavigate && newUrl) {
        onNavigate(newUrl);
      }
    };

    const handleReady = () => {
      console.log('[ElectronWebView] Browser ready for interaction');
      if (onReady) {
        onReady();
      }
    };

    browserService.on('browser-navigate', handleNavigate);
    browserService.on('browser-ready', handleReady);

    return () => {
      browserService.off('browser-navigate', handleNavigate);
      browserService.off('browser-ready', handleReady);
    };
  }, [onNavigate, onReady]);

  // Expose controls via global window object for agent access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.electronWebviewController = {
        navigate: (newUrl: string) => {
          console.log('[ElectronWebView] External navigate request:', newUrl);
          browserService.navigate(newUrl);
        },
        takeScreenshot: async () => {
          console.log('[ElectronWebView] External screenshot request');
          const result = await browserService.takeScreenshot();
          return result ?? undefined;
        },
        getState: () => {
          return browserService.getState();
        },
        executeScript: async <T,>(script: string) => {
          const result = await browserService.executeScript<T>(script);
          return result ?? undefined;
        },
        getWebview: () => webviewRef.current,
      };
    }
  }, []);

  // Handle URL changes from props
  useEffect(() => {
    if (url && isActive && webviewRef.current) {
      const currentUrl = browserService.getState().url;
      if (currentUrl !== url) {
        browserService.navigate(url);
      }
    }
  }, [url, isActive]);

  return (
    <webview
      ref={webviewRef}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        backgroundColor: '#FFFFFF',
        ...style
      }}
      {...({
        allowpopups: true,
        partition: 'persist:electron-webview',
        useragent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0',
        nodeintegration: true,
        contextIsolation: false,
      } as React.HTMLAttributes<HTMLWebViewElement>)}
    />
  );
}
