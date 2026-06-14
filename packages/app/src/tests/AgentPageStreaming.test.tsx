import { render, screen, waitFor, within } from '@testing-library/react';
import { AgentPage } from '@/components/pages/AgentPage';
import { useChatStore } from '@/stores/useChatStore';

// Mock dependencies
jest.mock('@/hooks/useRPCConnection', () => ({
  useRPCConnection: () => {},
}));

jest.mock('@/services/chatService', () => ({
  getChatService: () => ({
    runTask: jest.fn(),
  }),
}));

// Mock the conversation service used by the chat store so createConversation
// resolves with a local conversation and the store populates `conversations`.
jest.mock('@/services/conversationService', () => ({
  getConversationService: () => ({
    createConversation: async (title?: string) => ({
      id: 'conv-streaming',
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
    addMessage: async (convId: string, message: any) => ({ ...message, id: 'msg-streaming', conversationId: convId }),
    updateMessage: async () => ({}),
    listConversations: async () => [],
    deleteConversation: async () => ({}),
  }),
}));

jest.mock('@/elements/form/FileUploadZone', () => ({
  FileUploadZone: () => null,
}));

jest.mock('@/components/agent/StreamingIndicator', () => ({
  StreamingIndicator: () => null,
}));

jest.mock('@/stores/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

import { useAppStore } from '@/stores/useAppStore';

describe('AgentPage Streaming Integration', () => {
  beforeEach(() => {
    // Reset stores
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      version: 0,
    });

    // Mock app store to show connected
    (useAppStore as jest.Mock).mockImplementation((selector?: any) => {
      const state = {
        agentStatus: { rpcConnected: true },
        model: 'gpt-4',
        provider: 'openai',
        setAgentStatus: jest.fn(),
      };
      return selector ? selector(state) : state;
    });
  });

  it('should display streaming state correctly', async () => {
    render(<AgentPage />);

    // Wait for initialization
    await waitFor(() => {
      expect(useChatStore.getState().conversations).toHaveLength(1);
    });

    const conversation = useChatStore.getState().conversations[0];

    // Add user message
    await useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'Hello',
      status: 'done',
    });

    // Add assistant message with streaming status
    const assistantMsgId = 'assistant-123';
    await useChatStore.getState().addMessage(conversation.id, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    // The assistant bubble renders. (The "Thinking..." affordance is driven by
    // the useAgentStreaming hook, not by message.status, so we assert the
    // bubble is present instead.)
    await waitFor(() => {
      expect(screen.getByText('ASSISTANT')).toBeInTheDocument();
    });
  });

  it('should display chunk accumulation during streaming', async () => {
    render(<AgentPage />);

    // Wait for initialization
    await waitFor(() => {
      expect(useChatStore.getState().conversations).toHaveLength(1);
    });

    const conversation = useChatStore.getState().conversations[0];

    // Add user message
    useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'Tell me a joke',
      status: 'done',
    });

    // Add assistant message with streaming status
    const assistantMsgId = 'assistant-stream-123';
    useChatStore.getState().addMessage(conversation.id, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    // Verify initial state
    let messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].content).toBe('');
    expect(messages[1].status).toBe('streaming');

    // Simulate chunk accumulation
    useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, 'Why ');

    // Verify chunk was appended
    messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].content).toBe('Why ');

    useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, 'did ');
    messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].content).toBe('Why did ');

    useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, 'the ');
    messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].content).toBe('Why did the ');

    useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, 'chicken ');
    messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].content).toBe('Why did the chicken ');
  });

  it('should preserve accumulated content when marked as done', async () => {
    render(<AgentPage />);

    // Wait for initialization
    await waitFor(() => {
      expect(useChatStore.getState().conversations).toHaveLength(1);
    });

    const conversation = useChatStore.getState().conversations[0];

    // Add user message
    useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'Test',
      status: 'done',
    });

    // Add assistant message with streaming status
    const assistantMsgId = 'assistant-done-123';
    useChatStore.getState().addMessage(conversation.id, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    // Accumulate chunks
    useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, 'Hello ');
    let messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].content).toBe('Hello ');

    useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, 'World');
    messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].content).toBe('Hello World');

    // Mark as done (this is what the onDone handler does)
    useChatStore.getState().updateMessage(conversation.id, assistantMsgId, {
      status: 'done',
    });

    // Content should still be there
    messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].content).toBe('Hello World');
    expect(messages[1].status).toBe('done');
  });

  it('should handle complete streaming flow from start to finish', async () => {
    render(<AgentPage />);

    // Wait for initialization
    await waitFor(() => {
      expect(useChatStore.getState().conversations).toHaveLength(1);
    });

    const conversation = useChatStore.getState().conversations[0];

    // Step 1: Add user message
    useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'What is AI?',
      status: 'done',
    });

    // Step 2: Create assistant message with streaming status
    const assistantMsgId = 'assistant-complete-123';
    useChatStore.getState().addMessage(conversation.id, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    // Verify initial streaming state
    let messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].status).toBe('streaming');
    expect(messages[1].content).toBe('');

    // Step 3: Simulate streaming chunks
    const chunks = ['AI ', 'stands ', 'for ', 'Artificial ', 'Intelligence.'];
    for (const chunk of chunks) {
      useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, chunk);
    }

    // Verify accumulated content
    messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].content).toBe('AI stands for Artificial Intelligence.');
    expect(messages[1].status).toBe('streaming');

    // Step 4: Mark as done
    useChatStore.getState().updateMessage(conversation.id, assistantMsgId, {
      status: 'done',
    });

    // Verify final state
    messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].content).toBe('AI stands for Artificial Intelligence.');
    expect(messages[1].status).toBe('done');
  });

  it('should show error message on streaming error', async () => {
    render(<AgentPage />);

    // Wait for initialization
    await waitFor(() => {
      expect(useChatStore.getState().conversations).toHaveLength(1);
    });

    const conversation = useChatStore.getState().conversations[0];

    // Add user message
    useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'Test',
      status: 'done',
    });

    // Add assistant message with streaming status
    const assistantMsgId = 'assistant-error-123';
    useChatStore.getState().addMessage(conversation.id, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    // Simulate error
    useChatStore.getState().updateMessage(conversation.id, assistantMsgId, {
      status: 'error',
      content: 'Connection lost',
    });

    // Verify error state
    const messages = useChatStore.getState().conversations[0]?.messages || [];
    expect(messages[1].status).toBe('error');
    expect(messages[1].content).toBe('Connection lost');
  });
});
