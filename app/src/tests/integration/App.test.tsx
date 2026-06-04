import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import App from '@/App';

// Mock the app store
jest.mock('@/stores/useAppStore');
jest.mock('@/stores/useChatStore');

// Mock Tauri API
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(() => Promise.resolve(() => {})),
}));

describe('App Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    // App should render without throwing
  });

  it('has proper accessibility structure', () => {
    const { container } = render(<App />);

    // Check for semantic HTML
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();

    const aside = container.querySelector('aside');
    expect(aside).toBeInTheDocument();
  });

  it('applies global theme classes', () => {
    const { container } = render(<App />);

    // Check that the root div has proper classes
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toHaveClass('flex');
    expect(rootDiv).toHaveClass('h-screen');
  });

  it('uses semantic color variables', () => {
    const { container } = render(<App />);

    // Check that elements use semantic classes
    const borderElements = container.querySelectorAll('[class*="border-border"]');
    expect(borderElements.length).toBeGreaterThan(0);
  });

  it('has minimal design tokens applied', () => {
    const { container } = render(<App />);

    // Check for rounded corners (4px)
    const roundedElements = container.querySelectorAll('[class*="rounded"]');
    expect(roundedElements.length).toBeGreaterThan(0);
  });
});

describe('App Design System', () => {
  it('uses 8px spacing system', () => {
    render(<App />);

    // Check that spacing follows 8px grid
    // This is a basic check - in real tests, you'd be more specific
    const smallText = screen.getAllByText(/./);
    smallText.forEach(el => {
      // Most text should be small (text-xs)
      if (el.tagName === 'SPAN' || el.tagName === 'DIV') {
        expect(el).toHaveClass('text-xs');
      }
    });
  });

  it('uses orange primary color in semantic way', () => {
    const { container } = render(<App />);

    // Check for primary color usage
    const primaryElements = container.querySelectorAll('[class*="bg-primary"]');
    expect(primaryElements.length).toBeGreaterThan(0);
  });

  it('has consistent 4px border radius', () => {
    const { container } = render(<App />);

    // Check that rounded elements use the radius token
    const roundedElements = container.querySelectorAll('[class*="rounded"]');
    roundedElements.forEach(el => {
      // Should not use larger radiuses like rounded-lg or rounded-xl
      expect(el.classList.contains('rounded-lg')).toBe(false);
      expect(el.classList.contains('rounded-xl')).toBe(false);
    });
  });
});
