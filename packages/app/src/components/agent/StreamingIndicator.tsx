type StreamingPhase = 'thinking' | 'planning' | 'executing' | 'reflecting' | 'retrying';

interface StreamingIndicatorProps {
  phase: StreamingPhase;
  retryProgress?: { attempt: number; max: number; countdown: number } | null;
  action?: string; // Current action being executed
  detail?: string; // Additional detail about the action
}

const phaseConfig: Record<StreamingPhase, { text: string; description: string }> = {
  thinking: { text: 'Thinking\u2026', description: 'Agent is reasoning about the task' },
  planning: { text: 'Planning\u2026', description: 'Agent is creating an execution plan' },
  executing: { text: 'Executing\u2026', description: 'Agent is performing actions' },
  reflecting: { text: 'Reflecting\u2026', description: 'Agent is reviewing results' },
  retrying: { text: 'Retrying\u2026', description: 'Agent is retrying with corrections' },
};

export function StreamingIndicator({ phase, retryProgress, action, detail }: StreamingIndicatorProps) {
  const config = phaseConfig[phase];
  const isBrowserAction = action?.toLowerCase().includes('navigate') ||
                         action?.toLowerCase().includes('click') ||
                         action?.toLowerCase().includes('browser') ||
                         action?.toLowerCase().includes('screenshot');

  return (
    <div className="px-4 pb-2">
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            isBrowserAction ? 'bg-blue-500' : 'bg-foreground'
          }`} />
          <span>
            {phase === 'retrying' && retryProgress
              ? `Retrying (${retryProgress.attempt}/${retryProgress.max})\u2026`
              : config.text}
          </span>
          {isBrowserAction && (
            <span className="text-blue-600 dark:text-blue-400">\u2022 Using Browser</span>
          )}
        </div>

        {action && (
          <div className="text-[10px] pl-4 text-muted-foreground">
            {action}
          </div>
        )}

        {detail && action !== detail && (
          <div className="text-[10px] pl-4 text-muted-foreground opacity-75">
            {detail}
          </div>
        )}

        {retryProgress && retryProgress.countdown > 0 && (
          <div className="text-[10px] pl-4 text-muted-foreground">
            Retrying in {retryProgress.countdown.toFixed(1)}s\u2026
          </div>
        )}
      </div>
    </div>
  );
}
