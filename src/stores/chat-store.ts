'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Conversation, Message } from '@/types';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isSending: boolean;

  // Actions
  startConversation: () => string;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'createdAt'>) => Message;
  setIsSending: (v: boolean) => void;
  deleteConversation: (id: string) => void;
  clearAll: () => void;

  // Selectors
  getCurrentConversation: () => Conversation | null;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isSending: false,

      startConversation: () => {
        const conv: Conversation = {
          id: uuidv4(),
          messages: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          conversations: [conv, ...s.conversations],
          currentConversationId: conv.id,
        }));
        return conv.id;
      },

      setCurrentConversation: (id) => set({ currentConversationId: id }),

      addMessage: (conversationId, msg) => {
        const message: Message = {
          ...msg,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, message] }
              : c,
          ),
        }));
        return message;
      },

      setIsSending: (isSending) => set({ isSending }),

      deleteConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          currentConversationId:
            s.currentConversationId === id ? null : s.currentConversationId,
        })),

      clearAll: () =>
        set({ conversations: [], currentConversationId: null }),

      getCurrentConversation: () => {
        const s = get();
        if (!s.currentConversationId) return null;
        return s.conversations.find((c) => c.id === s.currentConversationId) ?? null;
      },
    }),
    {
      name: 'ta-isamu:conversations',
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
    },
  ),
);
