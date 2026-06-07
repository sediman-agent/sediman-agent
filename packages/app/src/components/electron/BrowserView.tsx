import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Home, Eye, MousePointer2, Minimize2, ExternalLink } from 'lucide-react';
import { Button } from '@/elements/actions/Button';

// Types
interface BrowserState {
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
}

interface AgentAction {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

interface BrowserViewProps {
  initialUrl?: string;
  onNavigate?: (url: string) => void;
}

// Action message formatter
const formatAction = (action: AgentAction): string => {
  const { type, data } = action;
  switch (type) {
    case 'agent-navigate': return `Navigating to ${data.url}`;
    case 'agent-click': return `Clicking ${data.selector}`;
    case 'agent-type': return `Typing: ${data.text}`;
    case 'agent-back': return 'Going back';
    case 'agent-forward': return 'Going forward';
    case 'agent-refresh': return 'Refreshing page';
    case 'agent-snapshot': return `Snapshot (${data.elementCount} elements)`;
    case 'navigate': return `Loaded ${data.url}`;
    case 'page-loaded': return `Page ready`;
    default: return type;
  }
};

export function BrowserView({ initialUrl = 'https://www.google.com', onNavigate }: BrowserViewProps) {
  // State
  const [browserState, setBrowserState] = useState<BrowserState>({
    url: initialUrl,
    title: '',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
  });

  const [urlInput, setUrlInput] = useState(initialUrl);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false); // Start closed
  const [isManuallyOpened, setIsManuallyOpened] = useState(false);

  // Update browser state
  const updateBrowserState = useCallback(async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.browserGetState();
    const state = result as { success: boolean; url?: string; title?: string; canGoBack?: boolean; canGoForward?: boolean; isLoading?: boolean };
    if (state.success && state.url) {
      setBrowserState({
        url: state.url || '',
        title: state.title || '',
        canGoBack: state.canGoBack ?? false,
        canGoForward: state.canGoForward ?? false,
        isLoading: state.isLoading ?? false,
      });
      if (state.url) setUrlInput(state.url);
    }
  }, []);

  // Navigate to URL
  const handleNavigate = useCallback(async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.browserNavigate(urlInput);
    const navResult = result as { success: boolean };
    if (navResult.success) {
      onNavigate?.(urlInput);
    }
  }, [urlInput, onNavigate]);

  // Browser controls
  const handleBack = useCallback(() => window.electronAPI?.browserBack(), []);
  const handleForward = useCallback(() => window.electronAPI?.browserForward(), []);
  const handleRefresh = useCallback(() => window.electronAPI?.browserRefresh(), []);
  const handleHome = useCallback(() => setUrlInput('https://www.google.com'), []);

  // Screenshot
  const handleScreenshot = useCallback(async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.browserScreenshot();
    const screenshot = result as { success: boolean; data?: string };
    if (screenshot.success && screenshot.data) {
      const a = document.createElement('a');
      a.href = screenshot.data;
      a.download = `screenshot-${Date.now()}.png`;
      a.click();
    }
  }, []);

  // Toggle browser panel
  const toggleBrowser = useCallback((forceState?: boolean) => {
    const newState = forceState ?? !isBrowserOpen;
    setIsBrowserOpen(newState);
    setIsManuallyOpened(forceState !== undefined);
  }, [isBrowserOpen]);

  // Open browser (triggered by agent)
  const openBrowser = useCallback(() => {
    if (!isManuallyOpened) {
      setIsBrowserOpen(true);
    }
  }, [isManuallyOpened]);

  // Setup listeners
  useEffect(() => {
    if (!window.electronAPI) return;

    // Agent action listener
    const removeListener = window.electronAPI.onAgentAction((action: AgentAction) => {
      setAgentActions(prev => [...prev.slice(-9), action]);
      setCurrentAction(action.type);

      // Auto-open browser on first agent action
      if (!isBrowserOpen && !isManuallyOpened) {
        openBrowser();
      }

      // Clear current action after delay
      setTimeout(() => setCurrentAction(null), 2000);

      // Mark agent as active
      setIsAgentActive(true);
      setTimeout(() => setIsAgentActive(false), 3000);
    });

    return removeListener;
  }, [isBrowserOpen, isManuallyOpened, openBrowser]);

  // Poll browser state
  useEffect(() => {
    updateBrowserState();
    const interval = setInterval(updateBrowserState, 1000);
    return () => clearInterval(interval);
  }, [updateBrowserState]);

  // Auto-submit on Enter
  const handleSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleNavigate();
  }, [handleNavigate]);

  // Browser panel style
  const panelStyle = isBrowserOpen
    ? 'translate-x-0 opacity-100'
    : 'translate-x-full opacity-0 pointer-events-none';

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-all duration-300">
      {/* Browser Toggle Button (always visible) */}
      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border-b">
        <Button
          size="sm"
          variant={isBrowserOpen ? 'default' : 'outline'}
          onClick={() => toggleBrowser()}
        >
          {isBrowserOpen ? (
            <>
              <Minimize2 className="w-4 h-4 mr-1" />
              Hide Browser
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4 mr-1" />
              Show Browser
            </>
          )}
        </Button>

        {isAgentActive && currentAction && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
            <MousePointer2 className="w-3 h-3 text-green-600 dark:text-green-400 animate-pulse" />
            <span className="text-xs text-green-700 dark:text-green-300">
              {formatAction(agentActions[agentActions.length - 1])}
            </span>
          </div>
        )}
      </div>

      {/* Collapsible Browser Panel */}
      <div
        className={`flex-1 flex transition-all duration-300 ease-in-out ${panelStyle}`}
        style={{ width: isBrowserOpen ? '100%' : '0%' }}
      >
        {isBrowserOpen && (
          <div className="w-full flex flex-col">
            {/* Browser Control Bar */}
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 border-b">
              <Button size="sm" variant="ghost" onClick={handleBack} disabled={!browserState.canGoBack}>
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button size="sm" variant="ghost" onClick={handleForward} disabled={!browserState.canGoForward}>
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={browserState.isLoading}>
                <RotateCcw className="w-4 h-4" />
              </Button>

              <Button size="sm" variant="ghost" onClick={handleHome}>
                <Home className="w-4 h-4" />
              </Button>

              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={handleSubmit}
                className="flex-1 px-3 py-1 text-sm border rounded-md bg-white dark:bg-gray-700"
                placeholder="Enter URL..."
              />

              <Button size="sm" onClick={handleNavigate}>Go</Button>
              <Button size="sm" variant="outline" onClick={handleScreenshot}>
                Screenshot
              </Button>
            </div>

            {/* Browser View Area */}
            <div className="flex-1 relative bg-white">
              {isAgentActive && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur rounded-full">
                  <Eye className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-white font-medium">Agent Working</span>
                </div>
              )}

              <div className="h-full flex items-center justify-center text-gray-400 p-8">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-1">Shared Browser</p>
                  <p className="text-sm text-gray-500 mb-2">
                    {browserState.url || 'Loading...'}
                  </p>
                  {browserState.isLoading && (
                    <p className="text-sm text-blue-500">Loading...</p>
                  )}
                </div>
              </div>

              {/* Recent Actions */}
              {agentActions.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 max-h-32 overflow-y-auto bg-white/95 backdrop-blur border-t p-2">
                  <p className="text-xs text-gray-500 mb-1">Recent Actions:</p>
                  <div className="space-y-0.5">
                    {agentActions.slice().reverse().map((action, i) => (
                      <div key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <span className="font-mono text-gray-400">
                          {new Date(action.timestamp).toLocaleTimeString()}
                        </span>
                        <span>{formatAction(action)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
