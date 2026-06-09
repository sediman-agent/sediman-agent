import { cn } from '@/lib/utils';

type ThemeType = 'default' | 'blue' | 'purple' | 'green' | 'rose' | 'cyan';

interface ThemePickerProps {
  currentTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
}

const themes = [
  { id: 'default', name: 'Orange', color: 'hsl(25 96% 64%)' },
  { id: 'blue', name: 'Blue', color: 'hsl(199 89% 60%)' },
  { id: 'purple', name: 'Purple', color: 'hsl(263 70% 60%)' },
  { id: 'green', name: 'Green', color: 'hsl(142 76% 50%)' },
  { id: 'rose', name: 'Rose', color: 'hsl(350 89% 60%)' },
  { id: 'cyan', name: 'Cyan', color: 'hsl(188 94% 43%)' },
];

export function ThemePicker({ currentTheme, onThemeChange }: ThemePickerProps) {
  // Handle themes like "blue" or "theme-blue"
  const normalizeTheme = (theme: string | undefined) => {
    if (!theme) return 'default';
    return theme.replace('theme-', '');
  };

  const activeTheme = normalizeTheme(currentTheme);

  return (
    <div className="flex gap-1 flex-wrap">
      {themes.map((theme) => {
        const isActive = activeTheme === theme.id || (activeTheme === 'default' && theme.id === 'default');

        return (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme.id as ThemeType)}
            className={cn(
              'relative flex items-center justify-center w-7 h-7 rounded border transition-all duration-150',
              'hover:scale-105 active:scale-95',
              isActive
                ? 'border-primary shadow-sm scale-105'
                : 'border-border hover:border-primary/50'
            )}
            title={theme.name}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: theme.color }}
            />
            {isActive && (
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
