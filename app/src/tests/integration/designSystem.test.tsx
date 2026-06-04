import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '@/App';

// Mock stores
jest.mock('@/stores/useAppStore');
jest.mock('@/stores/useChatStore');

// Mock Tauri
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(() => Promise.resolve(() => {})),
}));

describe('Design System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Border Radius Consistency', () => {
    it('uses 4px border radius throughout the app', () => {
      const { container } = render(<App />);

      // Check that rounded elements use the 4px radius
      const roundedElements = container.querySelectorAll('[class*="rounded"]');
      roundedElements.forEach(el => {
        const classes = el.className || '';
        // Should not use larger radiuses
        expect(classes).not.toContain('rounded-lg');
        expect(classes).not.toContain('rounded-xl');
        expect(classes).not.toContain('rounded-2xl');
      });
    });

    it('has consistent rounded class usage', () => {
      const { container } = render(<App />);

      // Should have elements with just 'rounded' class (4px)
      const roundedElements = container.querySelectorAll('.rounded');
      expect(roundedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Typography System', () => {
    it('uses text-xs as base size for UI elements', () => {
      const { container } = render(<App />);

      // Check for text-xs usage (should be common)
      const xsElements = container.querySelectorAll('.text-xs');
      expect(xsElements.length).toBeGreaterThan(5);
    });

    it('uses text-sm for larger emphasis', () => {
      const { container } = render(<App />);

      // Should have some text-sm elements
      const smElements = container.querySelectorAll('.text-sm');
      expect(smElements.length).toBeGreaterThan(0);
    });

    it('uses text-[10px] for captions', () => {
      const { container } = render(<App />);

      // Should have some text-[10px] elements
      const captionElements = container.querySelectorAll('.text-\\[10px\\]');
      expect(captionElements.length).toBeGreaterThan(0);
    });
  });

  describe('Spacing System', () => {
    it('uses 8px base spacing (space-y-2)', () => {
      const { container } = render(<App />);

      // Check for space-y-2 (8px vertical spacing)
      const spacingElements = container.querySelectorAll('.space-y-2');
      expect(spacingElements.length).toBeGreaterThan(0);
    });

    it('uses consistent padding units', () => {
      const { container } = render(<App />);

      // Check for px-2, py-2 (8px padding)
      const px2Elements = container.querySelectorAll('.px-2');
      const py2Elements = container.querySelectorAll('.py-2');

      expect(px2Elements.length + py2Elements.length).toBeGreaterThan(5);
    });
  });

  describe('Color System', () => {
    it('uses semantic color variables', () => {
      const { container } = render(<App />);

      // Check for semantic color classes
      const primaryElements = container.querySelectorAll('[class*="bg-primary"]');
      const borderElements = container.querySelectorAll('[class*="border-border"]');
      const mutedElements = container.querySelectorAll('[class*="text-muted-foreground"]');

      expect(primaryElements.length).toBeGreaterThan(0);
      expect(borderElements.length).toBeGreaterThan(0);
      expect(mutedElements.length).toBeGreaterThan(0);
    });

    it('uses primary color for interactive elements', () => {
      const { container } = render(<App />);

      // Check for primary color in buttons and links
      const primaryButtons = container.querySelectorAll('.bg-primary');
      expect(primaryButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Component Heights', () => {
    it('uses consistent small heights', () => {
      const { container } = render(<App />);

      // Check for small height components
      const h8Elements = container.querySelectorAll('.h-8');
      const h10Elements = container.querySelectorAll('.h-10');

      expect(h8Elements.length + h10Elements.length).toBeGreaterThan(0);
    });
  });

  describe('Transitions', () => {
    it('has smooth transitions on interactive elements', () => {
      const { container } = render(<App />);

      // Check for transition classes
      const transitionElements = container.querySelectorAll('[class*="transition"]');
      expect(transitionElements.length).toBeGreaterThan(0);
    });

    it('uses duration-150 for smooth transitions', () => {
      const { container } = render(<App />);

      // Check for duration-150
      const durationElements = container.querySelectorAll('.duration-150');
      expect(durationElements.length).toBeGreaterThan(0);
    });
  });

  describe('Micro-interactions', () => {
    it('has scale effects on active state', () => {
      const { container } = render(<App />);

      // Check for active:scale classes
      const scaleElements = container.querySelectorAll('[class*="active:scale"]');
      expect(scaleElements.length).toBeGreaterThan(0);
    });

    it('has hover effects on interactive elements', () => {
      const { container } = render(<App />);

      // Check for hover classes
      const hoverElements = container.querySelectorAll('[class*="hover:"]');
      expect(hoverElements.length).toBeGreaterThan(0);
    });
  });

  describe('Focus States', () => {
    it('has proper focus-visible states', () => {
      const { container } = render(<App />);

      // Check for focus-visible classes
      const focusElements = container.querySelectorAll('[class*="focus-visible"]');
      expect(focusElements.length).toBeGreaterThan(0);
    });

    it('has ring on focus', () => {
      const { container } = render(<App />);

      // Check for ring classes
      const ringElements = container.querySelectorAll('[class*="ring"]');
      expect(ringElements.length).toBeGreaterThan(0);
    });
  });

  describe('Layout Consistency', () => {
    it('uses flex layout for main structure', () => {
      const { container } = render(<App />);

      // Check for flex layout
      const flexElements = container.querySelectorAll('.flex');
      expect(flexElements.length).toBeGreaterThan(0);
    });

    it('has proper sidebar width', () => {
      const { container } = render(<App />);

      // Check for sidebar width classes
      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();

      if (sidebar) {
        const classes = sidebar.className || '';
        // Should have w-56 or w-12 class
        expect(classes.match(/w-(56|12)/)).toBeTruthy();
      }
    });
  });

  describe('Minimal Design', () => {
    it('does not use large decorative padding', () => {
      const { container } = render(<App />);

      // Check that we don't have excessive padding
      const p4Elements = container.querySelectorAll('.p-4');
      const p6Elements = container.querySelectorAll('.p-6');

      // Should have minimal padding (p-2, p-3)
      const p2Elements = container.querySelectorAll('.p-2');
      const p3Elements = container.querySelectorAll('.p-3');

      expect(p2Elements.length + p3Elements.length).toBeGreaterThan(p4Elements.length + p6Elements.length);
    });

    it('does not use large font sizes for UI', () => {
      const { container } = render(<App />);

      // Check that we don't have large text
      const textLgElements = container.querySelectorAll('.text-lg');
      const textXlElements = container.querySelectorAll('.text-xl');

      // Should use small text
      const xsElements = container.querySelectorAll('.text-xs');

      expect(xsElements.length).toBeGreaterThan(textLgElements.length + textXlElements.length);
    });
  });
});
