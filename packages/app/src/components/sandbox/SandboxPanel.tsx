/**
 * Browser Panel - Fixed iframe height issue
 * Using direct DOM manipulation to set webview dimensions
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  X, Maximize2, Minimize2, RefreshCw, ExternalLink, Globe, Plus, Wifi, WifiOff, Loader2
} from 'lucide-react';
import { Button } from '@/elements/actions/Button';
import { useSandboxStore } from '@/stores/useSandboxStore';
import { cn } from '@/lib/utils';
import { browserService } from '@/services/BrowserService';
import {
  BrowserStatusIndicator,
  UrlValidator,
  BrowserValidationUtils,
} from '../browser/types';

// Simple browser state
interface BrowserTabState {
  id: string;
  url: string;
  title: string;
  loading: boolean;
  status: 'idle' | 'navigating' | 'loading' | 'error' | 'active';
}

export function SandboxPanel() {
  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [urlInput, setUrlInput] = useState('https://www.google.com');
  const [tabs, setTabs] = useState<BrowserTabState[]>([
    { id: 'tab-1', url: 'https://www.google.com', title: 'Google', loading: false, status: 'idle' }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [webviewHeight, setWebviewHeight] = useState(0);

  // =========================================================================
  // STORE INTEGRATION
  // =========================================================================
  const isOpen = useSandboxStore(state => state.isOpen);
  const isActive = useSandboxStore(state => state.isActive);
  const togglePanel = useSandboxStore(state => state.togglePanel);

  // =========================================================================
  // HELPERS
  // =========================================================================
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const webviewRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // EFFECTS
  // =========================================================================

  // Calculate and update webview height
  useEffect(() => {
    const updateWebviewHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setWebviewHeight(rect.height);

        // Directly set webview dimensions
        if (webviewRef.current) {
          webviewRef.current.style.height = `${rect.height}px`;
          webviewRef.current.style.width = `${rect.width}px`;
          webviewRef.current.style.position = 'absolute';
          webviewRef.current.style.top = '0';
          webviewRef.current.style.left = '0';

          // Try to set the internal iframe height
          try {
            const shadowRoot = webviewRef.current.shadowRoot;
            if (shadowRoot) {
              const iframe = shadowRoot.querySelector('iframe');
              if (iframe) {
                (iframe as HTMLIFrameElement).style.height = `${rect.height}px`;
                (iframe as HTMLIFrameElement).style.width = `${rect.width}px`;
                (iframe as HTMLIFrameElement).style.flex = 'none';
              }
            }
          } catch (e) {
            // Shadow root might not be accessible
          }
        }
      }
    };

    updateWebviewHeight();
    window.addEventListener('resize', updateWebviewHeight);
    const intervalId = setInterval(updateWebviewHeight, 100);

    return () => {
      window.removeEventListener('resize', updateWebviewHeight);
      clearInterval(intervalId);
    };
  }, [panelWidth, isFullscreen]);

  // BrowserService registration
  useEffect(() => {
    if (isActive && webviewRef.current) {
      browserService.registerWebview(webviewRef.current);
      browserService.activate();

      return () => {
        browserService.deactivate();
      };
    }
  }, [isActive]);

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  const handleAddTab = useCallback(() => {
    const newTab: BrowserTabState = {
      id: `tab-${Date.now()}`,
      url: 'https://www.google.com',
      title: 'New Tab',
      loading: false,
      status: 'idle'
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setUrlInput('https://www.google.com');
  }, []);

  const handleCloseTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) return;

    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (tabId === activeTabId && newTabs.length > 0) {
        setActiveTabId(newTabs[0].id);
        setUrlInput(newTabs[0].url);
      }
      return newTabs;
    });
  }, [tabs.length, activeTabId]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setUrlInput(tab.url);
    }
  }, [tabs]);

  const handleUrlSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const normalizedUrl = UrlValidator.normalizeUrl(urlInput);
    const validation = BrowserValidationUtils.validateUrl(normalizedUrl);

    if (!validation.valid) {
      console.error('[SandboxPanel] Invalid URL:', validation.error);
      return;
    }

    setUrlInput(normalizedUrl);

    setTabs(prev => prev.map(tab =>
      tab.id === activeTabId
        ? { ...tab, url: normalizedUrl, title: 'New Page', status: 'navigating' as const, loading: true }
        : tab
    ));

    if (webviewRef.current) {
      if (webviewRef.current.loadURL) {
        webviewRef.current.loadURL(normalizedUrl);
      } else {
        webviewRef.current.src = normalizedUrl;
      }
    }
  }, [urlInput, activeTabId]);

  const handleRefresh = useCallback(() => {
    if (webviewRef.current && webviewRef.current.reload) {
      webviewRef.current.reload();
    }
  }, []);

  const handleGoBack = useCallback(() => {
    if (webviewRef.current && webviewRef.current.goBack) {
      webviewRef.current.goBack();
    }
  }, []);

  const handleGoForward = useCallback(() => {
    if (webviewRef.current && webviewRef.current.goForward) {
      webviewRef.current.goForward();
    }
  }, []);

  // =========================================================================
  // RESIZE HANDLING
  // =========================================================================

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isFullscreen) return;
    setIsResizing(true);
    e.preventDefault();
  }, [isFullscreen]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 400 && newWidth <= window.innerWidth - 100) {
      setPanelWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

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
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // =========================================================================
  // PANEL CONTROLS
  // =========================================================================

  const handleClose = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.browserHide();
    }
    togglePanel();
  }, [togglePanel]);

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================

  const getStatusColor = useCallback((status: BrowserTabState['status']) => {
    return BrowserStatusIndicator.getStatusColor(status);
  }, []);

  const getStatusMessage = useCallback((status: BrowserTabState['status']) => {
    return BrowserStatusIndicator.getStatusMessage(status);
  }, []);

  // =========================================================================
  // RENDER
  // =========================================================================

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Resize Handle */}
      {!isFullscreen && (
        <div
          className={cn(
            "fixed top-0 h-full z-[100] w-3 cursor-col-resize flex items-center justify-center",
            "hover:bg-primary/20 transition-colors",
            isResizing && "bg-primary/40"
          )}
          style={{ left: `calc(100% - ${panelWidth}px - 1.5px)` }}
          onMouseDown={handleMouseDown}
          aria-hidden="true"
        >
          <div className="w-0.5 h-8 rounded-full bg-muted-foreground/30" />
        </div>
      )}

      {/* Main Panel */}
      <div
        className={cn(
          "flex flex-col shadow-2xl transition-all duration-200 border-l border-border",
          isFullscreen ? "fixed inset-0 z-50" : "fixed right-0 top-0 bottom-0 z-50",
          "bg-background"
        )}
        style={{
          width: isFullscreen ? '100%' : panelWidth,
        }}
        role="complementary"
        aria-label="Browser panel"
      >
        {/* Header */}
        <div className="bg-muted/30 border-b border-border backdrop-blur-md">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              {isActive ? (
                <Wifi className={cn("w-4 h-4", getStatusColor(activeTab?.status || 'idle'))} />
              ) : (
                <WifiOff className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Browser</span>
              {isActive && activeTab && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  getStatusColor(activeTab.status)
                )}>
                  {getStatusMessage(activeTab.status)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGoBack}
                className="h-7 w-7 p-0"
                title="Back"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGoForward}
                className="h-7 w-7 p-0"
                title="Forward"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                className="h-7 w-7 p-0"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
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

          {/* Tabs */}
          <div className="flex items-center gap-1 px-2 pt-2 border-b border-border/50">
            {tabs.map((tab: BrowserTabState) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs transition-all",
                  "hover:bg-muted-foreground/10",
                  activeTabId === tab.id
                    ? "bg-background border border-b-0 border-border"
                    : "text-muted-foreground"
                )}
              >
                <Globe className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{tab.title}</span>
                {tab.loading && (
                  <Loader2 className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                )}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab.id);
                    }}
                    className="ml-1 p-0.5 hover:bg-destructive/20 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </button>
            ))}
            <button
              onClick={handleAddTab}
              className="p-1.5 hover:bg-muted-foreground/10 rounded transition-all"
              title="Add new tab"
            >
              <Plus className="w-3 h-3" />
            </button>
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
                placeholder="Enter URL..."
                aria-label="Browser URL"
              />
            </div>
          </form>
        </div>

        {/* Webview Display Area */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-white"
          style={{ minHeight: '400px' }}
        >
          {!isActive ? (
            <div className="flex items-center justify-center h-full bg-background">
              <div className="text-center p-8">
                <WifiOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-sm font-medium mb-2">Browser Not Active</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Open the panel to start browsing
                </p>
              </div>
            </div>
          ) : (
            <webview
              id="browser-webview"
              ref={(el) => {
                webviewRef.current = el;
                if (el) {
                  el.addEventListener('did-fail-load', (event: any) => {
                    console.error('[SandboxPanel] Webview failed:', event.errorCode, event.errorDescription);
                    setTabs(prev => prev.map(tab =>
                      tab.id === activeTabId
                        ? { ...tab, loading: false, status: 'error' as const }
                        : tab
                    ));
                  });
                  el.addEventListener('dom-ready', () => {
                    const title = el.getTitle();
                    if (title) {
                      setTabs(prev => prev.map(tab =>
                        tab.id === activeTabId
                          ? { ...tab, title, status: 'active' as const, loading: false }
                          : tab
                      ));
                    }

                    // Inject CSS to fix page styling
                    el.executeJavaScript(`
                      (function() {
                        const style = document.createElement('style');
                        style.textContent = 'html, body { height: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }';
                        document.head.appendChild(style);
                      })();
                    `).catch(err => console.log('CSS injection failed:', err));
                  });
                  el.addEventListener('did-start-loading', () => {
                    setTabs(prev => prev.map(tab =>
                      tab.id === activeTabId
                        ? { ...tab, loading: true, status: 'loading' as const }
                        : tab
                    ));
                  });
                  el.addEventListener('did-stop-loading', () => {
                    setTabs(prev => prev.map(tab =>
                      tab.id === activeTabId
                        ? { ...tab, loading: false, status: 'active' as const }
                        : tab
                    ));
                  });
                }
              }}
              src={activeTab?.url || 'https://www.google.com'}
              style={{
                width: `${panelWidth}px`,
                height: `${webviewHeight}px`,
                border: 'none',
                backgroundColor: 'white',
                display: 'block',
                position: 'absolute',
                top: 0,
                left: 0
              }}
              partition="persist:browser-panel"
              allowpopups={true}
            />
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-xs bg-muted/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {isActive ? (
              <>
                <Wifi className={cn("w-3 h-3", getStatusColor(activeTab?.status || 'idle'))} />
                <span className={getStatusColor(activeTab?.status || 'idle')}>
                  {getStatusMessage(activeTab?.status || 'idle')}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Disconnected</span>
              </>
            )}
          </div>
          <span className="text-muted-foreground truncate max-w-[200px]">
            {isActive && activeTab ? activeTab.url : 'Electron Browser'}
          </span>
        </div>
      </div>
    </>
  );
}
