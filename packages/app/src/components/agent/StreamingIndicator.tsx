import { useState, useEffect } from 'react';
import { Brain, ClipboardList, Zap, Search, RefreshCw, Globe, Settings, Clock, Loader2, Check, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type StreamingPhase = 'thinking' | 'planning' | 'executing' | 'reflecting' | 'retrying';

interface ToolCallItem {
  action: string;
  detail: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
}

interface StreamingIndicatorProps {
  phase: StreamingPhase;
  retryProgress?: { attempt: number; max: number; countdown: number } | null;
  action?: string;
  detail?: string;
  toolCallHistory?: ToolCallItem[];
}

const phaseConfig: Record<StreamingPhase, { text: string; color: string; icon: any }> = {
  thinking: { text: 'Thinking', color: 'text-yellow-500', icon: Brain },
  planning: { text: 'Planning', color: 'text-purple-500', icon: ClipboardList },
  executing: { text: 'Executing', color: 'text-blue-500', icon: Zap },
  reflecting: { text: 'Reflecting', color: 'text-orange-500', icon: Search },
  retrying: { text: 'Retrying', color: 'text-green-500', icon: RefreshCw },
};

function ElapsedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startTime), 100);
    return () => clearInterval(timer);
  }, [startTime]);
  const secs = (elapsed / 1000).toFixed(0);
  return <span className="tabular-nums">{secs}s</span>;
}

function formatDetail(text: string, maxLen: number): string {
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    const short = Object.entries(parsed)
      .slice(0, 2)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.slice(0, 30) : String(v).slice(0, 30)}`)
      .join(', ');
    return short.length > maxLen ? short.slice(0, maxLen) + '...' : short;
  } catch {
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  }
}

export function StreamingIndicator({ phase, retryProgress, action, detail, toolCallHistory = [] }: StreamingIndicatorProps) {
  const [expanded, setExpanded] = useState(true);
  const [startTime] = useState(Date.now());
  const config = phaseConfig[phase];
  const PhaseIcon = config.icon;

  const isBrowserAction = action?.toLowerCase().startsWith('browser_') ||
    action?.toLowerCase().includes('navigate') ||
    action?.toLowerCase().includes('click') ||
    action?.toLowerCase().includes('screenshot');

  const completed = toolCallHistory.filter(tc => tc.status !== 'pending').length;
  const failed = toolCallHistory.filter(tc => tc.status === 'error').length;
  const total = toolCallHistory.length;

  // Calculate progress percentage
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="border-t border-border/50 bg-gradient-to-b from-card/80 to-card/50 backdrop-blur-md">
      {/* Main indicator bar - always visible */}
      <div
        className={cn(
          'px-4 py-3 cursor-pointer transition-all duration-200',
          'hover:bg-accent/5 active:bg-accent/10'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {/* Animated status indicator */}
          <div className="relative">
            <div className={cn(
              'w-3 h-3 rounded-full animate-pulse',
              phase === 'thinking' && 'bg-yellow-500 shadow-lg shadow-yellow-500/50',
              phase === 'planning' && 'bg-purple-500 shadow-lg shadow-purple-500/50',
              phase === 'executing' && 'bg-blue-500 shadow-lg shadow-blue-500/50',
              phase === 'reflecting' && 'bg-orange-500 shadow-lg shadow-orange-500/50',
              phase === 'retrying' && 'bg-green-500 shadow-lg shadow-green-500/50',
            )} />
            <div className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              phase === 'thinking' && 'bg-yellow-500',
              phase === 'planning' && 'bg-purple-500',
              phase === 'executing' && 'bg-blue-500',
              phase === 'reflecting' && 'bg-orange-500',
              phase === 'retrying' && 'bg-green-500',
            )} />
          </div>

          {/* Phase text with icon */}
          <div className="flex items-center gap-2">
            <PhaseIcon size={16} className={cn(config.color, 'drop-shadow-sm')} />
            <span className="text-sm font-semibold tracking-tight">{config.text}</span>
          </div>

          {/* Progress badge */}
          {total > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/80 border border-border/50">
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      failed === 0 ? 'bg-green-500' : 'bg-yellow-500'
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                  {completed}/{total}
                </span>
              </div>
              {failed > 0 && (
                <span className="text-[10px] font-semibold text-red-500 bg-red-500/10 px-1 rounded">
                  {failed} failed
                </span>
              )}
            </div>
          )}

          {/* Browser action badge */}
          {isBrowserAction && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px] font-semibold uppercase tracking-wide">
              <Globe size={10} className="animate-pulse" />
              Browser
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Timer */}
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/30">
            <Clock size={11} className="text-muted-foreground" />
            <ElapsedTimer startTime={startTime} />
          </div>

          {/* Expand/collapse icon */}
          <div className={cn(
            'transition-transform duration-200',
            expanded ? 'rotate-180' : 'rotate-0'
          )}>
            <ChevronDown size={16} className="text-muted-foreground" />
          </div>
        </div>

        {/* Current action preview (collapsed state) */}
        {!expanded && action && (
          <div className="mt-2.5 pl-8">
            <div className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-card/50',
              isBrowserAction
                ? 'border-blue-200/50 bg-blue-50/30 dark:border-blue-800/50 dark:bg-blue-900/20'
                : 'border-border/50'
            )}>
              {isBrowserAction ? <Globe size={11} className="text-blue-500" /> : <Settings size={11} className="text-muted-foreground" />}
              <span className="font-mono">{action}</span>
              {detail && action !== detail && (
                <span className="text-muted-foreground font-normal">· {formatDetail(detail, 40)}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-border/50 pt-3">
          {/* Current action details */}
          {action && (
            <div className={cn(
              'p-3 rounded-lg border bg-card/80 backdrop-blur-sm transition-all duration-200',
              isBrowserAction
                ? 'border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/20 dark:border-blue-800/50'
                : 'border-border/50 bg-gradient-to-br from-muted/30 to-transparent'
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  'p-1.5 rounded-md',
                  isBrowserAction ? 'bg-blue-500/10' : 'bg-muted/50'
                )}>
                  {isBrowserAction ? <Globe size={13} className="text-blue-500" /> : <Settings size={13} className="text-muted-foreground" />}
                </div>
                <span className="font-mono text-sm font-semibold text-foreground">{action}</span>
              </div>
              {detail && action !== detail && (
                <div className="text-sm text-muted-foreground pl-9 font-mono leading-relaxed">
                  {formatDetail(detail, 150)}
                </div>
              )}
            </div>
          )}

          {/* Tool call history */}
          {toolCallHistory.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-1">
                Execution History
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {toolCallHistory.slice(-10).reverse().map((tc, i) => (
                  <div
                    key={`${tc.timestamp}-${i}`}
                    className={cn(
                      'group flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-all duration-150',
                      'hover:bg-accent/5',
                      tc.status === 'success' && 'bg-green-500/5 hover:bg-green-500/10',
                      tc.status === 'error' && 'bg-red-500/5 hover:bg-red-500/10',
                      tc.status === 'pending' && 'bg-yellow-500/5 hover:bg-yellow-500/10'
                    )}
                  >
                    <div className={cn(
                      'p-1 rounded-md shrink-0',
                      tc.status === 'success' && 'bg-green-500/20 text-green-600 dark:text-green-400',
                      tc.status === 'error' && 'bg-red-500/20 text-red-600 dark:text-red-400',
                      tc.status === 'pending' && 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                    )}>
                      {tc.status === 'success' ? <Check size={12} /> : tc.status === 'error' ? <X size={12} /> : <Loader2 size={12} className="animate-spin" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        'font-mono font-medium truncate',
                        tc.status === 'success' && 'text-green-700 dark:text-green-300',
                        tc.status === 'error' && 'text-red-700 dark:text-red-300',
                        tc.status === 'pending' && 'text-yellow-700 dark:text-yellow-300'
                      )}>
                        {tc.action}
                      </div>
                      {tc.detail && tc.action !== tc.detail && (
                        <div className="text-muted-foreground truncate mt-0.5">
                          {formatDetail(tc.detail, 60)}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {new Date(tc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retry progress */}
          {retryProgress && (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/20">
              <Loader2 size={12} className="animate-spin text-green-500" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                Retrying {retryProgress.attempt} of {retryProgress.max}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
