import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemePicker } from '@/components/shared/ThemePicker';

describe('ThemePicker Component', () => {
  const mockOnThemeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 6 theme options', () => {
    render(<ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />);

    // Check that all theme buttons are rendered
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
  });

  it('highlights the active theme', () => {
    const { container } = render(
      <ThemePicker currentTheme="blue" onThemeChange={mockOnThemeChange} />
    );

    // Check for the active indicator (the small dot)
    const activeIndicator = container.querySelector('.bg-primary.rounded-full');
    expect(activeIndicator).toBeInTheDocument();
  });

  it('shows active state for default theme', () => {
    const { container } = render(
      <ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />
    );

    const activeIndicator = container.querySelector('.bg-primary.rounded-full');
    expect(activeIndicator).toBeInTheDocument();
  });

  it('calls onThemeChange when a theme is clicked', () => {
    render(<ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Click second button (blue theme)

    expect(mockOnThemeChange).toHaveBeenCalledWith('blue');
  });

  it('handles theme-blue correctly', () => {
    render(<ThemePicker currentTheme="blue" onThemeChange={mockOnThemeChange} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // Click first button (default)

    expect(mockOnThemeChange).toHaveBeenCalledWith('default');
  });

  it('handles theme-purple correctly', () => {
    render(<ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // Purple theme

    expect(mockOnThemeChange).toHaveBeenCalledWith('purple');
  });

  it('handles theme-green correctly', () => {
    render(<ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[3]); // Green theme

    expect(mockOnThemeChange).toHaveBeenCalledWith('green');
  });

  it('handles theme-rose correctly', () => {
    render(<ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[4]); // Rose theme

    expect(mockOnThemeChange).toHaveBeenCalledWith('rose');
  });

  it('handles theme-cyan correctly', () => {
    render(<ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[5]); // Cyan theme

    expect(mockOnThemeChange).toHaveBeenCalledWith('cyan');
  });

  it('has correct button dimensions', () => {
    const { container } = render(
      <ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('w-7');
      expect(button).toHaveClass('h-7');
    });
  });

  it('has correct styling for theme color swatches', () => {
    const { container } = render(
      <ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />
    );

    // Look specifically for swatches (divs with rounded-sm class)
    const swatches = container.querySelectorAll('button > div.rounded-sm');
    expect(swatches.length).toBe(6);
    swatches.forEach(swatch => {
      expect(swatch).toHaveClass('w-3');
      expect(swatch).toHaveClass('h-3');
      expect(swatch).toHaveClass('rounded-sm');
    });
  });

  it('has hover and active states', () => {
    const { container } = render(
      <ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('hover:scale-105');
      expect(button).toHaveClass('active:scale-95');
    });
  });

  it('has proper transition classes', () => {
    const { container } = render(
      <ThemePicker currentTheme="default" onThemeChange={mockOnThemeChange} />
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('transition-all');
      expect(button).toHaveClass('duration-150');
    });
  });
});
