/**
 * Enhanced Streaming Indicator - Shows tool calls prominently
 * Makes browser automation more visible with detailed progress tracking
 */

type StreamingPhase = 'thinking' | 'planning' | 'executing' | 'reflecting' | 'retrying';

interface StreamingIndicatorProps {
  phase: StreamingPhase;
  retryProgress?: { attempt: number; max: number; countdown: number } | null;
  action?: string;
  detail?: string;
  toolCallHistory?: Array<{ action: string; detail: string; status: 'pending' | 'success' | 'error', timestamp: number }>;
}

const phaseConfig: Record<StreamingPhase, { text: string; description: string; icon: string }> = {
  thinking: { text: 'Thinking', description: 'Agent is reasoning about the task', icon: '🤔' },
  planning: { text: 'Planning', description: 'Agent is creating an execution plan', icon: '📋' },
  executing: { text: 'Executing', description: 'Agent is performing actions', icon: '⚡' },
  reflecting: { text: 'Reflecting', description: 'Agent is reviewing results', icon: '🔍' },
  retrying: { text: 'Retrying', description: 'Agent is retrying with corrections', icon: '🔄' },
};

export function StreamingIndicator({ phase, retryProgress, action, detail, toolCallHistory = [] }: StreamingIndicatorProps) {
  const config = phaseConfig[phase];
  const isBrowserAction = action?.toLowerCase().includes('navigate') ||
                         action?.toLowerCase().includes('click') ||
                         action?.toLowerCase().includes('browser') ||
                         action?.toLowerCase().includes('screenshot') ||
                         action?.toLowerCase().includes('type') ||
                         action?.toLowerCase().includes('snapshot');

  return (
    <div className="px-4 py-3 space-y-2">
      {/* Main Phase Indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          phase === 'executing' ? 'bg-blue-500 animate-pulse' :
          phase === 'planning' ? 'bg-purple-500' :
          phase === 'thinking' ? 'bg-yellow-500 animate-pulse' :
          phase === 'reflecting' ? 'bg-orange-500' :
          'bg-green-500'
        }`} />
        <span className="text-xs font-medium">{config.icon} {config.text}</span>
        {phase === 'retrying' && retryProgress && (
          <span className="text-xs text-muted-foreground">
            ({retryProgress.attempt}/{retryProgress.max})
          </span>
        )}
        {isBrowserAction && (
          <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
            🌐 Browser Active
          </span>
        )}
      </div>

      {/* Current Action Display */}
      {action && (
        <div className={`p-3 rounded-lg border ${
          isBrowserAction
            ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
            : 'border-muted bg-muted/50'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                {isBrowserAction ? '🌐' : '⚙️'} Action:
              </span>
              <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                {action}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {new Date().toLocaleTimeString()}
            </span>
          </div>

          {detail && action !== detail && (
            <div className="text-xs text-muted-foreground mt-1">
              {detail.length > 80 ? detail.substring(0, 80) + '...' : detail}
            </div>
          )}

          {/* Retry Countdown */}
          {retryProgress && retryProgress.countdown > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              ⏱️ Retrying in {retryProgress.countdown.toFixed(1)}s...
            </div>
          )}
        </div>
      )}

      {/* Tool Call History */}
      {toolCallHistory && toolCallHistory.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground font-medium">Recent Actions:</div>
          {toolCallHistory.slice(-5).map((toolCall, _idx) => (
            <div
              key={toolCall.timestamp}
              className={`text-xs p-2 rounded border ${
                toolCall.status === 'success'
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : toolCall.status === 'error'
                  ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {toolCall.status === 'success' ? '✅' : toolCall.status === 'error' ? '❌' : '⏳'} {toolCall.action}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(toolCall.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {toolCall.detail && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {toolCall.detail.length > 60 ? toolCall.detail.substring(0, 60) + '...' : toolCall.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
