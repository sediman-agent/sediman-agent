/**
 * WelcomeState component tests
 *
 * The empty-state shown on AgentPage when there are no messages. These tests
 * pin down the onboarding UX: headline, description, example prompts, and the
 * onSelectPrompt wiring that populates the composer.
 */

import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeState, type WelcomePrompt } from '@/components/agent/WelcomeState';

describe('WelcomeState', () => {
  it('renders a headline and description', () => {
    render(<WelcomeState />);
    expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
    expect(
      screen.getByText(/I can browse the web, click, type, extract data/)
    ).toBeInTheDocument();
  });

  it('renders the default example prompts', () => {
    render(<WelcomeState />);
    expect(screen.getByRole('button', { name: 'Navigate to a website' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Research a topic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take a screenshot' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fill a form' })).toBeInTheDocument();
  });

  it('calls onSelectPrompt with the prompt text when a prompt is clicked', () => {
    const onSelectPrompt = jest.fn();
    render(<WelcomeState onSelectPrompt={onSelectPrompt} />);

    fireEvent.click(screen.getByRole('button', { name: 'Take a screenshot' }));

    expect(onSelectPrompt).toHaveBeenCalledTimes(1);
    expect(onSelectPrompt).toHaveBeenCalledWith(
      expect.stringContaining('screenshot')
    );
  });

  it('does not call onSelectPrompt when no handler is provided', () => {
    // Should not throw.
    render(<WelcomeState />);
    fireEvent.click(screen.getByRole('button', { name: 'Take a screenshot' }));
  });

  it('renders custom prompts when provided', () => {
    const customPrompts: WelcomePrompt[] = [
      {
        icon: () => null,
        label: 'Custom action',
        prompt: 'do something custom',
      },
    ];
    render(<WelcomeState prompts={customPrompts} />);

    expect(screen.getByRole('button', { name: 'Custom action' })).toBeInTheDocument();
    // Default prompts should NOT be present.
    expect(screen.queryByRole('button', { name: 'Navigate to a website' })).not.toBeInTheDocument();
  });

  it('marks the welcome region with an accessible label', () => {
    render(<WelcomeState />);
    expect(screen.getByRole('region', { name: 'Welcome' })).toBeInTheDocument();
  });

  it('renders each prompt as a listitem for screen-reader navigation', () => {
    render(<WelcomeState />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(4);
  });

  it('shows the full prompt text as a subtitle so users know what will run', () => {
    render(<WelcomeState />);
    expect(
      screen.getByText(/summarize the top story/)
    ).toBeInTheDocument();
  });
});
