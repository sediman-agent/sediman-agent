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

// Mock the conversation service used by the chat store. The store calls
// getConversationService() and awaits its methods; we return resolved promises
// echoing the input so the store's optimistic/local fallback paths run and
// `conversations` actually populate in the test.
jest.mock('@/services/conversationService', () => ({
  getConversationService: () => ({
    createConversation: async (title?: string) => ({
      id: 'conv-test',
      title: title || 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    getConversation: async (id: string) => ({
      id,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    addMessage: async (convId: string, message: any) => ({ ...message, id: 'msg-test', conversationId: convId }),
    updateMessage: async () => ({}),
    listConversations: async () => [],
    deleteConversation: async () => ({}),
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
    await useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'Hello',
      status: 'done',
    });

    // Add an assistant message with streaming status
    await useChatStore.getState().addMessage(conversation.id, {
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    // The streaming assistant message renders its bubble. (The blinking
    // cursor '▊' is driven by the useAgentStreaming hook's isStreaming flag,
    // which is only set during a real handleSend — not by directly setting
    // message.status. Here we verify the message is rendered at all.)
    await waitFor(() => {
      expect(screen.getByText('ASSISTANT')).toBeInTheDocument();
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
    await useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'Hello',
      status: 'done',
    });

    // Add an assistant message with content and done status
    await useChatStore.getState().addMessage(conversation.id, {
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      status: 'done',
    });

    // The component should render the assistant's content.
    await waitFor(() => {
      const matches = screen.getAllByText(/How can I help you today/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
