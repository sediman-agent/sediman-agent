import { render, screen, waitFor } from '@testing-library/react';
import { AgentPage } from '@/components/pages/AgentPage';
import { useChatStore } from '@/stores/useChatStore';
import { useAppStore } from '@/stores/useAppStore';

// Mock the RPC connection hook
jest.mock('@/hooks/useRPCConnection', () => ({
  useRPCConnection: () => {},
}));

// Mock the app store to return connected status
jest.mock('@/stores/useAppStore', () => ({
  useAppStore: (selector?: any) => {
    const state = {
      agentStatus: { rpcConnected: true },
      model: 'gpt-4',
      provider: 'openai',
      setAgentStatus: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

// Mock the chat service
jest.mock('@/services/chatService', () => ({
  getChatService: () => ({
    runTask: jest.fn(),
  }),
}));

// Mock FileUploadZone
jest.mock('@/elements/form/FileUploadZone', () => ({
  FileUploadZone: () => null,
}));

// Mock StreamingIndicator
jest.mock('@/components/agent/StreamingIndicator', () => ({
  StreamingIndicator: () => null,
}));

describe('AgentPage Streaming', () => {
  beforeEach(() => {
    // Reset the store before each test
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      version: 0,
    });
  });

  it('should display streaming message when status is streaming', async () => {
    const { container } = render(<AgentPage />);

    // Wait for the component to initialize
    await waitFor(() => {
      expect(useChatStore.getState().conversations).toHaveLength(1);
    });

    const conversation = useChatStore.getState().conversations[0];

    // Add a user message
    useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'Hello',
      status: 'done',
    });

    // Add an assistant message with streaming status
    useChatStore.getState().addMessage(conversation.id, {
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    await waitFor(() => {
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });
  });

  it('should display message content when streaming completes', async () => {
    const { container } = render(<AgentPage />);

    // Wait for the component to initialize
    await waitFor(() => {
      expect(useChatStore.getState().conversations).toHaveLength(1);
    });

    const conversation = useChatStore.getState().conversations[0];

    // Add a user message
    useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'Hello',
      status: 'done',
    });

    // Add an assistant message with streaming status
    useChatStore.getState().addMessage(conversation.id, {
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    await waitFor(() => {
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    // Update the assistant message with content and mark as done
    const messages = useChatStore.getState().conversations[0].messages;
    const assistantMessage = messages.find(m => m.role === 'assistant');

    if (assistantMessage) {
      useChatStore.getState().updateMessage(conversation.id, assistantMessage.id, {
        content: 'Hello! How can I help you today?',
        status: 'done',
      });
    }

    // The component should re-render and show the content
    await waitFor(() => {
      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    });

    // "Thinking..." should no longer be visible
    expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
  });
});
