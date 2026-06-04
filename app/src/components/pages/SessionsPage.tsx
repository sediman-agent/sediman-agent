import { History, Settings } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

export function SessionsPage() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        icon={History}
        title="Sessions"
        subtitle="Chat sessions"
        iconVariant="primary"
      />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Sessions Page</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Session management coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
