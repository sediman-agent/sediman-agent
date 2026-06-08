/**
 * SandboxPanel — Real embedded Chromium browser via Electron <webview>.
 * The user interacts with a REAL browser — native cursor, typing, scrolling, selection.
 * Agent syncs URLs from its Playwright session. Same feel as Cursor.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  X, Maximize2, Minimize2, RefreshCw, Globe, Loader2, Monitor, Wifi
} from 'lucide-react';
import { Button } from '@/elements/actions/Button';
import { useSandboxStore } from '@/stores/useSandboxStore';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:3001';

export function SandboxPanel() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [intervention, setIntervention] = useState<{ active: boolean; message: string; id: number } | null>(null);
  const [interventionLoading, setInterventionLoading] = useState(false);

  const isOpen = useSandboxStore(state => state.isOpen);
  const isActive = useSandboxStore(state => state.isActive);
  const togglePanel = useSandboxStore(state => state.togglePanel);

  const webviewRef = useRef<any>(null);

  // Set up webview event listeners once it mounts
  const webviewCallbackRef = useCallback((node: any) => {
    if (!node) return;
    webviewRef.current = node;

    node.addEventListener('did-navigate', (e: any) => {
      setBrowserUrl(e.url);
      setInputUrl(e.url);
      setIsLoading(false);
    });
    node.addEventListener('did-navigate-in-page', (e: any) => {
      if (e.url) {
        setBrowserUrl(e.url);
        setInputUrl(e.url);
      }
    });
    node.addEventListener('did-start-loading', () => setIsLoading(true));
    node.addEventListener('did-stop-loading', () => setIsLoading(false));
    node.addEventListener('page-title-updated', () => {
    });
  }, []);

  // URL navigation
  const navigateTo = useCallback((url: string) => {
    let target = url.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) {
      target = 'https://' + target;
    }
    setInputUrl(target);
    if (webviewRef.current) {
      webviewRef.current.loadURL(target);
    }
  }, []);

  const handleUrlKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateTo((e.target as HTMLInputElement).value);
    }
  }, [navigateTo]);

  const handleRefresh = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  }, []);

  const handleBack = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.goBack();
    }
  }, []);

  const handleForward = useCallback(() => {
    if (webviewRef.current) {
      webviewRef.current.goForward();
    }
  }, []);

  const handleClose = useCallback(() => togglePanel(), [togglePanel]);

  // Sync agent navigation to webview — when the agent navigates via Playwright,
  // the frontend receives the URL from the progress stream and we load it here.
  // The store could be updated from AgentPage's onProgress handler.
  // For now, poll the server for the agent's current URL.
  useEffect(() => {
    if (!isActive || !isOpen) return;
    let active = true;
    const poll = async () => {
      if (!active) return;
      try {
        const resp = await fetch(`${API_BASE}/api/browser/screencast-frame`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.url && data.url !== 'about:blank' && data.url !== browserUrl) {
            // Agent navigated to a new URL — sync webview
            if (webviewRef.current && webviewRef.current.getURL() !== data.url) {
              webviewRef.current.loadURL(data.url);
            }
          }
        }
      } catch {}
    };
    const interval = setInterval(poll, 1000);
    return () => { active = false; clearInterval(interval); };
  }, [isActive, isOpen, browserUrl]);

  // Human intervention polling
  useEffect(() => {
    if (!isActive) return;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/browser/intervention`);
        const data = await res.json();
        setIntervention(data.active ? data : null);
      } catch {}
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [isActive]);

  const handleInterventionDone = useCallback(async () => {
    setInterventionLoading(true);
    try {
      await fetch(`${API_BASE}/api/browser/intervention-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'User completed the task' }),
      });
      setIntervention(null);
    } catch {}
    setInterventionLoading(false);
  }, []);

  // Resize logic
  const resizeHandlers = useMemo(() => ({
    down: (e: React.MouseEvent) => { if (isFullscreen) return; setIsResizing(true); e.preventDefault(); },
    move: (e: MouseEvent) => { if (!isResizing) return; const w = window.innerWidth - e.clientX; if (w >= 400 && w <= window.innerWidth - 100) setPanelWidth(w); },
    up: () => setIsResizing(false),
  }), [isFullscreen, isResizing]);

  useEffect(() => {
    if (!isResizing) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', resizeHandlers.move);
    window.addEventListener('mouseup', resizeHandlers.up);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', resizeHandlers.move);
      window.removeEventListener('mouseup', resizeHandlers.up);
    };
  }, [isResizing, resizeHandlers.move, resizeHandlers.up]);

  if (!isOpen) return null;

  return (
    <>
      {!isFullscreen && (
        <div
          className={cn("fixed top-0 h-full z-[100] w-3 cursor-col-resize flex items-center justify-center", "hover:bg-primary/20 transition-colors", isResizing && "bg-primary/40")}
          style={{ left: `calc(100% - ${panelWidth}px - 1.5px)` }}
          onMouseDown={resizeHandlers.down}
          aria-hidden="true"
        >
          <div className="w-0.5 h-8 rounded-full bg-muted-foreground/30" />
        </div>
      )}

      <div
        className={cn("flex flex-col shadow-2xl transition-all duration-200 border-l border-border", isFullscreen ? "fixed inset-0 z-50" : "fixed right-0 top-0 bottom-0 z-50", "bg-background")}
        style={{ width: isFullscreen ? '100%' : panelWidth }}
        role="complementary"
        aria-label="Browser"
      >
        {/* Header */}
        <div className="bg-muted/30 border-b border-border backdrop-blur-md">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
              ) : browserUrl && browserUrl !== 'about:blank' ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <Globe className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Browser</span>
              {browserUrl && browserUrl !== 'about:blank' && !isLoading && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">Live</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={handleBack} className="h-7 w-7 p-0" title="Back">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </Button>
              <Button size="sm" variant="ghost" onClick={handleForward} className="h-7 w-7 p-0" title="Forward">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Button>
              <Button size="sm" variant="ghost" onClick={handleRefresh} className="h-7 w-7 p-0" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-muted-foreground/20 rounded transition-all" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={handleClose} className="p-1.5 hover:bg-destructive/20 hover:text-destructive rounded transition-all" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* URL Bar */}
          <div className="flex items-center gap-2 px-3 pb-2">
            <div className="flex-1 flex items-center bg-background border border-input rounded-md px-3 py-1.5 shadow-sm">
              <Globe className="w-3 h-3 text-muted-foreground mr-2 shrink-0" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                placeholder="Search or enter URL..."
                className="flex-1 bg-transparent text-sm outline-none text-foreground min-w-0"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Human Intervention Banner */}
        {intervention?.active && (
          <div className="mx-3 mb-2 p-3 rounded-lg bg-amber-50 border border-amber-300 dark:bg-amber-950 dark:border-amber-700 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-600 text-sm">&#x1F6A8;</span>
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Agent Needs Your Help</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">{intervention.message}</p>
            </div>
            <button onClick={handleInterventionDone} disabled={interventionLoading}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded text-sm font-medium shrink-0 transition-colors">
              {interventionLoading ? '...' : 'Done'}
            </button>
          </div>
        )}

        {/* Real Chromium Browser — Electron <webview> */}
        <div className="flex-1 relative overflow-hidden bg-white">
          <webview
            ref={webviewCallbackRef}
            src="about:blank"
            className="absolute inset-0 w-full h-full"
            allowpopups
            useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          />

          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center p-8">
                <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-sm font-medium mb-2">Browser Inactive</h3>
                <p className="text-muted-foreground text-sm">Start an agent task to begin browsing</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-xs bg-muted/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <><Loader2 className="w-3 h-3 animate-spin text-yellow-500" /><span className="text-yellow-600">Loading...</span></>
            ) : browserUrl && browserUrl !== 'about:blank' ? (
              <><Wifi className="w-3 h-3 text-green-500" /><span className="text-green-600">Connected</span></>
            ) : (
              <span className="text-muted-foreground">Ready</span>
            )}
          </div>
          <span className="text-muted-foreground truncate max-w-[300px]">{browserUrl || 'about:blank'}</span>
        </div>
      </div>
    </>
  );
}
