import { useState, useCallback, useEffect } from 'react';
import { ElectronWebView } from '@/components/electron/ElectronWebView';
import { X, Plus, Maximize2, Minimize2, RefreshCw, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { useSandboxStore } from '@/stores/useSandboxStore';
import { SkillRecordingControls } from '@/components/skills/SkillRecordingControls';

interface Tab {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
}

export function SandboxPanel() {
  // Get state from store
  const isOpen = useSandboxStore(state => state.isOpen);
  const isActive = useSandboxStore(state => state.isActive);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [browserUrl] = useState('https://www.google.com');
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Browser', url: 'https://www.google.com', isActive: true }
  ]);

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
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const addTab = () => {
    const newTab: Tab = {
      id: Date.now().toString(),
      title: 'New Tab',
      url: 'https://www.google.com',
      isActive: true
    };
    setTabs(prev => prev.map(t => ({ ...t, isActive: false })).concat(newTab));
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return;
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (prev.find(t => t.id === tabId)?.isActive) {
        filtered[filtered.length - 1].isActive = true;
      }
      return filtered;
    });
  };

  const switchTab = (tabId: string) => {
    setTabs(prev => prev.map(t => ({ ...t, isActive: t.id === tabId })));
  };

  if (!isOpen) {
    return null;
  }

  const activeTab = tabs.find(t => t.isActive);

  const handleStart = async () => {
    try {
      // For Electron, we don't need to do anything special
      // Just mark the browser as active
      useSandboxStore.getState().setIsActive(true);
      useSandboxStore.getState().setConnectionStatus('connected');
      console.log('[SandboxPanel] Browser started in Electron mode');
    } catch (error) {
      console.error('[SandboxPanel] Failed to start browser:', error);
    }
  };

  return (
    <>
      {/* Resize handle */}
      {!isFullscreen && (
        <div
          className="fixed top-0 h-1 w-full cursor-row-resize z-[60] hover:bg-blue-500 bg-transparent"
          style={{ right: 0, left: 'auto', width: panelWidth, top: 'auto' }}
          onMouseDown={handleMouseDown}
        />
      )}
      <div
        className={`flex flex-col bg-background shadow-lg transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : 'fixed right-0 top-0 h-screen border-l border-border z-40'}`}
        style={{ width: isFullscreen ? '100%' : panelWidth }}
      >
        {/* Browser Chrome */}
        <div className="bg-muted/30 border-b border-border">
          {/* Tabs */}
          <div className="flex items-center bg-muted/50">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer group relative transition-all duration-200 ${
                  tab.isActive ? 'bg-background shadow-sm' : 'bg-muted/30 hover:bg-muted/50'
                }`}
                onClick={() => switchTab(tab.id)}
              >
                <span className="text-sm max-w-[150px] truncate font-medium">{tab.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive rounded p-0.5 transition-all duration-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={addTab}
              className="p-2 hover:bg-muted-foreground/20 rounded transition-all duration-200 hover-lift"
              title="New tab"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-muted-foreground/20 rounded transition-all duration-200 hover-lift"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* URL Bar */}
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover-lift" title="Back">
                <span className="text-xs">◀</span>
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover-lift" title="Forward">
                <span className="text-xs">▶</span>
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover-lift" title="Refresh">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>

            {/* Skill Recording Controls */}
            {isActive && (
              <div className="flex items-center">
                <SkillRecordingControls position="header" />
              </div>
            )}
            <div className="flex-1 flex items-center bg-background border border-border rounded-md px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200">
              <ExternalLink className="w-3 h-3 text-muted-foreground mr-2" />
              <input
                type="text"
                value={activeTab?.url || ''}
                readOnly
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
        </div>

        {/* Browser View */}
        <div className="flex-1 relative" style={{ background: 'hsl(var(--background))' }}>
          {!isActive ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Browser ready to start</p>
                <Button onClick={handleStart} size="lg">
                  Start Browser
                </Button>
              </div>
            </div>
          ) : (
            <ElectronWebView
              url={activeTab?.url || browserUrl}
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>

        {/* Status Bar */}
        {isActive && (
          <div className="flex items-center justify-between px-3 py-1 bg-muted/30 border-t border-border text-xs text-muted-foreground">
            <span>Connected</span>
            <span>Electron Runtime</span>
          </div>
        )}
      </div>
    </>
  );
}
