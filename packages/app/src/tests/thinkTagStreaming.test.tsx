import { render, screen, waitFor } from '@testing-library/react';
import { AgentPage } from '@/components/pages/AgentPage';
import { useChatStore } from '@/stores/useChatStore';
import { thinkTagParser } from '@/utils/thinkTagParser';

// Mock dependencies
jest.mock('@/hooks/useRPCConnection', () => ({
  useRPCConnection: () => {},
}));

jest.mock('@/services/chatService', () => ({
  getChatService: () => ({
    runTask: jest.fn(),
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

describe('Think Tag Streaming Integration', () => {
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

  it('should extract and display thinking content separately when streaming completes', async () => {
    render(<AgentPage />);

    // Wait for initialization
    await waitFor(() => {
      expect(useChatStore.getState().conversations).toHaveLength(1);
    });

    const conversation = useChatStore.getState().conversations[0];

    // Add user message
    useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'Explain quantum computing',
      status: 'done',
    });

    // Add assistant message with streaming status
    const assistantMsgId = 'assistant-think-123';
    useChatStore.getState().addMessage(conversation.id, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    // Simulate streaming chunks with think tags
    const fullContent = '<thinkI need to explain quantum computing simply.</think Quantum computing uses quantum mechanics...';

    // Simulate streaming by adding the full content
    useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, fullContent);

    // Get the message before marking as done
    let messages = useChatStore.getState().conversations[0]?.messages || [];
    let assistantMessage = messages.find(m => m.id === assistantMsgId);

    // Parse the accumulated content (this is what AgentPage onDone does)
    const parsed = thinkTagParser.parse(assistantMessage?.content || '');

    // Mark as done with parsed content
    useChatStore.getState().updateMessage(conversation.id, assistantMsgId, {
      content: parsed.visible,
      thinking: parsed.thinking || undefined,
      status: 'done',
    });

    // Get the message after update
    messages = useChatStore.getState().conversations[0]?.messages || [];
    assistantMessage = messages.find(m => m.id === assistantMsgId);

    // Verify the thinking content was extracted
    expect(assistantMessage?.thinking).toBe('I need to explain quantum computing simply.');
    // Verify the visible content has think tags removed
    expect(assistantMessage?.content).toBe('Quantum computing uses quantum mechanics...');
  });

  it('should handle streaming with no think tags', async () => {
    render(<AgentPage />);

    // Wait for initialization
    await waitFor(() => {
      expect(useChatStore.getState().conversations).toHaveLength(1);
    });

    const conversation = useChatStore.getState().conversations[0];

    // Add user message
    useChatStore.getState().addMessage(conversation.id, {
      role: 'user',
      content: 'Hello',
      status: 'done',
    });

    // Add assistant message with streaming status
    const assistantMsgId = 'assistant-no-think-123';
    useChatStore.getState().addMessage(conversation.id, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    // Simulate streaming chunks without think tags
    const fullContent = 'Hello! How can I help you today?';
    useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, fullContent);

    // Get the message before marking as done
    let messages = useChatStore.getState().conversations[0]?.messages || [];
    let assistantMessage = messages.find(m => m.id === assistantMsgId);

    // Parse the accumulated content (this is what AgentPage onDone does)
    const parsed = thinkTagParser.parse(assistantMessage?.content || '');

    // Mark as done with parsed content
    useChatStore.getState().updateMessage(conversation.id, assistantMsgId, {
      content: parsed.visible,
      thinking: parsed.thinking || undefined,
      status: 'done',
    });

    // Get the message after update
    messages = useChatStore.getState().conversations[0]?.messages || [];
    assistantMessage = messages.find(m => m.id === assistantMsgId);

    // Verify no thinking content
    expect(assistantMessage?.thinking).toBeUndefined();
    // Verify the visible content is intact
    expect(assistantMessage?.content).toBe('Hello! How can I help you today?');
  });

  it('should handle cumulative chunks with think tags', async () => {
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
    const assistantMsgId = 'assistant-cumulative-123';
    useChatStore.getState().addMessage(conversation.id, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    // Simulate cumulative streaming chunks
    const chunks = [
      '<think',
      '<thinkI need to ',
      '<thinkI need to think about this',
      '<thinkI need to think about this.</think',
      '<thinkI need to think about this.</think Here is ',
      '<thinkI need to think about this.</think Here is my answer',
    ];

    // Process chunks to simulate cumulative streaming behavior
    for (const chunk of chunks) {
      const currentMessage = useChatStore.getState().conversations
        .find(c => c.id === conversation.id)
        ?.messages.find(m => m.id === assistantMsgId);

      if (currentMessage && currentMessage.content && chunk.startsWith(currentMessage.content)) {
        const newContent = chunk.substring(currentMessage.content.length);
        useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, newContent);
      } else {
        useChatStore.getState().appendToMessage(conversation.id, assistantMsgId, chunk);
      }
    }

    // Mark as done (this should trigger think tag extraction)
    const currentMessage = useChatStore.getState().conversations
      .find(c => c.id === conversation.id)
      ?.messages.find(m => m.id === assistantMsgId);

    if (currentMessage?.content) {
      const parsed = thinkTagParser.parse(currentMessage.content);
      useChatStore.getState().updateMessage(conversation.id, assistantMsgId, {
        content: parsed.visible,
        thinking: parsed.thinking || undefined,
        status: 'done',
      });
    }

    // Get the message
    const messages = useChatStore.getState().conversations[0]?.messages || [];
    const assistantMessage = messages.find(m => m.id === assistantMsgId);

    // Verify the thinking content was extracted
    expect(assistantMessage?.thinking).toBe('I need to think about this.');
    // Verify the visible content has think tags removed
    expect(assistantMessage?.content).toBe('Here is my answer');
  });
});
