import { useState, useEffect } from 'react';
import { Server, Check, Key, CheckCircle, AlertCircle, ChevronRight, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/elements/actions/Button';
import { Input } from '@/elements/form/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/elements/data/Card';
import { ScrollArea } from '@/elements/data/ScrollArea';
import { Badge } from '@/elements/feedback/Badge';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';

interface ProviderInfo {
  name: string;
  display_name?: string;
  category: string;
  needs_api_key: boolean;
  has_key: boolean;
}

export function ProviderPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [statuses, setStatuses] = useState<Record<string, 'connected' | 'disconnected' | 'error'>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const setProvider = useAppStore((state) => state.setProvider);
  const setModel = useAppStore((state) => state.setModel);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/model/providers', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch {
      console.error('Failed to load providers');
    }
  };

  const handleSelectProvider = (providerName: string) => {
    setSelectedProvider(providerName);
    // Don't set provider in store yet - wait for backend confirmation
    setExpandedProvider(providerName === expandedProvider ? null : providerName);
    setApiKey('');
  };

  const handleSave = async () => {
    if (!selectedProvider) return;

    try {
      const response = await fetch('http://localhost:3001/api/model/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          api_key: apiKey || undefined
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Only set provider in store after backend confirms
        setProvider(selectedProvider);
        if (result.model) {
          setModel(result.model);
        }
        setStatuses(prev => ({ ...prev, [selectedProvider]: 'connected' }));
        toast.success(`Provider ${selectedProvider} configured successfully`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setStatuses(prev => ({ ...prev, [selectedProvider]: 'error' }));
        toast.error(`Failed to configure provider: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatuses(prev => ({ ...prev, [selectedProvider]: 'error' }));
      toast.error('Failed to configure provider: Network error');
    }
  };

  const getStatusIcon = (providerName: string) => {
    const status = statuses[providerName];
    if (status === 'connected') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusBadge = (provider: ProviderInfo) => {
    if (provider.has_key) {
      return <Badge variant="success" className="text-xs">Configured</Badge>;
    } else if (provider.needs_api_key) {
      return <Badge variant="warning" className="text-xs">Needs Key</Badge>;
    } else {
      return <Badge variant="info" className="text-xs">No Key Needed</Badge>;
    }
  };

  const filteredProviders = providers.filter((provider) => {
    const query = searchQuery.toLowerCase();
    return (
      provider.name.toLowerCase().includes(query) ||
      (provider.display_name?.toLowerCase() || '').includes(query) ||
      provider.category.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        icon={Server}
        title="Provider"
        subtitle="Configure your LLM provider"
      />

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search providers..."
              className="pl-10"
            />
          </div>

          {/* Providers List */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Providers</h2>

            {filteredProviders.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {searchQuery ? 'No providers match your search' : 'No providers found'}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredProviders.map((provider) => {
                  const isExpanded = expandedProvider === provider.name;
                  const isSelected = selectedProvider === provider.name;

                  return (
                    <Card
                      key={provider.name}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'border-primary' : ''
                      }`}
                      onClick={() => handleSelectProvider(provider.name)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <CardTitle className="text-base">{provider.display_name || provider.name}</CardTitle>
                              {getStatusBadge(provider)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="w-5 h-5 text-primary" />}
                            {getStatusIcon(provider.name)}
                            <ChevronRight
                              className={`w-4 h-4 text-muted-foreground transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="pt-0 space-y-4">
                          {provider.needs_api_key && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <label className="text-sm font-medium mb-2 block">API Key</label>
                              <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-xxx..."
                                className="mb-2"
                              />
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSave();
                                }}
                                disabled={!apiKey}
                                className="w-full"
                              >
                                <Key className="w-4 h-4 mr-2" />
                                Save API Key
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
