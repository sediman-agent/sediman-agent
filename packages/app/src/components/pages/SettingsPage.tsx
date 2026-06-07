import { useState, useEffect } from 'react';
import { Button } from '@/elements/actions/Button';
import { Input } from '@/elements/form/Input';
import { ToggleSwitch } from '@/elements/form/ToggleSwitch';
import { ScrollArea } from '@/elements/data/ScrollArea';
import { ThemePicker } from '@/elements/feedback/ThemePicker';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';

export function SettingsPage() {
  const apiBaseUrl = useAppStore((state) => state.apiBaseUrl);
  const autoConnect = useAppStore((state) => state.autoConnect);
  const model = useAppStore((state) => state.model);
  const provider = useAppStore((state) => state.provider);
  const headless = useAppStore((state) => state.headless);
  const stealth = useAppStore((state) => state.stealth);
  const setSettings = useAppStore((state) => state.setSettings);
  const theme = useAppStore((state) => state.theme);
  const colorTheme = useAppStore((state) => state.colorTheme);
  const setColorTheme = useAppStore((state) => state.setColorTheme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  const [localSettings, setLocalSettings] = useState({
    apiBaseUrl: apiBaseUrl || 'http://localhost:3001',
    autoConnect,
    model: model || '',
    provider: provider || 'openai',
    headless: headless ?? false,
    stealth: stealth ?? true,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.getVersion()
        .then(setAppVersion)
        .catch(() => setAppVersion('0.3.2'));

      setPlatform(window.electronAPI.getPlatform() || navigator.platform);
    } else {
      setAppVersion('0.3.2');
      setPlatform(navigator.platform);
    }
  }, []);

  const handleSave = () => {
    setSettings(localSettings);
    setHasChanges(false);
    toast.success('Settings saved');
  };

  const handleReset = () => {
    setLocalSettings({
      apiBaseUrl: 'http://localhost:3001',
      autoConnect: true,
      model: '',
      provider: 'openai',
      headless: false,
      stealth: true,
    });
    setHasChanges(true);
  };

  const handleChange = (key: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-background">
        <h1 className="text-xs font-medium">Settings</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs"
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            size="sm"
            className="h-7 px-3 text-xs"
          >
            Save
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-xl mx-auto py-4 px-3 space-y-4">
          <section className="space-y-3">
            <h2 className="text-xs font-medium text-foreground px-1">Appearance</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/30 transition-colors">
                <div className="flex-1">
                  <label className="text-xs font-medium">Color Theme</label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Choose your accent color</p>
                </div>
                <ThemePicker
                  currentTheme={colorTheme}
                  onThemeChange={setColorTheme}
                />
              </div>

              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/30 transition-colors">
                <div>
                  <label className="text-xs font-medium">Dark Mode</label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Use dark color scheme</p>
                </div>
                <ToggleSwitch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => {
                    if (checked !== (theme === 'dark')) {
                      toggleTheme();
                    }
                  }}
                  aria-label="Toggle dark mode"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-medium text-foreground px-1">Connection</h2>
            <div className="space-y-2">
              <div className="py-2 px-2 rounded hover:bg-muted/30 transition-colors">
                <label htmlFor="api-url" className="text-xs font-medium block mb-1">API URL</label>
                <Input
                  id="api-url"
                  value={localSettings.apiBaseUrl}
                  onChange={(e) => handleChange('apiBaseUrl', e.target.value)}
                   placeholder="http://localhost:3001"
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/30 transition-colors">
                <div>
                  <label className="text-xs font-medium">Auto-connect</label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Connect on startup</p>
                </div>
                <ToggleSwitch
                  checked={localSettings.autoConnect}
                  onCheckedChange={(checked) => handleChange('autoConnect', checked)}
                  aria-label="Toggle auto-connect"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-medium text-foreground px-1">Language Model</h2>
            <div className="space-y-2">
              <div className="py-2 px-2 rounded hover:bg-muted/30 transition-colors">
                <label htmlFor="provider-select" className="text-xs font-medium block mb-1">Provider</label>
                <select
                  id="provider-select"
                  value={localSettings.provider}
                  onChange={(e) => handleChange('provider', e.target.value)}
                  className="flex h-8 w-full rounded border border-input bg-background px-2 py-1 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="openai">OpenAI</option>
                  <option value="ollama">Ollama</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>

              <div className="py-2 px-2 rounded hover:bg-muted/30 transition-colors">
                <label htmlFor="model-input" className="text-xs font-medium block mb-1">Model</label>
                <Input
                  id="model-input"
                  value={localSettings.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="gpt-4 or leave empty for default"
                  className="text-xs"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-medium text-foreground px-1">Browser</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/30 transition-colors">
                <div>
                  <label className="text-xs font-medium">Headless Mode</label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Run without visible window</p>
                </div>
                <ToggleSwitch
                  checked={localSettings.headless}
                  onCheckedChange={(checked) => handleChange('headless', checked)}
                  aria-label="Toggle headless mode"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-muted/30 transition-colors">
                <div>
                  <label className="text-xs font-medium">Stealth Mode</label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Anti-detection patches</p>
                </div>
                <ToggleSwitch
                  checked={localSettings.stealth}
                  onCheckedChange={(checked) => handleChange('stealth', checked)}
                  aria-label="Toggle stealth mode"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-medium text-foreground px-1">About</h2>
            <div className="py-2 px-2 rounded hover:bg-muted/30 transition-colors">
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <dt className="text-muted-foreground">Version:</dt>
                <dd className="font-medium text-right">{appVersion}</dd>

                <dt className="text-muted-foreground">Build:</dt>
                <dd className="font-medium text-right">Electron + React</dd>

                <dt className="text-muted-foreground">Platform:</dt>
                <dd className="font-medium text-right">{platform}</dd>

                <dt className="text-muted-foreground">Architecture:</dt>
                <dd className="font-medium text-right">Universal</dd>
              </dl>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
