import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '@/components/pages/SettingsPage';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Mock app store
jest.mock('@/stores/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

import { useAppStore } from '@/stores/useAppStore';

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

describe('SettingsPage - Redesigned', () => {
  const mockStore = {
    rpcUrl: 'ws://localhost:8765',
    autoConnect: true,
    model: 'gpt-4',
    provider: 'openai',
    headless: false,
    stealth: true,
    theme: 'light',
    colorTheme: 'default',
    setSettings: jest.fn(),
    setColorTheme: jest.fn(),
    toggleTheme: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppStore.mockReturnValue(mockStore as any);

    // Mock navigator.platform
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      writable: true,
    });
  });

  it('renders settings page with minimal header', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Check for Save and Reset buttons
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('renders Appearance section', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Color Theme')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('renders Connection section', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('RPC URL')).toBeInTheDocument();
    expect(screen.getByText('Auto-connect')).toBeInTheDocument();
  });

  it('renders Language Model section', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Language Model')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
  });

  it('renders Browser section', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Browser')).toBeInTheDocument();
    expect(screen.getByText('Headless Mode')).toBeInTheDocument();
    expect(screen.getByText('Stealth Mode')).toBeInTheDocument();
  });

  it('renders About section', () => {
    render(<SettingsPage />);

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Version:')).toBeInTheDocument();
    expect(screen.getByText('Build:')).toBeInTheDocument();
    expect(screen.getByText('Platform:')).toBeInTheDocument();
    expect(screen.getByText('Architecture:')).toBeInTheDocument();
  });

  it('has minimal styling without cards', () => {
    mockUseAppStore.mockReturnValue(mockStore as any);
    const { container } = render(<SettingsPage />);

    // Should not have any Card elements
    const cards = container.querySelectorAll('.bg-card');
    expect(cards.length).toBe(0);
  });

  it('has section headings with correct styling', () => {
    render(<SettingsPage />);

    const headings = screen.getAllByText(/Appearance|Connection|Language Model|Browser|About/);
    headings.forEach(heading => {
      expect(heading).toHaveClass('text-xs');
      expect(heading).toHaveClass('font-medium');
    });
  });

  it('has hover effects on setting rows', () => {
    const { container } = render(<SettingsPage />);

    // Check for hover classes
    const hoverElements = container.querySelectorAll('.hover\\:bg-muted\\/30');
    expect(hoverElements.length).toBeGreaterThan(0);
  });

  it('uses proper spacing throughout', () => {
    const { container } = render(<SettingsPage />);

    // Check for space-y classes
    const mainContainer = container.querySelector('.space-y-4');
    expect(mainContainer).toBeInTheDocument();
  });

  it('renders theme picker component', () => {
    render(<SettingsPage />);

    // Theme picker should be rendered
    const themeButtons = screen.getAllByRole('button').filter(
      button => button.querySelector('div[class*="rounded-sm"]')
    );
    expect(themeButtons.length).toBe(6);
  });

  it('calls setColorTheme when theme is changed', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Click on a theme button (second one - blue)
    const themeButtons = screen.getAllByRole('button').filter(
      button => button.querySelector('div[class*="rounded-sm"]')
    );

    await user.click(themeButtons[1]);

    expect(mockStore.setColorTheme).toHaveBeenCalledWith('blue');
  });

  it('calls toggleTheme when dark mode toggle is changed', () => {
    render(<SettingsPage />);

    // Find the dark mode toggle
    const darkModeLabel = screen.getByText('Dark Mode');
    const toggleContainer = darkModeLabel.closest('.flex')?.querySelector('[role="switch"]') as HTMLElement;

    if (toggleContainer) {
      fireEvent.click(toggleContainer);
      expect(mockStore.toggleTheme).toHaveBeenCalled();
    }
  });

  it('disables Save button when no changes', () => {
    render(<SettingsPage />);

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  it('enables Save button when changes are made', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Change RPC URL
    const rpcInput = screen.getByPlaceholderText('ws://localhost:8765');
    await user.clear(rpcInput);
    await user.type(rpcInput, 'ws://localhost:9999');

    // Save button should now be enabled
    const saveButton = screen.getByText('Save');
    expect(saveButton).not.toBeDisabled();
  });

  it('calls setSettings when Save is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Make a change
    const rpcInput = screen.getByPlaceholderText('ws://localhost:8765');
    await user.clear(rpcInput);
    await user.type(rpcInput, 'ws://localhost:9999');

    // Click Save
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    expect(mockStore.setSettings).toHaveBeenCalled();
  });

  it('resets to defaults when Reset is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Click Reset
    const resetButton = screen.getByText('Reset');
    await user.click(resetButton);

    // Check that inputs are reset
    const rpcInput = screen.getByPlaceholderText('ws://localhost:8765');
    expect(rpcInput).toHaveValue('ws://localhost:8765');
  });

  it('has proper layout with max-width container', () => {
    const { container } = render(<SettingsPage />);

    const mainContainer = container.querySelector('.max-w-xl');
    expect(mainContainer).toBeInTheDocument();
  });

  it('uses correct padding for content area', () => {
    const { container } = render(<SettingsPage />);

    const contentArea = container.querySelector('.py-4.px-3');
    expect(contentArea).toBeInTheDocument();
  });

  it('has consistent text sizes', () => {
    render(<SettingsPage />);

    // Most text should be text-xs or text-[10px]
    const smallTextElements = screen.getAllByText(/./);
    const hasSmallText = smallTextElements.some(el => {
      const classes = el.className || '';
      return classes.includes('text-xs') || classes.includes('text-[10px]');
    });
    expect(hasSmallText).toBe(true);
  });

  it('renders provider select dropdown', () => {
    render(<SettingsPage />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('openai');
  });

  it('renders model input with placeholder', () => {
    render(<SettingsPage />);

    const modelInput = screen.getByPlaceholderText('gpt-4 or leave empty for default');
    expect(modelInput).toBeInTheDocument();
    expect(modelInput).toHaveValue('gpt-4');
  });
});
