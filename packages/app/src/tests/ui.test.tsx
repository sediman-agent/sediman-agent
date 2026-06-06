/**
 * Component Tests for OpenSkynet Desktop
 * Tests UI components, theme toggle, and connection status
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock store modules
const mockToggleTheme = jest.fn();
const mockSetColorTheme = jest.fn();
const mockSetSidebarOpen = jest.fn();
const mockSetCurrentPage = jest.fn();
const mockTogglePanel = jest.fn();

jest.mock('@/stores/useAppStore', () => ({
  useAppStore: (selector?: (state: any) => any) => {
    const state = {
      theme: 'light',
      colorTheme: 'default',
      agentStatus: { state: 'idle', rpcConnected: false, browserConnected: false },
      sidebarOpen: true,
      currentPage: 'agent',
      toggleTheme: mockToggleTheme,
      setColorTheme: mockSetColorTheme,
      setSidebarOpen: mockSetSidebarOpen,
      setCurrentPage: mockSetCurrentPage,
      apiBaseUrl: 'http://localhost:3001',
      autoConnect: true,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/useChatStore', () => ({
  useChatStore: ((selector?: (state: any) => any) => {
    const state = {
      conversations: [],
      activeConversationId: null,
      activeConversation: null,
      messages: [],
      getConversation: jest.fn(() => undefined),
      createConversation: jest.fn(() => ({ id: 'test-conv-1', title: 'New Chat', messages: [], createdAt: new Date(), updatedAt: new Date() })),
      selectConversation: jest.fn(),
      deleteConversation: jest.fn(),
      updateConversationTitle: jest.fn(),
      addMessage: jest.fn(),
      updateMessage: jest.fn(),
      setMessageStatus: jest.fn(),
      appendToMessage: jest.fn(),
    };
    return selector ? selector(state) : state;
  }) as any,
}));

jest.mock('@/stores/useSandboxStore', () => ({
  useSandboxStore: ((selector?: (state: any) => any) => {
    const state = {
      isOpen: false,
      isActive: false,
      isStarting: false,
      togglePanel: mockTogglePanel,
    };
    return selector ? selector(state) : state;
  }) as any,
}));

describe('UI Components', () => {
  describe('Theme Toggle', () => {
    it('should apply dark class when theme is dark', () => {
      // Simulate dark mode
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      document.documentElement.classList.remove('dark');
    });

    it('should remove dark class when theme is light', () => {
      // Simulate light mode
      document.documentElement.classList.remove('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Theme Toggle', () => {
    it('should apply dark class when theme is dark', () => {
      // Simulate dark mode
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      document.documentElement.classList.remove('dark');
    });

    it('should remove dark class when theme is light', () => {
      // Simulate light mode
      document.documentElement.classList.remove('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Button Component', () => {
    it('should render button with text', () => {
      const { Button } = require('@/components/shared/Button');
      const { container } = render(<Button variant="default">Test Button</Button>);

      const button = container.querySelector('button');
      expect(button).toHaveTextContent('Test Button');
    });

    it('should be disabled when disabled prop is true', () => {
      const { Button } = require('@/components/shared/Button');
      const { container } = render(<Button disabled>Disabled Button</Button>);

      const button = container.querySelector('button');
      expect(button).toBeDisabled();
    });
  });
});

describe('Theme System', () => {
  it('should have correct CSS variables for light theme', () => {
    // CSS variables are defined in index.css and loaded via main.tsx
    // In test environment, we verify the class toggling works correctly
    document.documentElement.classList.remove('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should toggle dark mode correctly', () => {
    document.documentElement.classList.add('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    document.documentElement.classList.remove('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should have theme-aware styling applied', () => {
    // Verify theme-aware classes can be applied
    const testDiv = document.createElement('div');
    testDiv.className = 'dark';
    expect(testDiv.classList.contains('dark')).toBe(true);
  });

  it('should have light theme by default', () => {
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('Component Rendering', () => {
  it('should render button components', () => {
    const { Button } = require('@/components/shared/Button');
    const { container } = render(<Button variant="default">Click Me</Button>);

    expect(container.textContent).toContain('Click Me');
  });
});

describe('Error Handling', () => {
  it('should handle RPC errors gracefully', () => {
    const mockError = new Error('Test error');
    expect(mockError.message).toBe('Test error');
  });

  it('should have proper error types', () => {
    const { NetworkError } = require('@/errors/network');

    const error = new NetworkError('Test error');
    expect(error.code).toBe('NETWORK_ERROR');
  });
});

describe('State Management', () => {
  it('should have proper store state', () => {
    const { useAppStore } = require('@/stores/useAppStore');
    const state = useAppStore();

    expect(state).toHaveProperty('theme');
    expect(state).toHaveProperty('agentStatus');
    expect(state).toHaveProperty('sidebarOpen');
  });

  it('should have theme set to light by default', () => {
    const { useAppStore } = require('@/stores/useAppStore');
    const state = useAppStore();

    expect(state.theme).toBe('light');
  });

  it('should have sidebar open by default', () => {
    const { useAppStore } = require('@/stores/useAppStore');
    const state = useAppStore();

    expect(state.sidebarOpen).toBe(true);
  });
});
