import { Database } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

export function MemoryPage() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <PageHeader
        icon={Database}
        title="Memory"
        subtitle="Agent memory system"
      />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Memory Page</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Memory management coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
