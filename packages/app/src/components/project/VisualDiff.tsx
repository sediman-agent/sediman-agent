import { useState } from 'react';
import { X, GitCommit, Plus, Minus, File, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectFile } from '@/types/project';

interface VisualDiffProps {
  files: ProjectFile[];
  onClose?: () => void;
  onFileClick?: (file: ProjectFile) => void;
  className?: string;
}

export function VisualDiff({ files, onClose, onFileClick, className }: VisualDiffProps) {
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(files[0] || null);

  if (!files.length) {
    return (
      <div className={cn('p-8 text-center text-muted-foreground', className)}>
        <GitCommit className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No file changes</p>
      </div>
    );
  }

  const getStatusColor = (status: ProjectFile['status']) => {
    switch (status) {
      case 'modified':
        return 'text-yellow-500';
      case 'created':
        return 'text-green-500';
      case 'deleted':
        return 'text-red-500';
      case 'conflict':
        return 'text-orange-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: ProjectFile['status']) => {
    switch (status) {
      case 'modified':
        return <FileText className="w-4 h-4" />;
      case 'created':
        return <Plus className="w-4 h-4" />;
      case 'deleted':
        return <Minus className="w-4 h-4" />;
      case 'conflict':
        return <GitCommit className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const renderDiff = () => {
    if (!selectedFile) return null;

    if (selectedFile.status === 'deleted') {
      return (
        <div className="p-8 text-center text-red-500">
          <Minus className="w-12 h-12 mx-auto mb-4" />
          <p className="font-medium">File deleted</p>
          <p className="text-sm mt-2 text-muted-foreground">{selectedFile.path}</p>
        </div>
      );
    }

    if (selectedFile.status === 'created' && !selectedFile.originalContent) {
      return (
        <div className="p-8 text-center text-green-500">
          <Plus className="w-12 h-12 mx-auto mb-4" />
          <p className="font-medium">New file created</p>
          <p className="text-sm mt-2 text-muted-foreground">{selectedFile.path}</p>
        </div>
      );
    }

    // Simple line-by-line diff
    const originalLines = (selectedFile.originalContent || '').split('\n');
    const newLines = (selectedFile.content || '').split('\n');
    const maxLines = Math.max(originalLines.length, newLines.length);

    const lines = [];
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const newLine = newLines[i] || '';

      if (originalLine !== newLine) {
        if (originalLine && !newLine) {
          // Deleted line
          lines.push({ type: 'deleted', content: originalLine, lineNumber: i + 1 });
        } else if (!originalLine && newLine) {
          // Added line
          lines.push({ type: 'added', content: newLine, lineNumber: i + 1 });
        } else {
          // Modified line
          lines.push(
            { type: 'removed', content: originalLine, lineNumber: i + 1 },
            { type: 'added', content: newLine, lineNumber: i + 1 }
          );
        }
      } else {
        lines.push({ type: 'unchanged', content: originalLine, lineNumber: i + 1 });
      }
    }

    return (
      <div className="font-mono text-xs">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={cn(
              'flex',
              line.type === 'added' && 'bg-green-500/10',
              line.type === 'removed' && 'bg-red-500/10',
              line.type === 'deleted' && 'bg-red-500/10 line-through opacity-50'
            )}
          >
            <span className="w-12 text-right pr-4 text-muted-foreground select-none">
              {line.lineNumber}
            </span>
            <span
              className={cn(
                'flex-1 whitespace-pre',
                line.type === 'added' && 'text-green-600 dark:text-green-400',
                line.type === 'removed' && 'text-red-600 dark:text-red-400',
                line.type === 'unchanged' && 'text-foreground'
              )}
            >
              {line.content || ' '}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* File list sidebar */}
      <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-bold uppercase tracking-wider">Changed Files</span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded"
              title="Close diff"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {files.map(file => (
            <button
              key={file.path}
              onClick={() => {
                setSelectedFile(file);
                onFileClick?.(file);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent/50 transition-colors',
                selectedFile?.path === file.path && 'bg-accent'
              )}
            >
              <span className={getStatusColor(file.status)}>
                {getStatusIcon(file.status)}
              </span>
              <span className="truncate">{file.path}</span>
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
          {files.length} file{files.length !== 1 ? 's' : ''} changed
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFile && (
          <>
            <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-xs font-mono text-muted-foreground">{selectedFile.path}</span>
              <span
                className={cn(
                  'ml-2 px-1.5 py-0.5 text-xs uppercase font-bold',
                  getStatusColor(selectedFile.status)
                )}
              >
                {selectedFile.status}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">{renderDiff()}</div>
          </>
        )}
      </div>
    </div>
  );
}
