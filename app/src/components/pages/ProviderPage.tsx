import { Server, Settings } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

export function ProviderPage() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        icon={Server}
        title="Provider"
        subtitle="Configure LLM provider"
        iconVariant="primary"
      />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Provider Page</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Provider configuration coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
