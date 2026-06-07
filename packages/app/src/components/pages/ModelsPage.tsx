import { useState, useEffect } from 'react';
import { Bot, Check, Copy, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/elements/actions/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/elements/data/Card';
import { ScrollArea } from '@/elements/data/ScrollArea';
import { useAppStore } from '@/stores/useAppStore';

interface Model {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  description: string;
}

export function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const currentModel = useAppStore((state) => state.model);
  const currentProvider = useAppStore((state) => state.provider);
  const setCurrentModel = useAppStore((state) => state.setModel);

  useEffect(() => {
    if (currentModel) {
      setSelectedModel(currentModel);
    }
  }, [currentModel]);

  useEffect(() => {
    loadModels();
  }, [currentProvider]);

  const loadModels = async () => {
    if (!currentProvider) {
      setModels([]);
      return;
    }

    try {
      // Fetch models for the specific provider
      const response = await fetch(`http://localhost:3001/api/model/list?provider=${currentProvider}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        // Map models from the provider-specific response
        const providerModels = (data.models || []).map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          provider: currentProvider,
          contextLength: 128000, // Default context length
          description: `Model by ${currentProvider}`
        }));
        setModels(providerModels);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setModels([]);
    }
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setCurrentModel(modelId);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
  };

  if (!currentProvider) {
    return (
      <div className="flex flex-col h-full bg-background">
        <PageHeader
          icon={Bot}
          title="Models"
          subtitle="Select AI model for agent"
        />
        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto p-6">
            <Card className="border-warning">
              <CardContent className="p-8 text-center text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm">
                  Please configure a provider first in the Provider page
                </p>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        icon={Bot}
        title="Models"
        subtitle={`Available models for ${currentProvider}`}
      />

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Current Selection */}
          {selectedModel && (
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Current Model</CardTitle>
                    <CardDescription>
                      {models.find(m => m.id === selectedModel)?.name}
                    </CardDescription>
                  </div>
                  <Check className="w-5 h-5 text-primary" />
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Models */}
          {models.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No models found for provider: {currentProvider}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {models.map((model) => (
                <Card
                  key={model.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedModel === model.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleSelectModel(model.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{model.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {model.description}
                        </CardDescription>
                      </div>
                      {selectedModel === model.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Context</span>
                      <span className="font-mono font-medium">
                        {(model.contextLength / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyId(model.id);
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy ID
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
