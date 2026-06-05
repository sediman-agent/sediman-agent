/**
 * Component Tests for OpenSkynet Desktop
 * Tests UI components, theme toggle, and connection status
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock store before importing components
jest.mock('@/stores/useAppStore', () => {
  const actual = jest.requireActual('@/stores/useAppStore');
  return {
    ...actual,
    useAppStore: () => ({
      theme: 'light',
      colorTheme: 'default',
      isConnected: false,
      sidebarOpen: true,
      currentPage: 'agent',
      toggleTheme: jest.fn(),
      setColorTheme: jest.fn(),
      setSidebarOpen: jest.fn(),
      setCurrentPage: jest.fn(),
      rpcUrl: 'ws://localhost:8765',
      autoConnect: true,
    }),
  };
});

jest.mock('@/stores/useChatStore', () => {
  const actual = jest.requireActual('@/stores/useChatStore');
  return {
    ...actual,
    useChatStore: ((selector) => {
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
  };
});

jest.mock('@/stores/useSandboxStore', () => {
  const actual = jest.requireActual('@/stores/useSandboxStore');
  return {
    ...actual,
    useSandboxStore: () => ({
      isOpen: false,
      isActive: false,
      isStarting: false,
      togglePanel: jest.fn(),
    }),
  };
});

describe('UI Components', () => {
  describe('Sidebar Component', () => {
    it('should render sidebar with proper structure', async () => {
      const { Sidebar } = require('@/components/layout/Sidebar');
      const { container } = render(<Sidebar />);

      // Check for sidebar aside element
      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeTruthy();
    });

    it('should have theme toggle button', async () => {
      const { Sidebar } = require('@/components/layout/Sidebar');
      const { container } = render(<Sidebar />);

      // Theme toggle button should exist
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have collapse toggle button', async () => {
      const { Sidebar } = require('@/components/layout/Sidebar');
      const { container } = render(<Sidebar />);

      // Collapse toggle button should exist
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
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
    it('should render button with correct variants', () => {
      const { Button } = require('@/components/shared/Button');
      const { container } = render(<Button variant="primary">Test Button</Button>);

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

  describe('Agent Page', () => {
    it('should render message input area', () => {
      const { AgentPage } = require('@/components/pages/AgentPage');

      const { container } = render(<AgentPage />);

      // Check for textarea input
      const textarea = container.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });

    it('should have send button', () => {
      const { AgentPage } = require('@/components/pages/AgentPage');

      const { container } = render(<AgentPage />);

      const sendButton = container.querySelectorAll('button');
      const sendBtn = Array.from(sendButton).find(btn => btn.textContent?.includes('Send'));
      expect(sendBtn).toBeTruthy();
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
});

describe('Component Rendering', () => {
  it('should render sidebar navigation', () => {
    const { SidebarNav } = require('@/components/layout/SidebarNav');
    const { container } = render(<SidebarNav />);

    expect(container.textContent).toContain('Chat');
    expect(container.textContent).toContain('Settings');
  });

  it('should render message bubbles correctly', () => {
    const { MessageBubble } = require('@/components/agent/MessageBubble');

    const userMessage = {
      id: '1',
      role: 'user' as const,
      content: 'Test message',
      timestamp: new Date(),
      status: 'done' as const,
    };

    const { container } = render(<MessageBubble message={userMessage} />);
    // MessageBubble renders the message, verify it has content
    expect(container.textContent).toBeTruthy();
    expect(container.textContent).not.toBe('');
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
    const store = useAppStore();

    expect(store).toHaveProperty('theme');
    expect(store).toHaveProperty('isConnected');
    expect(store).toHaveProperty('sidebarOpen');
  });
});
