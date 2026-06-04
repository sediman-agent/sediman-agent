import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { useAppStore } from '@/stores/useAppStore';
import { renderHook, act } from '@testing-library/react';

describe('SidebarNav', () => {
  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.setCurrentPage('tasks');
    });
  });

  it('should render all navigation items', () => {
    render(<SidebarNav />);

    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should highlight active page', () => {
    const { result: storeResult } = renderHook(() => useAppStore());
    act(() => {
      storeResult.current.setCurrentPage('agent');
    });

    render(<SidebarNav />);

    const chatButton = screen.getByText('Chat').closest('button');
    expect(chatButton).toHaveClass('bg-primary');
    expect(chatButton).toHaveClass('text-primary-foreground');
  });

  it('should not highlight inactive pages', () => {
    render(<SidebarNav />);

    const chatButton = screen.getByText('Chat').closest('button');
    expect(chatButton).toHaveClass('text-muted-foreground');
  });

  it('should call setCurrentPage when clicking nav item', () => {
    render(<SidebarNav />);

    const chatButton = screen.getByText('Chat');
    fireEvent.click(chatButton);

    const { result } = renderHook(() => useAppStore());
    expect(result.current.currentPage).toBe('agent');
  });

  it('should have correct hover states for inactive items', () => {
    render(<SidebarNav />);

    const chatButton = screen.getByText('Chat').closest('button');
    expect(chatButton).toHaveClass('hover:bg-accent');
    expect(chatButton).toHaveClass('hover:text-accent-foreground');
  });

  it('should use 4px border radius', () => {
    render(<SidebarNav />);

    const tasksButton = screen.getByText('Tasks').closest('button');
    expect(tasksButton).toHaveClass('rounded');
  });

  it('should have proper padding', () => {
    render(<SidebarNav />);

    const button = screen.getByText('Tasks').closest('button');
    expect(button).toHaveClass('px-3');
    expect(button).toHaveClass('py-1.5');
  });

  it('should use small text size', () => {
    render(<SidebarNav />);

    const button = screen.getByText('Tasks').closest('button');
    expect(button).toHaveClass('text-sm');
  });

  it('should have normal font weight', () => {
    render(<SidebarNav />);

    const button = screen.getByText('Tasks').closest('button');
    expect(button).toHaveClass('font-normal');
  });

  it('should have fast color transition', () => {
    render(<SidebarNav />);

    const button = screen.getByText('Tasks').closest('button');
    expect(button).toHaveClass('transition-colors');
    expect(button).toHaveClass('duration-150');
  });

  it('should not accumulate extra spacing between items', () => {
    const { container } = render(<SidebarNav />);

    const navContainer = container.querySelector('.space-y-0\\.5');
    expect(navContainer).toBeInTheDocument();
  });
});
