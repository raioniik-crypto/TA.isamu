'use client';

import { useCallback } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { GrowthDelta } from '@/types';

interface ChatPanelProps {
  onClose: () => void;
  onMinimize: () => void;
}

export function ChatPanel({ onClose, onMinimize }: ChatPanelProps) {
  const {
    currentConversationId,
    startConversation,
    addMessage,
    setIsSending,
    isSending,
    getCurrentConversation,
  } = useChatStore();

  const conversation = getCurrentConversation();
  const messages = conversation?.messages ?? [];

  const aiName = useSettingsStore((s) => s.aiName);
  const params = useAIProfileStore((s) => s.params);
  const applyGrowth = useAIProfileStore((s) => s.applyGrowth);
  const incrementInteractions = useAIProfileStore((s) => s.incrementInteractions);

  const handleSend = useCallback(
    async (content: string) => {
      let convId = currentConversationId;
      if (!convId) {
        convId = startConversation();
      }

      addMessage(convId, { role: 'user', content });
      setIsSending(true);

      try {
        const allMessages = [
          ...(useChatStore
            .getState()
            .conversations.find((c) => c.id === convId)?.messages ?? []),
        ].map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: allMessages,
            aiName,
            growthParams: params,
          }),
        });

        if (!res.ok) throw new Error('API error');

        const data: { content: string; growthDelta: GrowthDelta } =
          await res.json();

        addMessage(convId, {
          role: 'assistant',
          content: data.content,
          metadata: { growthDelta: data.growthDelta },
        });

        if (data.growthDelta) {
          applyGrowth(data.growthDelta);
        }
        incrementInteractions();
      } catch {
        addMessage(convId, {
          role: 'assistant',
          content: 'ごめんね、うまく返答できなかったみたい。もう一度試してみて！',
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      currentConversationId,
      startConversation,
      addMessage,
      setIsSending,
      aiName,
      params,
      applyGrowth,
      incrementInteractions,
    ],
  );

  return (
    <div className="flex h-[480px] flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-success" />
          <h3 className="text-sm font-semibold text-foreground">{aiName}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            aria-label="最小化"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            aria-label="閉じる"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* メッセージ */}
      <MessageList messages={messages} />

      {/* 入力 */}
      <ChatInput onSend={handleSend} disabled={isSending} />
    </div>
  );
}
