import { renderHook, act } from '@testing-library/react';
import { useChatStore } from '@/stores/useChatStore';
import type { ConversationService } from '@/services/conversationService';

// Mock conversationService
jest.mock('@/services/conversationService', () => ({
  getConversationService: jest.fn(),
}));

describe('useChatStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store before each test
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      version: 0,
    });
  });

  it('should create a conversation', async () => {
    const mockService = {
      createConversation: jest.fn().mockImplementation((title) =>
        Promise.resolve({
          id: '123',
          title: title || 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    } as unknown as ConversationService;

    const { getConversationService } = await import('@/services/conversationService');
    jest.mocked(getConversationService).mockReturnValue(mockService);

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.createConversation('Test Chat');
    });

    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].title).toBe('Test Chat');
  });

  it('should add a message to a conversation', async () => {
    const mockService = {
      createConversation: jest.fn().mockImplementation((title) =>
        Promise.resolve({
          id: '123',
          title: title || 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    } as unknown as ConversationService;

    const { getConversationService } = await import('@/services/conversationService');
    jest.mocked(getConversationService).mockReturnValue(mockService);

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      const conversation = await result.current.createConversation('Test Chat');
      result.current.addMessage(conversation.id, {
        role: 'user',
        content: 'Hello',
        status: 'done',
      });
    });

    expect(result.current.conversations[0].messages).toHaveLength(1);
    expect(result.current.conversations[0].messages[0].content).toBe('Hello');
  });

  it('should update a message and trigger re-render', async () => {
    const mockService = {
      createConversation: jest.fn().mockImplementation((title) =>
        Promise.resolve({
          id: '123',
          title: title || 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    } as unknown as ConversationService;

    const { getConversationService } = await import('@/services/conversationService');
    jest.mocked(getConversationService).mockReturnValue(mockService);

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      const conversation = await result.current.createConversation('Test Chat');
      result.current.addMessage(conversation.id, {
        role: 'assistant',
        content: 'Thinking...',
        status: 'streaming',
      });
    });

    const messageId = result.current.conversations[0].messages[0].id;
    const conversationId = result.current.conversations[0].id;

    // Verify initial state
    expect(result.current.conversations[0].messages[0].content).toBe('Thinking...');
    expect(result.current.conversations[0].messages[0].status).toBe('streaming');

    // Update the message
    act(() => {
      result.current.updateMessage(conversationId, messageId, {
        content: 'Hello! How can I help you today?',
        status: 'done',
      });
    });

    // Verify the message was updated
    expect(result.current.conversations[0].messages[0].content).toBe('Hello! How can I help you today?');
    expect(result.current.conversations[0].messages[0].status).toBe('done');

    // Verify version was incremented
    expect(result.current.version).toBeGreaterThan(0);
  });

  it('should append to a message', async () => {
    const mockService = {
      createConversation: jest.fn().mockImplementation((title) =>
        Promise.resolve({
          id: '123',
          title: title || 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    } as unknown as ConversationService;

    const { getConversationService } = await import('@/services/conversationService');
    jest.mocked(getConversationService).mockReturnValue(mockService);

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      const conversation = await result.current.createConversation('Test Chat');
      result.current.addMessage(conversation.id, {
        role: 'assistant',
        content: 'Hello',
        status: 'streaming',
      });
    });

    const messageId = result.current.conversations[0].messages[0].id;
    const conversationId = result.current.conversations[0].id;

    act(() => {
      result.current.appendToMessage(conversationId, messageId, ' World');
    });

    expect(result.current.conversations[0].messages[0].content).toBe('Hello World');
  });

  it('should trigger re-render when version changes', async () => {
    const mockService = {
      createConversation: jest.fn().mockImplementation((title) =>
        Promise.resolve({
          id: '123',
          title: title || 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    } as unknown as ConversationService;

    const { getConversationService } = await import('@/services/conversationService');
    jest.mocked(getConversationService).mockReturnValue(mockService);

    const { result } = renderHook(() => useChatStore());

    const initialVersion = result.current.version;

    await act(async () => {
      const conversation = await result.current.createConversation('Test Chat');
      result.current.addMessage(conversation.id, {
        role: 'assistant',
        content: 'Thinking...',
        status: 'streaming',
      });
    });

    // Verify version was incremented
    expect(result.current.version).toBeGreaterThan(initialVersion);

    const messageId = result.current.conversations[0].messages[0].id;
    const conversationId = result.current.conversations[0].id;
    const beforeUpdateVersion = result.current.version;

    act(() => {
      result.current.updateMessage(conversationId, messageId, {
        content: 'Updated content',
        status: 'done',
      });
    });

    // Verify version was incremented again
    expect(result.current.version).toBeGreaterThan(beforeUpdateVersion);
  });
});
