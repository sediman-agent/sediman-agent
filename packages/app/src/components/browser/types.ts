/**
 * Browser Automation UI - Industrial Grade Refactor
 * Following design patterns: POM, Factory, Facade, Singleton
 * TypeScript-first approach with proper type safety
 */

// ============================================================================
// Type Definitions (TypeScript First)
// ============================================================================

/**
 * Browser state types
 */
export type BrowserStatus = 'idle' | 'navigating' | 'loading' | 'error' | 'active';

export interface BrowserState {
  status: BrowserStatus;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  loading: boolean;
  favicon?: string;
  status: BrowserStatus;
}

export interface ScreenshotData {
  data: string;
  url: string;
  timestamp: number;
  age: number;
}

export interface BrowserAction {
  type: 'navigate' | 'back' | 'forward' | 'refresh' | 'screenshot' | 'extract';
  payload?: Record<string, unknown>;
}

// ============================================================================
// Page Object Model (POM) Pattern
// ============================================================================

/**
 * BrowserPage - Encapsulates browser page interactions
 */
export class BrowserPage {
  private url: string;
  private title: string;

  constructor(url: string, title: string = 'New Page') {
    this.url = url;
    this.title = title;
  }

  getUrl(): string {
    return this.url;
  }

  getTitle(): string {
    return this.title;
  }

  isExternal(): boolean {
    return this.url.startsWith('http://') || this.url.startsWith('https://');
  }

  isSafe(): boolean {
    return this.url.startsWith('about:') ||
           this.url.startsWith('data:') ||
           this.url.startsWith('file:') ||
           !this.url.startsWith('http');
  }

  toTab(): BrowserTab {
    return {
      id: this.generateId(),
      url: this.url,
      title: this.title,
      loading: false,
      status: 'idle'
    };
  }

  private generateId(): string {
    return `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static fromUrl(url: string): BrowserPage {
    return new BrowserPage(url, 'New Page');
  }
}

// ============================================================================
// Factory Pattern
// ============================================================================

/**
 * BrowserTabFactory - Creates browser tabs with proper defaults
 */
export class BrowserTabFactory {
  private static instance: BrowserTabFactory;

  private constructor() {}

  static getInstance(): BrowserTabFactory {
    if (!BrowserTabFactory.instance) {
      BrowserTabFactory.instance = new BrowserTabFactory();
    }
    return BrowserTabFactory.instance;
  }

  createBlankTab(): BrowserTab {
    return {
      id: this.generateId(),
      url: 'https://www.google.com',
      title: 'Google',
      loading: false,
      status: 'idle'
    };
  }

  createTabFromUrl(url: string): BrowserTab {
    const page = BrowserPage.fromUrl(url);
    return page.toTab();
  }

  createTabFromPage(page: BrowserPage): BrowserTab {
    return page.toTab();
  }

  private generateId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Facade Pattern - BrowserService Facade
// ============================================================================

/**
 * BrowserServiceFacade - Simplifies browser operations
 * Provides a clean interface for UI components
 */
export class BrowserServiceFacade {
  private tabs: BrowserTab[] = [];
  private activeTabId: string;
  private state: BrowserState;

  constructor() {
    this.activeTabId = '';
    this.state = {
      status: 'idle',
      url: '',
      title: '',
      canGoBack: false,
      canGoForward: false,
      isLoading: false,
      error: null
    };

    // Initialize with one blank tab
    const factory = BrowserTabFactory.getInstance();
    const blankTab = factory.createBlankTab();
    this.tabs.push(blankTab);
    this.activeTabId = blankTab.id;
  }

  // Tab Management
  getTabs(): BrowserTab[] {
    return [...this.tabs];
  }

  getActiveTab(): BrowserTab | null {
    return this.tabs.find(tab => tab.id === this.activeTabId) || null;
  }

  getActiveTabId(): string {
    return this.activeTabId;
  }

  setActiveTab(tabId: string): void {
    if (this.tabs.find(tab => tab.id === tabId)) {
      this.activeTabId = tabId;
    }
  }

  addTab(): BrowserTab {
    const factory = BrowserTabFactory.getInstance();
    const newTab = factory.createBlankTab();
    this.tabs.push(newTab);
    this.activeTabId = newTab.id;
    return newTab;
  }

  closeTab(tabId: string): void {
    if (this.tabs.length <= 1) return; // Keep at least one tab

    const index = this.tabs.findIndex(tab => tab.id === tabId);
    if (index === -1) return;

    this.tabs = this.tabs.filter(tab => tab.id !== tabId);

    // Set new active tab
    if (this.activeTabId === tabId) {
      this.activeTabId = this.tabs[0].id;
    }
  }

  updateTab(tabId: string, updates: Partial<BrowserTab>): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      Object.assign(tab, updates);
    }
  }

  // State Management
  getState(): BrowserState {
    return { ...this.state };
  }

  updateState(updates: Partial<BrowserState>): void {
    this.state = { ...this.state, ...updates };
  }
}

// ============================================================================
// UI Component Helpers
// ============================================================================

/**
 * BrowserStatusIndicator - Status display utilities
 */
export class BrowserStatusIndicator {
  static getStatusMessage(status: BrowserStatus): string {
    const messages = {
      idle: 'Ready',
      navigating: 'Navigating...',
      loading: 'Loading...',
      error: 'Error',
      active: 'Active'
    };
    return messages[status] || 'Unknown';
  }

  static getStatusColor(status: BrowserStatus): string {
    const colors = {
      idle: 'text-green-600',
      navigating: 'text-blue-600',
      loading: 'text-yellow-600',
      error: 'text-red-600',
      active: 'text-blue-500'
    };
    return colors[status] || 'text-gray-600';
  }

  static getStatusIcon(status: BrowserStatus): 'Wifi' | 'WifiOff' | 'Loader2' | 'AlertTriangle' {
    const icons = {
      idle: 'Wifi' as const,
      navigating: 'Loader2' as const,
      loading: 'Loader2' as const,
      error: 'AlertTriangle' as const,
      active: 'Wifi' as const
    };
    return icons[status] || 'WifiOff';
  }
}

/**
 * ScreenshotDisplay - Manages screenshot display logic
 */
export class ScreenshotDisplay {
  static isValid(screenshot: ScreenshotData | null): boolean {
    if (!screenshot) return false;

    // Check if has valid data - very permissive for debugging
    return !!(screenshot.data && screenshot.data.length > 0);
  }

  static getDisplayUrl(screenshot: ScreenshotData): string {
    return screenshot.url || 'Unknown';
  }

  static getImageSource(screenshot: ScreenshotData): string {
    return `data:image/png;base64,${screenshot.data}`;
  }
}

/**
 * UrlValidator - URL validation utilities
 */
export class UrlValidator {
  static isValidUrl(url: string): boolean {
    if (!url || url.trim().length === 0) return false;

    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  static normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return '';

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  static isExternalUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  static isSafeUrl(url: string): boolean {
    return url.startsWith('about:') ||
           url.startsWith('data:') ||
           url.startsWith('file:') ||
           !url.startsWith('http');
  }
}

// ============================================================================
// Constants
// ============================================================================

export const BROWSER_CONSTANTS = {
  POLLING_INTERVAL: 3000,
  SCREENSHOT_API_URL: 'http://localhost:3001/api/browser/screenshot',
  MAX_HISTORY_SIZE: 100,
  SCREENSHOT_MAX_AGE: 30000,
  NAVIGATION_TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
} as const;

export const BROWSER_UI_CONFIG = {
  animations: {
    fadeIn: 'transition-opacity duration-200',
    slideIn: 'transition-transform duration-200',
    pulse: 'animate-pulse',
  },
  colors: {
    primary: 'text-primary',
    secondary: 'text-muted-foreground',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  },
  spacing: {
    xs: '1',
    sm: '2',
    md: '4',
    lg: '6',
  },
  borderRadius: 'rounded-md',
} as const;

// ============================================================================
// Action Types
// ============================================================================

export type BrowserActionType =
  | 'NAVIGATE'
  | 'BACK'
  | 'FORWARD'
  | 'REFRESH'
  | 'SCREENSHOT'
  | 'EXTRACT_TEXT'
  | 'SNAPSHOT'
  | 'CLICK'
  | 'TYPE';

export interface BrowserActionRequest {
  type: BrowserActionType;
  payload?: Record<string, unknown>;
  requestId?: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface BrowserEvent {
  type: 'tab-change' | 'state-change' | 'screenshot-updated' | 'error';
  timestamp: number;
  data: unknown;
}

export interface ScreenshotEvent extends BrowserEvent {
  type: 'screenshot-updated';
  data: ScreenshotData;
}

export interface StateChangeEvent extends BrowserEvent {
  type: 'state-change';
  data: BrowserState;
}

// ============================================================================
// Error Types
// ============================================================================

export class BrowserError extends Error {
  constructor(message: string, public code: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'BrowserError';
  }
}

export class NavigationError extends BrowserError {
  constructor(url: string, reason: string) {
    super(`Navigation failed for ${url}: ${reason}`, 'NAV_ERROR');
  }
}

export class ScreenshotError extends BrowserError {
  constructor(reason: string) {
    super(`Screenshot failed: ${reason}`, 'SCREENSHOT_ERROR');
  }
}

// ============================================================================
// Validation Utilities
// ============================================================================

export class BrowserValidationUtils {
  static validateTabId(tabId: string, availableTabs: BrowserTab[]): boolean {
    return availableTabs.some(tab => tab.id === tabId);
  }

  static validateUrl(url: string): { valid: boolean; error?: string } {
    if (!url || url.trim().length === 0) {
      return { valid: false, error: 'URL cannot be empty' };
    }

    if (url.length > 2048) {
      return { valid: false, error: 'URL is too long (max 2048 characters)' };
    }

    const normalized = UrlValidator.normalizeUrl(url);
    if (!UrlValidator.isValidUrl(normalized)) {
      return { valid: false, error: 'Invalid URL format' };
    }

    return { valid: true };
  }

  static validateScreenshotAge(screenshot: ScreenshotData): boolean {
    const age = Date.now() - screenshot.timestamp;
    return age <= BROWSER_CONSTANTS.SCREENSHOT_MAX_AGE;
  }
}

// ============================================================================
// Export all utilities
// ============================================================================

export const BrowserUtils = {
  // Status helpers
  status: BrowserStatusIndicator,
  display: ScreenshotDisplay,
  urlValidator: UrlValidator,
  errors: { BrowserError, NavigationError, ScreenshotError },
  validation: BrowserValidationUtils,
  constants: BROWSER_CONSTANTS,
  config: BROWSER_UI_CONFIG,
};
