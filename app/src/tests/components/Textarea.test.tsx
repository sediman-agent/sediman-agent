import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from '@jest/globals';
import { Textarea } from '@/components/shared/Textarea';
import userEvent from '@testing-library/user-event';

describe('Textarea', () => {
  it('should render textarea with default props', () => {
    render(<Textarea />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('rounded');
  });

  it('should render with placeholder text', () => {
    render(<Textarea placeholder="Enter text here" />);

    const textarea = screen.getByPlaceholderText('Enter text here');
    expect(textarea).toBeInTheDocument();
  });

  it('should call onChange when typing', async () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} />);

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Hello');

    expect(handleChange).toHaveBeenCalled();
    expect(textarea).toHaveValue('Hello');
  });

  it('should call onKeyDown when key is pressed', () => {
    const handleKeyDown = vi.fn();
    render(<Textarea onKeyDown={handleKeyDown} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(handleKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'Enter' })
    );
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Textarea disabled />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('should not be resizable when autoResize is true', () => {
    render(<Textarea autoResize />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('textarea-autoresize');
  });

  it('should be resizable when autoResize is false', () => {
    render(<Textarea autoResize={false} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('resize-y');
  });

  it('should have correct border radius (4px)', () => {
    render(<Textarea />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('rounded');
  });

  it('should have focus ring styles', () => {
    render(<Textarea />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('focus-visible:ring-2');
  });

  it('should render with custom className', () => {
    render(<Textarea className="custom-class" />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('custom-class');
  });

  it('should have min and max height constraints', () => {
    render(<Textarea />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toContain('min-h-[80px]');
    expect(textarea.className).toContain('max-h-[320px]');
  });

  it('should use placeholder text color from muted-foreground', () => {
    render(<Textarea placeholder="Placeholder" />);

    const textarea = screen.getByPlaceholderText('Placeholder');
    expect(textarea).toHaveClass('placeholder:text-muted-foreground');
  });

  it('should have correct border and input classes', () => {
    render(<Textarea />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('border');
    expect(textarea).toHaveClass('border-input');
  });

  it('should transition colors on focus', () => {
    render(<Textarea />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('transition-colors');
    expect(textarea).toHaveClass('duration-150');
  });

  it('should forward ref correctly', () => {
    const ref = { current: null };
    render(<Textarea ref={ref} />);

    const textarea = screen.getByRole('textbox');
    expect(ref.current).toBe(textarea);
  });

  it('should have proper padding', () => {
    render(<Textarea />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('px-3');
    expect(textarea).toHaveClass('py-2');
  });

  it('should have small text size', () => {
    render(<Textarea />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('text-sm');
  });
});
