import { useState, useEffect } from 'react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { ScrollArea } from '@/components/shared/ScrollArea';
import { ThemePicker } from '@/components/shared/ThemePicker';
import { useAppStore } from '@/stores/useAppStore';

export function SettingsPage() {
  const rpcUrl = useAppStore((state) => state.rpcUrl);
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
    rpcUrl,
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
    // Load app info from Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.getVersion()
        .then(setAppVersion)
        .catch(() => setAppVersion('0.3.2'));

      // Get platform from Electron
      setPlatform(window.electronAPI.platform || navigator.platform);
    } else {
      setAppVersion('0.3.2');
      setPlatform(navigator.platform);
    }
  }, []);

  const handleSave = () => {
    setSettings(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings({
      rpcUrl: 'ws://localhost:8765',
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
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
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

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-xl mx-auto py-4 px-3 space-y-4">
          {/* Appearance */}
          <div className="space-y-3">
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
                />
              </div>
            </div>
          </div>

          {/* RPC Settings */}
          <div className="space-y-3">
            <h2 className="text-xs font-medium text-foreground px-1">Connection</h2>
            <div className="space-y-2">
              <div className="py-2 px-2 rounded hover:bg-muted/30 transition-colors">
                <label className="text-xs font-medium block mb-1">RPC URL</label>
                <Input
                  value={localSettings.rpcUrl}
                  onChange={(e) => handleChange('rpcUrl', e.target.value)}
                  placeholder="ws://localhost:8765"
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
                />
              </div>
            </div>
          </div>

          {/* LLM Settings */}
          <div className="space-y-3">
            <h2 className="text-xs font-medium text-foreground px-1">Language Model</h2>
            <div className="space-y-2">
              <div className="py-2 px-2 rounded hover:bg-muted/30 transition-colors">
                <label className="text-xs font-medium block mb-1">Provider</label>
                <select
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
                <label className="text-xs font-medium block mb-1">Model</label>
                <Input
                  value={localSettings.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="gpt-4 or leave empty for default"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Browser Settings */}
          <div className="space-y-3">
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
                />
              </div>
            </div>
          </div>

          {/* About */}
          <div className="space-y-3">
            <h2 className="text-xs font-medium text-foreground px-1">About</h2>
            <div className="py-2 px-2 rounded hover:bg-muted/30 transition-colors">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-medium text-right">{appVersion}</span>

                <span className="text-muted-foreground">Build:</span>
                <span className="font-medium text-right">Electron + React</span>

                <span className="text-muted-foreground">Platform:</span>
                <span className="font-medium text-right">{platform}</span>

                <span className="text-muted-foreground">Architecture:</span>
                <span className="font-medium text-right">Universal</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
