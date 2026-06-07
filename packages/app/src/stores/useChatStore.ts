import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conversation, Message, MessageStatus } from '@/types';

interface ChatState {
  // State
  conversations: Conversation[];
  activeConversationId: string | null;
  version: number; // Increment to force re-renders

  // Computed
  activeConversation: Conversation | null;
  messages: Message[];

  // Actions
  createConversation: (title?: string) => Conversation;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;

  // Message actions
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'> | Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  appendToMessage: (conversationId: string, messageId: string, delta: string) => void;
  setMessageStatus: (conversationId: string, messageId: string, status: MessageStatus) => void;

  // Utility
  getConversation: (id: string) => Conversation | undefined;
}

const createDefaultConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: 'New Chat',
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      activeConversationId: null,
      version: 0,

      // Computed
      get activeConversation() {
        const { activeConversationId, conversations } = get();
        return conversations.find((c) => c.id === activeConversationId) || null;
      },

      get messages() {
        return get().activeConversation?.messages || [];
      },

      // Actions
      createConversation: (title) => {
        const newConversation: Conversation = {
          ...createDefaultConversation(),
          title: title || 'New Chat',
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: newConversation.id,
        }));

        return newConversation;
      },

      selectConversation: (id) => {
        set({ activeConversationId: id });
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        }));
      },

      updateConversationTitle: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: new Date() } : c
          ),
        }));
      },

      addMessage: (conversationId, message) => {
        const newMessage: Message = {
          ...message,
          id: 'id' in message && message.id ? message.id : crypto.randomUUID(),
          timestamp: 'timestamp' in message && message.timestamp ? message.timestamp : new Date(),
        };

        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                messages: [...c.messages, newMessage],
                updatedAt: new Date(),
              };
            }
            return c;
          }),
          version: state.version + 1,
        }));
      },

      updateMessage: (conversationId, messageId, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id === conversationId) {
              const updated = c.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              );
              return {
                ...c,
                messages: updated,
                updatedAt: new Date(),
              };
            }
            return c;
          }),
          version: state.version + 1,
        }));
      },

      appendToMessage: (conversationId, messageId, delta) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id === conversationId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId
                    ? { ...m, content: m.content + delta }
                    : m
                ),
              };
            }
            return c;
          }),
          version: state.version + 1,
        }));
      },

      setMessageStatus: (conversationId, messageId, status) => {
        get().updateMessage(conversationId, messageId, { status });
      },

      getConversation: (id) => {
        return get().conversations.find((c) => c.id === id);
      },
    }),
    {
      name: 'openskynet-chat-store',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);
