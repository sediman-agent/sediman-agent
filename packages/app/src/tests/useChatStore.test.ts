import { renderHook, act } from '@testing-library/react';
import { useChatStore } from '@/stores/useChatStore';

describe('useChatStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      version: 0,
    });
  });

  it('should create a conversation', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      result.current.createConversation('Test Chat');
    });

    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].title).toBe('Test Chat');
  });

  it('should add a message to a conversation', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      const conversation = result.current.createConversation('Test Chat');
      result.current.addMessage(conversation.id, {
        role: 'user',
        content: 'Hello',
        status: 'done',
      });
    });

    expect(result.current.conversations[0].messages).toHaveLength(1);
    expect(result.current.conversations[0].messages[0].content).toBe('Hello');
  });

  it('should update a message and trigger re-render', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      const conversation = result.current.createConversation('Test Chat');
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

  it('should append to a message', () => {
    const { result } = renderHook(() => useChatStore());

    act(() => {
      const conversation = result.current.createConversation('Test Chat');
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

  it('should trigger re-render when version changes', () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      return useChatStore((state) => ({
        conversations: state.conversations,
        version: state.version,
      }));
    });

    const initialRenderCount = renderCount;

    act(() => {
      const conversation = result.current.createConversation('Test Chat');
      result.current.addMessage(conversation.id, {
        role: 'assistant',
        content: 'Thinking...',
        status: 'streaming',
      });
    });

    // Should have re-rendered
    expect(renderCount).toBeGreaterThan(initialRenderCount);

    const messageId = result.current.conversations[0].messages[0].id;
    const conversationId = result.current.conversations[0].id;
    const beforeUpdateRenderCount = renderCount;

    act(() => {
      result.current.updateMessage(conversationId, messageId, {
        content: 'Updated content',
        status: 'done',
      });
    });

    // Should have re-rendered again
    expect(renderCount).toBeGreaterThan(beforeUpdateRenderCount);
  });
});
