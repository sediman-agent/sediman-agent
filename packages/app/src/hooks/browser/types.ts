/**
 * Browser Command Types
 * Type definitions for browser automation commands
 */

export interface BrowserCommand {
  id: string;
  action: 'navigate' | 'snapshot' | 'click' | 'type' | 'screenshot' | 'wait';
  params?: any;
  url?: string;
  text?: string;
  refId?: number;
  submit?: boolean;
  snapshot?: BrowserSnapshot;
}

export interface BrowserSnapshot {
  elements: Array<{
    refId: number;
    tag: string;
    type?: string;
    text: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    visible?: boolean;
  }>;
  url?: string;
  title?: string;
}

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  url?: string;
  title?: string;
  elements?: any[];
  tagName?: string;
  strategy?: string;
  found?: boolean;
  screenshot?: string;
}

export interface WebviewController {
  navigate: (url: string) => Promise<{ success: boolean; url: string }>;
  click: (x: number, y: number) => Promise<{ success: boolean; tagName?: string; error?: string }>;
  type: (selector: string, text: string) => Promise<{ success: boolean; error?: string }>;
  snapshot: () => Promise<{ success: boolean; url?: string; title?: string; elements?: any[]; error?: string }>;
  evaluate: (script: string) => Promise<{ success: boolean; result?: any; error?: string }>;
  getURL: () => string;
  reload: () => void;
  goBack: () => void;
  goForward: () => void;
}

export type BrowserStatus = 'idle' | 'connecting' | 'ready' | 'error';
