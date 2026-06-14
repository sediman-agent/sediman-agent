/**
 * WelcomeState — the empty-state shown on AgentPage when there are no messages.
 *
 * Replaces the previously-blank centered div with a purposeful onboarding
 * surface: a headline, a short description, and a row of clickable example
 * prompts that populate the composer. This matches the UX bar set by
 * browser-use and other industrial agent UIs, which never leave a first-time
 * user staring at an empty canvas.
 */

import { useCallback } from 'react';
import { Sparkles, Globe, Camera, MousePointer, Search } from 'lucide-react';

export interface WelcomePrompt {
  /** Icon shown to the left of the prompt label. */
  icon: typeof Globe;
  /** Short, human-readable prompt text. */
  label: string;
  /** The text inserted into the composer when the prompt is clicked. */
  prompt: string;
}

const DEFAULT_PROMPTS: WelcomePrompt[] = [
  {
    icon: Globe,
    label: 'Navigate to a website',
    prompt: 'Navigate to https://news.ycombinator.com and summarize the top story',
  },
  {
    icon: Search,
    label: 'Research a topic',
    prompt: 'Search the web for the latest news about AI agents and summarize key findings',
  },
  {
    icon: Camera,
    label: 'Take a screenshot',
    prompt: 'Take a screenshot of the current page and describe what you see',
  },
  {
    icon: MousePointer,
    label: 'Fill a form',
    prompt: 'Go to google.com and search for "playwright browser automation"',
  },
];

export interface WelcomeStateProps {
  /** Called with the chosen prompt's text. */
  onSelectPrompt?: (prompt: string) => void;
  /** Override the default example prompts. */
  prompts?: WelcomePrompt[];
}

export function WelcomeState({ onSelectPrompt, prompts = DEFAULT_PROMPTS }: WelcomeStateProps) {
  const handleClick = useCallback(
    (prompt: string) => {
      onSelectPrompt?.(prompt);
    },
    [onSelectPrompt]
  );

  return (
    <div
      className="flex flex-col items-center justify-center h-full text-center"
      style={{ padding: '48px 16px' }}
      role="region"
      aria-label="Welcome"
    >
      {/* Hero icon */}
      <div
        className="mb-5 p-4 rounded-full"
        style={{
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-secondary-text)',
        }}
        aria-hidden="true"
      >
        <Sparkles size={32} />
      </div>

      {/* Headline */}
      <h2
        className="text-base font-semibold mb-2"
        style={{ color: 'var(--vscode-foreground)' }}
      >
        How can I help you today?
      </h2>

      {/* Description */}
      <p
        className="text-xs mb-8 max-w-sm mx-auto"
        style={{ color: 'var(--vscode-secondary-text)', lineHeight: 1.6 }}
      >
        I can browse the web, click, type, extract data, and automate repetitive
        tasks. Try one of these, or type your own request below.
      </p>

      {/* Example prompts */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full"
        role="list"
      >
        {prompts.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.label} role="listitem" className="contents">
              <button
                type="button"
                onClick={() => handleClick(p.prompt)}
                className="flex items-center gap-3 text-left p-3 rounded transition-all duration-150 border"
                style={{
                  backgroundColor: 'var(--vscode-input-background)',
                  borderColor: 'var(--vscode-border-color)',
                  color: 'var(--vscode-foreground)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                  e.currentTarget.style.borderColor = 'var(--vscode-focus-border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-input-background)';
                  e.currentTarget.style.borderColor = 'var(--vscode-border-color)';
                }}
                aria-label={p.label}
              >
                <Icon
                  size={16}
                  style={{ color: 'var(--vscode-secondary-text)', flexShrink: 0 }}
                  aria-hidden="true"
                />
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--vscode-foreground)' }}
                  >
                    {p.label}
                  </span>
                  <span
                    className="text-[11px] truncate"
                    style={{ color: 'var(--vscode-secondary-text)' }}
                  >
                    {p.prompt}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
