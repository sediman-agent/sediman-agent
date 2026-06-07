/**
 * Simple Working Browser Panel
 * Minimal implementation that allows URL typing and navigation
 */

import { useState, useRef, useEffect } from 'react';
import {
  X, Maximize2, Minimize2, RefreshCw, ExternalLink, Wifi, Loader2
} from 'lucide-react';

export function SimpleBrowserPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [panelWidth, setPanelWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('about:blank');
  const [isLoading, setIsLoading] = useState(false);

  const webviewRef = useRef<any>(null);

  // Handle URL submission
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInput.trim();

    if (!url) return;

    // Normalize URL
    let normalizedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = `https://${url}`;
    }

    console.log('Navigating to:', normalizedUrl);
    setCurrentUrl(normalizedUrl);
    setUrlInput(normalizedUrl);
    setIsLoading(true);

    // Load URL in webview after a short delay
    setTimeout(() => {
      if (webviewRef.current && webviewRef.current.loadURL) {
        webviewRef.current.loadURL(normalizedUrl);
      }
      setIsLoading(false);
    }, 100);
  };

  // Handle refresh
  const handleRefresh = () => {
    if (webviewRef.current && webviewRef.current.reload) {
      webviewRef.current.reload();
    }
  };

  // Handle close
  const handleClose = () => {
    setIsOpen(false);
  };

  // Handle resize
  const handleMouseDown = () => {
    if (isFullscreen) return;
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 400 && newWidth <= window.innerWidth - 100) {
      setPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        style={{ zIndex: 1000 }}
      >
        Open Browser
      </button>
    );
  }

  return (
    <>
      {/* Resize Handle */}
      {!isFullscreen && (
        <div
          className="fixed top-0 h-full z-[100] w-3 cursor-col-resize flex items-center justify-center hover:bg-primary/20 transition-colors"
          style={{ left: `calc(100% - ${panelWidth}px - 1.5px)` }}
          onMouseDown={handleMouseDown}
        >
          <div className="w-0.5 h-8 rounded-full bg-muted-foreground/30" />
        </div>
      )}

      {/* Main Panel */}
      <div
        className="flex flex-col shadow-2xl transition-all duration-200 border-l border-border bg-background"
        style={{
          width: isFullscreen ? '100%' : panelWidth,
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 50
        }}
      >
        {/* Header */}
        <div className="bg-muted/30 border-b border-border backdrop-blur-md">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Browser</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                className="p-1.5 hover:bg-muted-foreground/20 rounded transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 hover:bg-muted-foreground/20 rounded transition-all"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-destructive/20 hover:text-destructive rounded transition-all"
                title="Close browser"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* URL Bar */}
          <form onSubmit={handleUrlSubmit} className="flex items-center gap-2 px-3 pb-2">
            <div className="flex-1 flex items-center bg-background border border-input rounded-md px-3 py-1.5 shadow-sm">
              <ExternalLink className="w-3 h-3 text-muted-foreground mr-2 shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-foreground min-w-0"
                placeholder="Enter URL (e.g., google.com)"
                aria-label="Browser URL"
                autoFocus
              />
            </div>
          </form>
        </div>

        {/* Browser View */}
        <div className="flex-1 relative overflow-hidden bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full bg-background">
              <Loader2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div className="absolute inset-0 w-full h-full">
              <style>{`
                #browser-webview {
                  width: 100% !important;
                  height: 100% !important;
                }
                #browser-webview iframe {
                  height: 100% !important;
                  flex: none !important;
                }
              `}</style>
              <webview
                id="browser-webview"
                ref={(el) => {
                  webviewRef.current = el;
                  if (el) {
                    el.addEventListener('dom-ready', () => {
                      console.log('Webview ready');
                    });
                    el.addEventListener('did-fail-load', (event: any) => {
                      console.error('Webview failed:', event.errorDescription);
                    });
                  }
                }}
                src={currentUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: 'white',
                  display: 'block'
                }}
                className="w-full h-full"
                partition="persist:browser"
                allowpopups={true}
              />
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-xs bg-muted/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Wifi className="w-3 h-3 text-green-600" />
            <span className="text-green-600">Connected</span>
          </div>
          <span className="text-muted-foreground truncate max-w-[200px]">
            {currentUrl}
          </span>
        </div>
      </div>
    </>
  );
}
