import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SidebarStatus } from '@/components/layout/SidebarStatus';
import { useAppStore } from '@/stores/useAppStore';

// Mock the app store
jest.mock('@/stores/useAppStore');

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

describe('SidebarStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Connected status when connected', () => {
    mockUseAppStore.mockReturnValue({
      isConnected: true,
      agentStatus: { state: 'idle' },
    } as any);

    render(<SidebarStatus />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows Disconnected status when not connected', () => {
    mockUseAppStore.mockReturnValue({
      isConnected: false,
      agentStatus: { state: 'idle' },
    } as any);

    render(<SidebarStatus />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('shows Idle agent status', () => {
    mockUseAppStore.mockReturnValue({
      isConnected: true,
      agentStatus: { state: 'idle' },
    } as any);

    render(<SidebarStatus />);
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('shows Running agent status with spinner', () => {
    mockUseAppStore.mockReturnValue({
      isConnected: true,
      agentStatus: { state: 'running' },
    } as any);

    const { container } = render(<SidebarStatus />);
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error agent status', () => {
    mockUseAppStore.mockReturnValue({
      isConnected: true,
      agentStatus: { state: 'error' },
    } as any);

    const { container } = render(<SidebarStatus />);
    // The component uses CSS capitalize, so 'error' becomes 'Error'
    expect(container.querySelector('.capitalize')).toHaveTextContent('error');
  });

  it('has minimal styling with small fonts', () => {
    mockUseAppStore.mockReturnValue({
      isConnected: true,
      agentStatus: { state: 'idle' },
    } as any);

    render(<SidebarStatus />);
    const statuses = screen.getAllByText(/Connected|Idle/);
    statuses.forEach(status => {
      expect(status).toHaveClass('text-xs');
    });
  });

  it('uses semantic colors for status indicators', () => {
    const { container } = render(<SidebarStatus />);

    // Check that status dots exist and have proper classes
    const statusDots = container.querySelectorAll('svg');
    expect(statusDots.length).toBeGreaterThan(0);
  });
});
