import { Loader2, Monitor } from 'lucide-react';

interface SandboxViewProps {
  screenshot: string | null;
  isLoading: boolean;
  error: string | null;
}

export function SandboxView({ screenshot, isLoading, error }: SandboxViewProps) {
  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      {renderContent(isLoading, error, screenshot)}
    </div>
  );
}

function renderContent(isLoading: boolean, error: string | null, screenshot: string | null) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!screenshot) {
    return <EmptyState />;
  }

  return <ScreenshotImage screenshot={screenshot} />;
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      <p className="text-sm text-muted-foreground">Loading sandbox...</p>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
        <span className="text-destructive text-xs">!</span>
      </div>
      <p className="text-sm text-destructive">{error}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center">
        <Monitor className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">Start the sandbox to view</p>
    </div>
  );
}

function ScreenshotImage({ screenshot }: { screenshot: string }) {
  return (
    <img
      src={`data:image/png;base64,${screenshot}`}
      alt="Sandbox view"
      className="max-w-full max-h-full object-contain"
    />
  );
}
