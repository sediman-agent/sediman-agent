import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '@/components/pages/SettingsPage';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    // Mock navigator.platform
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      writable: true,
    });
  });

  it('renders settings page title', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure OpenSkynet')).toBeInTheDocument();
  });

  it('renders RPC Connection card', () => {
    render(<SettingsPage />);
    expect(screen.getByText('RPC Connection')).toBeInTheDocument();
    expect(
      screen.getByText('Configure connection to the OpenSkynet RPC server')
    ).toBeInTheDocument();
  });

  it('renders LLM Configuration card', () => {
    render(<SettingsPage />);
    expect(screen.getByText('LLM Configuration')).toBeInTheDocument();
    expect(
      screen.getByText('Configure the language model provider and settings')
    ).toBeInTheDocument();
  });

  it('renders Browser Configuration card', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Browser Configuration')).toBeInTheDocument();
    expect(
      screen.getByText('Configure browser automation settings')
    ).toBeInTheDocument();
  });

  it('renders About card', () => {
    render(<SettingsPage />);
    expect(screen.getByText('About OpenSkynet')).toBeInTheDocument();
  });

  it('renders RPC URL input', () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText('RPC URL')).toBeInTheDocument();
  });

  it('renders provider select', () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
  });

  it('renders model input', () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText('Model (optional)')).toBeInTheDocument();
  });

  it('renders Auto-connect toggle', () => {
    render(<SettingsPage />);
    expect(
      screen.getByLabelText('Auto-connect on startup')
    ).toBeInTheDocument();
  });

  it('renders Headless mode toggle', () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText('Headless mode')).toBeInTheDocument();
  });

  it('renders Stealth mode toggle', () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText('Stealth mode')).toBeInTheDocument();
  });

  it('renders Save Changes and Reset buttons', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('shows version information', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Version:')).toBeInTheDocument();
    expect(screen.getByText('Build:')).toBeInTheDocument();
    expect(screen.getByText('Platform:')).toBeInTheDocument();
    expect(screen.getByText('Architecture:')).toBeInTheDocument();
  });

  it('has all cards with minimal styling', () => {
    const { container } = render(<SettingsPage />);
    const cards = container.querySelectorAll('.rounded.border');
    expect(cards.length).toBeGreaterThan(0);
  });
});
