import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  X, Maximize2, Minimize2, RefreshCw, Globe, Loader2, Monitor, Wifi, AlertCircle
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
  const [screenshotSrc, setScreenshotSrc] = useState<string>('');
  const [screenshotError, setScreenshotError] = useState(false);

  const isOpen = useSandboxStore(state => state.isOpen);
  const isActive = useSandboxStore(state => state.isActive);
  const togglePanel = useSandboxStore(state => state.togglePanel);

  // Poll agent browser screenshots — shows exactly what the agent sees
  useEffect(() => {
    if (!isActive || !isOpen) return;
    let active = true;
    let consecutiveErrors = 0;

    const poll = async () => {
      if (!active) return;
      try {
        const resp = await fetch(`${API_BASE}/api/browser/screencast-frame`);
        if (!active) return;
        if (resp.ok) {
          const data = await resp.json();
          if (data.frame) {
            setScreenshotSrc(`data:image/jpeg;base64,${data.frame}`);
            setBrowserUrl(data.url || '');
            setInputUrl(data.url || '');
            setScreenshotError(false);
            consecutiveErrors = 0;
          }
        } else {
          consecutiveErrors++;
        }
      } catch {
        consecutiveErrors++;
      }
      if (consecutiveErrors > 5) {
        setScreenshotError(true);
      }
    };

    poll();
    const interval = setInterval(poll, 500);
    return () => { active = false; clearInterval(interval); };
  }, [isActive, isOpen]);

  // URL navigation — tells the agent's browser to navigate
  const navigateTo = useCallback(async (url: string) => {
    let target = url.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) {
      target = 'https://' + target;
    }
    setInputUrl(target);
    try {
      await fetch(`${API_BASE}/api/browser/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
    } catch {}
  }, []);

  const handleUrlKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigateTo((e.target as HTMLInputElement).value);
    }
  }, [navigateTo]);

  const handleRefresh = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/browser/screencast/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: { type: 'keyDown', key: 'F5' } }),
      });
    } catch {}
  }, []);

  const handleBack = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/browser/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'goBack' }),
      });
    } catch {}
  }, []);

  const handleClose = useCallback(() => togglePanel(), [togglePanel]);

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

  const isLive = screenshotSrc && browserUrl && browserUrl !== 'about:blank';

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
              {isLive ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <Globe className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Browser</span>
              {isLive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">Live</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={handleBack} className="h-7 w-7 p-0" title="Back">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
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
                placeholder="Enter URL and press Enter..."
                className="flex-1 bg-transparent text-sm outline-none text-foreground min-w-0"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Screenshot View — shows exactly what the agent's browser sees */}
        <div className="flex-1 relative overflow-hidden bg-neutral-100 dark:bg-neutral-900">
          {screenshotSrc ? (
            <img
              src={screenshotSrc}
              alt="Browser"
              className="w-full h-full object-contain"
              style={{ imageRendering: 'auto' }}
              onError={() => setScreenshotError(true)}
            />
          ) : isActive ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-spin" />
                <h3 className="text-sm font-medium mb-1">Starting Browser</h3>
                <p className="text-muted-foreground text-xs">Waiting for agent to begin...</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center p-8">
                <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-sm font-medium mb-2">Browser Inactive</h3>
                <p className="text-muted-foreground text-sm">Start an agent task to begin browsing</p>
              </div>
            </div>
          )}

          {screenshotError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
              <div className="text-center p-8">
                <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                <h3 className="text-sm font-medium mb-1">Connection Lost</h3>
                <p className="text-muted-foreground text-xs">Browser stream disconnected</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-xs bg-muted/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {isLive ? (
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
