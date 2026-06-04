import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { MessageBubble } from '@/components/agent/MessageBubble';
import { Message } from '@/types';

const mockMessage: Message = {
  id: '1',
  role: 'user',
  content: 'Hello, world!',
  status: 'done',
  timestamp: Date.now(),
};

describe('MessageBubble', () => {
  beforeEach(() => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.clearAllMocks();
  });

  it('should render user message with correct styling', () => {
    render(<MessageBubble message={mockMessage} />);

    const messageContent = screen.getByText('Hello, world!');
    expect(messageContent).toBeInTheDocument();
  });

  it('should render assistant message with correct styling', () => {
    const assistantMessage: Message = {
      id: '2',
      role: 'assistant',
      content: 'Hi there!',
      status: 'done',
    };

    render(<MessageBubble message={assistantMessage} />);

    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('should show copy button on hover', () => {
    render(<MessageBubble message={mockMessage} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
  });

  it('should copy message content when clicking copy button', async () => {
    render(<MessageBubble message={mockMessage} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello, world!');
    });
  });

  it('should show check icon after copying', async () => {
    render(<MessageBubble message={mockMessage} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      const checkIcon = copyButton.querySelector('[data-lucide="check"]');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  it('should render streaming message with cursor', () => {
    const streamingMessage: Message = {
      id: '3',
      role: 'assistant',
      content: 'Thinking...',
      status: 'streaming',
    };

    render(<MessageBubble message={streamingMessage} />);

    expect(screen.getByText('Thinking...')).toBeInTheDocument();
    const cursor = document.querySelector('.typing-cursor');
    expect(cursor).toBeInTheDocument();
  });

  it('should render error message', () => {
    const errorMessage: Message = {
      id: '4',
      role: 'assistant',
      content: 'Something went wrong',
      status: 'error',
    };

    render(<MessageBubble message={errorMessage} />);

    expect(screen.getByText(/Failed to send/i)).toBeInTheDocument();
  });

  it('should render markdown content correctly', () => {
    const markdownMessage: Message = {
      id: '5',
      role: 'assistant',
      content: '**Bold text** and *italic text*',
      status: 'done',
    };

    render(<MessageBubble message={markdownMessage} />);

    expect(screen.getByText('Bold text')).toBeInTheDocument();
    expect(screen.getByText('italic text')).toBeInTheDocument();
  });

  it('should render timestamp when provided', () => {
    const timestamp = Date.now();
    const messageWithTimestamp: Message = {
      id: '6',
      role: 'user',
      content: 'Test',
      status: 'done',
      timestamp,
    };

    render(<MessageBubble message={messageWithTimestamp} />);

    // Find timestamp element (contains time)
    const timePattern = /\d{1,2}:\d{2}/;
    const timestamps = screen.getAllByText(timePattern);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('should align user messages to the right', () => {
    const { container } = render(<MessageBubble message={mockMessage} />);

    const messageContainer = container.querySelector('.justify-end');
    expect(messageContainer).toBeInTheDocument();
  });

  it('should align assistant messages to the left', () => {
    const assistantMessage: Message = {
      id: '7',
      role: 'assistant',
      content: 'Response',
      status: 'done',
    };

    const { container } = render(<MessageBubble message={assistantMessage} />);

    const messageContainer = container.querySelector('.justify-start');
    expect(messageContainer).toBeInTheDocument();
  });

  it('should have correct border radius (4px)', () => {
    const { container } = render(<MessageBubble message={mockMessage} />);

    const bubble = container.querySelector('.rounded');
    expect(bubble).toBeInTheDocument();
  });

  it('should limit message width to 85%', () => {
    const { container } = render(<MessageBubble message={mockMessage} />);

    const messageContainer = container.querySelector('.max-w-\\[85\\%\\]');
    expect(messageContainer).toBeInTheDocument();
  });
});
