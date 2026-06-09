import { useState } from 'react';
import { GitBranch, GitCommit, GitMerge, ArrowUp, ArrowDown, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/useProjectStore';

interface GitStatusProps {
  className?: string;
}

export function GitStatus({ className }: GitStatusProps) {
  const activeProject = useProjectStore(state => state.getActiveProject());
  const [isLoading, setIsLoading] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  if (!activeProject) {
    return null;
  }

  const gitBranch = activeProject.gitBranch || 'main';
  const gitStatus = activeProject.gitStatus || 'clean';

  const getStatusColor = (status: typeof gitStatus) => {
    switch (status) {
      case 'clean':
        return 'text-green-500';
      case 'modified':
        return 'text-yellow-500';
      case 'conflict':
        return 'text-red-500';
      case 'diverged':
        return 'text-orange-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: typeof gitStatus) => {
    switch (status) {
      case 'clean':
        return <Check className="w-3 h-3" />;
      case 'modified':
        return <GitCommit className="w-3 h-3" />;
      case 'conflict':
        return <AlertTriangle className="w-3 h-3" />;
      case 'diverged':
        return <GitMerge className="w-3 h-3" />;
      default:
        return <GitBranch className="w-3 h-3" />;
    }
  };

  const handlePull = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual git pull via RPC
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual git push via RPC
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setIsLoading(true);
    try {
      // TODO: Implement actual git commit via RPC
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowCommitDialog(false);
      setCommitMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Branch selector */}
      <button className="flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-accent rounded transition-colors">
        <GitBranch className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium">{gitBranch}</span>
      </button>

      {/* Status indicator */}
      <div className={cn('flex items-center gap-1', getStatusColor(gitStatus))}>
        {getStatusIcon(gitStatus)}
      </div>

      {/* Actions */}
      {gitStatus !== 'clean' && (
        <>
          <button
            onClick={handlePull}
            disabled={isLoading}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Pull changes"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowCommitDialog(true)}
            disabled={isLoading}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Commit changes"
          >
            <GitCommit className="w-3 h-3" />
          </button>
          <button
            onClick={handlePush}
            disabled={isLoading}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Push changes"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
        </>
      )}

      {/* Refresh button */}
      <button
        disabled={isLoading}
        className="p-1 hover:bg-accent rounded transition-colors"
        title="Refresh git status"
      >
        <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
      </button>

      {/* Commit dialog */}
      {showCommitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCommitDialog(false)}
          />
          <div className="relative bg-background border border-border rounded-lg shadow-lg w-full max-w-md p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Commit Changes</h3>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleCommit();
                }
              }}
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                onClick={() => setShowCommitDialog(false)}
                className="px-3 py-1.5 text-xs hover:bg-accent rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || isLoading}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded transition-colors"
              >
                Commit (⌘↵)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
