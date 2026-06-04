import { Bot, Settings } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

export function ModelsPage() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        icon={Bot}
        title="Models"
        subtitle="Manage AI models"
        iconVariant="primary"
      />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-sm font-medium">Models Page</h2>
          <p className="text-xs text-muted-foreground mt-2">
            Model management coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
