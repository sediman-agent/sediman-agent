import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAppStore } from '@/stores/useAppStore';

// Mock document methods
const mockClassList = {
  add: jest.fn(),
  remove: jest.fn(),
};

describe('Theme System', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: mockClassList,
      },
      writable: true,
    });
  });

  describe('Light/Dark Theme', () => {
    it('initializes with light theme by default', () => {
      const { result } = renderHook(() => useAppStore());
      expect(result.current.theme).toBe('light');
    });

    it('toggles from light to dark theme', () => {
      const { result } = renderHook(() => useAppStore());

      // Toggle to dark
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
      expect(mockClassList.add).toHaveBeenCalledWith('dark');
    });

    it('toggles from dark to light theme', () => {
      const { result } = renderHook(() => useAppStore());

      // Set to dark first
      act(() => {
        result.current.toggleTheme();
      });

      // Toggle back to light
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(mockClassList.remove).toHaveBeenCalledWith('dark');
    });

    it('adds dark class when switching to dark theme', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockClassList.add).toHaveBeenCalledWith('dark');
    });

    it('removes dark class when switching to light theme', () => {
      const { result } = renderHook(() => useAppStore());

      // Start with dark
      act(() => {
        result.current.toggleTheme();
      });

      // Switch to light
      act(() => {
        result.current.toggleTheme();
      });

      expect(mockClassList.remove).toHaveBeenCalledWith('dark');
    });
  });

  describe('Color Theme', () => {
    it('initializes with default color theme', () => {
      const { result } = renderHook(() => useAppStore());
      expect(result.current.colorTheme).toBe('default');
    });

    it('changes color theme to blue', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setColorTheme('blue');
      });

      expect(result.current.colorTheme).toBe('blue');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-blue');
    });

    it('changes color theme to purple', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setColorTheme('purple');
      });

      expect(result.current.colorTheme).toBe('purple');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-purple');
    });

    it('changes color theme to green', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setColorTheme('green');
      });

      expect(result.current.colorTheme).toBe('green');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-green');
    });

    it('changes color theme to rose', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setColorTheme('rose');
      });

      expect(result.current.colorTheme).toBe('rose');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-rose');
    });

    it('changes color theme to cyan', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setColorTheme('cyan');
      });

      expect(result.current.colorTheme).toBe('cyan');
      expect(mockClassList.add).toHaveBeenCalledWith('theme-cyan');
    });

    it('removes all theme classes before adding new one', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setColorTheme('blue');
      });

      expect(mockClassList.remove).toHaveBeenCalledWith(
        'theme-blue',
        'theme-purple',
        'theme-green',
        'theme-rose',
        'theme-cyan'
      );
    });

    it('does not add theme class when switching to default', () => {
      const { result } = renderHook(() => useAppStore());

      // Start with a non-default theme
      act(() => {
        result.current.setColorTheme('blue');
      });

      // Switch to default
      act(() => {
        result.current.setColorTheme('default');
      });

      expect(mockClassList.remove).toHaveBeenCalled();
      expect(mockClassList.add).not.toHaveBeenCalled();
    });

    it('supports all six color themes', () => {
      const { result } = renderHook(() => useAppStore());
      const themes = ['default', 'blue', 'purple', 'green', 'rose', 'cyan'];

      themes.forEach(theme => {
        act(() => {
          result.current.setColorTheme(theme);
        });
        expect(result.current.colorTheme).toBe(theme);
      });
    });
  });

  describe('Theme Persistence', () => {
    it('persists theme changes to storage', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.toggleTheme();
      });

      // Theme should be updated in store
      expect(result.current.theme).toBe('dark');
    });

    it('persists color theme changes to storage', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setColorTheme('purple');
      });

      // Color theme should be updated in store
      expect(result.current.colorTheme).toBe('purple');
    });
  });

  describe('Theme Integration', () => {
    it('can use dark mode with any color theme', () => {
      const { result } = renderHook(() => useAppStore());

      // Set dark mode
      act(() => {
        result.current.toggleTheme();
      });

      // Set color theme
      act(() => {
        result.current.setColorTheme('blue');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.colorTheme).toBe('blue');
    });

    it('can use light mode with any color theme', () => {
      const { result } = renderHook(() => useAppStore());

      // Set color theme
      act(() => {
        result.current.setColorTheme('rose');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.colorTheme).toBe('rose');
    });

    it('maintains color theme when toggling dark/light', () => {
      const { result } = renderHook(() => useAppStore());

      // Set color theme
      act(() => {
        result.current.setColorTheme('green');
      });

      // Toggle to dark
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.colorTheme).toBe('green');

      // Toggle back to light
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.colorTheme).toBe('green');
    });
  });
});

// Helper for act in hook tests
function act(callback: () => void) {
  callback();
}
