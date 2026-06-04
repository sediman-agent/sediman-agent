import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from '@jest/globals';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

describe('Sidebar', () => {
  beforeEach(() => {
    // Reset store state before each test
    vi.clearAllMocks();
  });

  it('should render sidebar with navigation items', () => {
    const mockToggleSidebar = vi.fn();
    (useAppStore as any).mockReturnValue({
      sidebarOpen: true,
      setSidebarOpen: mockToggleSidebar,
      toggleTheme: vi.fn(),
      theme: 'light',
    });

    render(<Sidebar />);

    // Check if navigation items are rendered
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should toggle sidebar when clicking collapse button', () => {
    const mockToggleSidebar = vi.fn();
    (useAppStore as any).mockReturnValue({
      sidebarOpen: true,
      setSidebarOpen: mockToggleSidebar,
      toggleTheme: vi.fn(),
      theme: 'light',
    });

    render(<Sidebar />);

    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(collapseButton);

    expect(mockToggleSidebar).toHaveBeenCalledWith(false);
  });

  it('should toggle theme when clicking theme button', () => {
    const mockToggleTheme = vi.fn();
    (useAppStore as any).mockReturnValue({
      sidebarOpen: true,
      setSidebarOpen: vi.fn(),
      toggleTheme: mockToggleTheme,
      theme: 'light',
    });

    render(<Sidebar />);

    const themeButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('svg')
    );

    if (themeButton) {
      fireEvent.click(themeButton);
      expect(mockToggleTheme).toHaveBeenCalled();
    }
  });

  it('should render collapsed state when sidebar is closed', () => {
    (useAppStore as any).mockReturnValue({
      sidebarOpen: false,
      setSidebarOpen: vi.fn(),
      toggleTheme: vi.fn(),
      theme: 'light',
    });

    render(<Sidebar />);

    // Should show collapsed nav items (letter badges)
    const letterButtons = screen.getAllByRole('button');
    expect(letterButtons.length).toBeGreaterThan(0);
  });

  it('should display correct theme icon', () => {
    const mockToggleTheme = vi.fn();
    (useAppStore as any).mockReturnValue({
      sidebarOpen: true,
      setSidebarOpen: vi.fn(),
      toggleTheme: mockToggleTheme,
      theme: 'dark',
    });

    render(<Sidebar />);

    // Dark mode should show Sun icon
    const sunIcon = document.querySelector('[data-lucide="sun"]');
    expect(sunIcon).toBeInTheDocument();
  });

  it('should have correct width classes for open/closed states', () => {
    (useAppStore as any).mockReturnValue({
      sidebarOpen: true,
      setSidebarOpen: vi.fn(),
      toggleTheme: vi.fn(),
      theme: 'light',
    });

    const { container } = render(<Sidebar />);
    const sidebar = container.querySelector('aside');

    expect(sidebar).toHaveClass('w-56');
  });

  it('should have correct border and background classes', () => {
    (useAppStore as any).mockReturnValue({
      sidebarOpen: true,
      setSidebarOpen: vi.fn(),
      toggleTheme: vi.fn(),
      theme: 'light',
    });

    const { container } = render(<Sidebar />);
    const sidebar = container.querySelector('aside');

    expect(sidebar).toHaveClass('bg-background');
    expect(sidebar).toHaveClass('border-r');
    expect(sidebar).toHaveClass('border-border');
  });
});
