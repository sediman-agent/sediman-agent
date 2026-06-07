/**
 * Component Tests for Browser Types and Utilities
 * Tests the core browser functionality used throughout the UI
 */

import { describe, it, expect } from '@jest/globals';
import {
  BrowserPage,
  BrowserTabFactory,
  BrowserServiceFacade,
  BrowserStatusIndicator,
  ScreenshotDisplay,
  UrlValidator,
  BrowserValidationUtils,
  BrowserError,
  NavigationError,
  ScreenshotError,
  BROWSER_CONSTANTS,
  type BrowserTab,
  type BrowserState,
  type ScreenshotData,
} from '../browser/types';

describe('Browser Types and Utilities', () => {
  describe('BrowserPage (POM Pattern)', () => {
    it('should create a page from URL', () => {
      const page = BrowserPage.fromUrl('https://example.com');
      expect(page.getUrl()).toBe('https://example.com');
      expect(page.getTitle()).toBe('New Page');
    });

    it('should create a page with custom title', () => {
      const page = new BrowserPage('https://example.com', 'Custom Title');
      expect(page.getTitle()).toBe('Custom Title');
    });

    it('should identify external URLs correctly', () => {
      const httpPage = new BrowserPage('http://example.com');
      const httpsPage = new BrowserPage('https://example.com');
      const aboutPage = new BrowserPage('about:blank');

      expect(httpPage.isExternal()).toBe(true);
      expect(httpsPage.isExternal()).toBe(true);
      expect(aboutPage.isExternal()).toBe(false);
    });

    it('should identify safe URLs correctly', () => {
      const aboutPage = new BrowserPage('about:blank');
      const dataPage = new BrowserPage('data:text/html,test');
      const filePage = new BrowserPage('file:///path/to/file');
      const httpPage = new BrowserPage('http://example.com');

      expect(aboutPage.isSafe()).toBe(true);
      expect(dataPage.isSafe()).toBe(true);
      expect(filePage.isSafe()).toBe(true);
      expect(httpPage.isSafe()).toBe(false);
    });

    it('should convert to tab correctly', () => {
      const page = new BrowserPage('https://example.com', 'Test Page');
      const tab = page.toTab();

      expect(tab.url).toBe('https://example.com');
      expect(tab.title).toBe('Test Page');
      expect(tab.loading).toBe(false);
      expect(tab.status).toBe('idle');
      expect(tab.id).toBeDefined();
    });
  });

  describe('BrowserTabFactory (Factory/Singleton Pattern)', () => {
    it('should return same instance (Singleton)', () => {
      const factory1 = BrowserTabFactory.getInstance();
      const factory2 = BrowserTabFactory.getInstance();

      expect(factory1).toBe(factory2);
    });

    it('should create blank tab', () => {
      const factory = BrowserTabFactory.getInstance();
      const tab = factory.createBlankTab();

      expect(tab.url).toBe('about:blank');
      expect(tab.title).toBe('New Tab');
      expect(tab.loading).toBe(false);
      expect(tab.status).toBe('idle');
    });

    it('should create tab from URL', () => {
      const factory = BrowserTabFactory.getInstance();
      const tab = factory.createTabFromUrl('https://example.com');

      expect(tab.url).toBe('https://example.com');
      expect(tab.title).toBe('New Page');
    });

    it('should create tab from page', () => {
      const factory = BrowserTabFactory.getInstance();
      const page = new BrowserPage('https://example.com', 'Custom Title');
      const tab = factory.createTabFromPage(page);

      expect(tab.url).toBe('https://example.com');
      expect(tab.title).toBe('Custom Title');
    });

    it('should generate unique IDs for each tab', () => {
      const factory = BrowserTabFactory.getInstance();
      const tab1 = factory.createBlankTab();
      const tab2 = factory.createBlankTab();

      expect(tab1.id).not.toBe(tab2.id);
    });
  });

  describe('BrowserServiceFacade (Facade Pattern)', () => {
    it('should initialize with blank tab', () => {
      const facade = new BrowserServiceFacade();
      const tabs = facade.getTabs();

      expect(tabs.length).toBe(1);
      expect(tabs[0].url).toBe('about:blank');
    });

    it('should manage active tab correctly', () => {
      const facade = new BrowserServiceFacade();
      const activeTab = facade.getActiveTab();

      expect(activeTab).toBeDefined();
      expect(activeTab?.url).toBe('about:blank');
    });

    it('should add new tab correctly', () => {
      const facade = new BrowserServiceFacade();
      const initialCount = facade.getTabs().length;

      const newTab = facade.addTab();

      expect(facade.getTabs().length).toBe(initialCount + 1);
      expect(newTab.url).toBe('about:blank');
    });

    it('should close tab correctly', () => {
      const facade = new BrowserServiceFacade();
      facade.addTab(); // Add second tab

      const tabs = facade.getTabs();
      const initialCount = tabs.length;

      facade.closeTab(tabs[0].id);

      expect(facade.getTabs().length).toBe(initialCount - 1);
    });

    it('should not close last tab', () => {
      const facade = new BrowserServiceFacade();
      const tabs = facade.getTabs();
      const tabId = tabs[0].id;

      facade.closeTab(tabId);

      expect(facade.getTabs().length).toBe(1); // Should keep at least one tab
    });

    it('should update tab correctly', () => {
      const facade = new BrowserServiceFacade();
      const tabs = facade.getTabs();
      const tabId = tabs[0].id;

      facade.updateTab(tabId, {
        url: 'https://example.com',
        title: 'Updated Title',
        status: 'loading'
      });

      const updatedTab = facade.getTabs().find(t => t.id === tabId);
      expect(updatedTab?.url).toBe('https://example.com');
      expect(updatedTab?.title).toBe('Updated Title');
      expect(updatedTab?.status).toBe('loading');
    });

    it('should manage state correctly', () => {
      const facade = new BrowserServiceFacade();
      const initialState = facade.getState();

      expect(initialState.status).toBe('idle');
      expect(initialState.url).toBe('');

      facade.updateState({
        status: 'loading',
        url: 'https://example.com'
      });

      const updatedState = facade.getState();
      expect(updatedState.status).toBe('loading');
      expect(updatedState.url).toBe('https://example.com');
    });

    it('should set active tab correctly', () => {
      const facade = new BrowserServiceFacade();
      const newTab = facade.addTab();

      facade.setActiveTab(newTab.id);

      expect(facade.getActiveTabId()).toBe(newTab.id);
      expect(facade.getActiveTab()?.id).toBe(newTab.id);
    });
  });

  describe('BrowserStatusIndicator', () => {
    it('should return correct status messages', () => {
      expect(BrowserStatusIndicator.getStatusMessage('idle')).toBe('Ready');
      expect(BrowserStatusIndicator.getStatusMessage('navigating')).toBe('Navigating...');
      expect(BrowserStatusIndicator.getStatusMessage('loading')).toBe('Loading...');
      expect(BrowserStatusIndicator.getStatusMessage('error')).toBe('Error');
      expect(BrowserStatusIndicator.getStatusMessage('active')).toBe('Active');
    });

    it('should return correct status colors', () => {
      expect(BrowserStatusIndicator.getStatusColor('idle')).toBe('text-green-600');
      expect(BrowserStatusIndicator.getStatusColor('navigating')).toBe('text-blue-600');
      expect(BrowserStatusIndicator.getStatusColor('loading')).toBe('text-yellow-600');
      expect(BrowserStatusIndicator.getStatusColor('error')).toBe('text-red-600');
    });

    it('should return correct status icons', () => {
      expect(BrowserStatusIndicator.getStatusIcon('idle')).toBe('Wifi');
      expect(BrowserStatusIndicator.getStatusIcon('navigating')).toBe('Loader2');
      expect(BrowserStatusIndicator.getStatusIcon('loading')).toBe('Loader2');
      expect(BrowserStatusIndicator.getStatusIcon('error')).toBe('AlertTriangle');
    });
  });

  describe('ScreenshotDisplay', () => {
    it('should validate screenshot correctly', () => {
      const validScreenshot: ScreenshotData = {
        url: 'https://example.com',
        data: 'a'.repeat(200), // Valid base64 data
        timestamp: Date.now(),
        age: 1000
      };

      const invalidScreenshot: ScreenshotData = {
        url: 'https://example.com',
        data: 'short',
        timestamp: Date.now() - 40000, // Too old
        age: 40000
      };

      expect(ScreenshotDisplay.isValid(validScreenshot)).toBe(true);
      expect(ScreenshotDisplay.isValid(invalidScreenshot)).toBe(false);
      expect(ScreenshotDisplay.isValid(null)).toBe(false);
    });

    it('should get display URL correctly', () => {
      const screenshot: ScreenshotData = {
        url: 'https://example.com',
        data: 'data',
        timestamp: Date.now(),
        age: 1000
      };

      expect(ScreenshotDisplay.getDisplayUrl(screenshot)).toBe('https://example.com');
    });

    it('should generate correct image source', () => {
      const screenshot: ScreenshotData = {
        url: 'https://example.com',
        data: 'base64data',
        timestamp: Date.now(),
        age: 1000
      };

      expect(ScreenshotDisplay.getImageSource(screenshot)).toBe('data:image/png;base64,base64data');
    });
  });

  describe('UrlValidator', () => {
    it('should validate URLs correctly', () => {
      expect(UrlValidator.isValidUrl('https://example.com')).toBe(true);
      expect(UrlValidator.isValidUrl('http://example.com')).toBe(true);
      expect(UrlValidator.isValidUrl('example.com')).toBe(true);
      expect(UrlValidator.isValidUrl('')).toBe(false);
      expect(UrlValidator.isValidUrl('not a url')).toBe(false);
    });

    it('should normalize URLs correctly', () => {
      expect(UrlValidator.normalizeUrl('example.com')).toBe('https://example.com');
      expect(UrlValidator.normalizeUrl('https://example.com')).toBe('https://example.com');
      expect(UrlValidator.normalizeUrl('http://example.com')).toBe('http://example.com');
      expect(UrlValidator.normalizeUrl('')).toBe('');
    });

    it('should identify external URLs correctly', () => {
      expect(UrlValidator.isExternalUrl('https://example.com')).toBe(true);
      expect(UrlValidator.isExternalUrl('http://example.com')).toBe(true);
      expect(UrlValidator.isExternalUrl('about:blank')).toBe(false);
      expect(UrlValidator.isExternalUrl('data:text/html,test')).toBe(false);
    });

    it('should identify safe URLs correctly', () => {
      expect(UrlValidator.isSafeUrl('about:blank')).toBe(true);
      expect(UrlValidator.isSafeUrl('data:text/html,test')).toBe(true);
      expect(UrlValidator.isSafeUrl('file:///path')).toBe(true);
      expect(UrlValidator.isSafeUrl('https://example.com')).toBe(false);
    });
  });

  describe('BrowserValidationUtils', () => {
    it('should validate tab IDs correctly', () => {
      const tabs: BrowserTab[] = [
        { id: 'tab-1', url: 'https://example.com', title: 'Example', loading: false, status: 'idle' },
        { id: 'tab-2', url: 'https://example.org', title: 'Example Org', loading: false, status: 'idle' }
      ];

      expect(BrowserValidationUtils.validateTabId('tab-1', tabs)).toBe(true);
      expect(BrowserValidationUtils.validateTabId('tab-3', tabs)).toBe(false);
    });

    it('should validate URLs correctly', () => {
      const validResult = BrowserValidationUtils.validateUrl('https://example.com');
      expect(validResult.valid).toBe(true);

      const emptyResult = BrowserValidationUtils.validateUrl('');
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.error).toBe('URL cannot be empty');

      const longUrl = 'a'.repeat(2049);
      const longResult = BrowserValidationUtils.validateUrl(longUrl);
      expect(longResult.valid).toBe(false);
      expect(longResult.error).toContain('too long');
    });

    it('should validate screenshot age correctly', () => {
      const freshScreenshot: ScreenshotData = {
        url: 'https://example.com',
        data: 'data',
        timestamp: Date.now() - 1000,
        age: 1000
      };

      const oldScreenshot: ScreenshotData = {
        url: 'https://example.com',
        data: 'data',
        timestamp: Date.now() - 40000,
        age: 40000
      };

      expect(BrowserValidationUtils.validateScreenshotAge(freshScreenshot)).toBe(true);
      expect(BrowserValidationUtils.validateScreenshotAge(oldScreenshot)).toBe(false);
    });
  });

  describe('Error Classes', () => {
    it('should create BrowserError correctly', () => {
      const error = new BrowserError('Test error', 'TEST_CODE', { detail: 'test' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.name).toBe('BrowserError');
    });

    it('should create NavigationError correctly', () => {
      const error = new NavigationError('https://example.com', 'Network error');

      expect(error.message).toContain('https://example.com');
      expect(error.message).toContain('Network error');
      expect(error.code).toBe('NAV_ERROR');
    });

    it('should create ScreenshotError correctly', () => {
      const error = new ScreenshotError('Page not loaded');

      expect(error.message).toContain('Screenshot failed');
      expect(error.message).toContain('Page not loaded');
      expect(error.code).toBe('SCREENSHOT_ERROR');
    });
  });

  describe('Constants', () => {
    it('should have defined browser constants', () => {
      expect(BROWSER_CONSTANTS.POLLING_INTERVAL).toBe(3000);
      expect(BROWSER_CONSTANTS.SCREENSHOT_MAX_AGE).toBe(30000);
      expect(BROWSER_CONSTANTS.NAVIGATION_TIMEOUT).toBe(15000);
      expect(BROWSER_CONSTANTS.RETRY_ATTEMPTS).toBe(3);
    });
  });
});
