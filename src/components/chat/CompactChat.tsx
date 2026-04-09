'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/stores/chat-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useReactionStore } from '@/stores/reaction-store';
import { pickReactionMessage } from '@/lib/reaction-messages';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { GrowthDelta } from '@/types';

// ── Chat emotion detection (same as ChatPanel) ───────────────
const HAPPY_PATTERN =
  /楽し|嬉し|うれし|すごい|いいね|面白|素敵|わくわく|よかった|がんば|応援/;
const SURPRISED_PATTERN =
  /びっくり|驚|意外|知らなかった|気をつけ|注意/;

function detectChatEmotion(text: string): 'happy' | 'surprised' | null {
  if (SURPRISED_PATTERN.test(text) && Math.random() < 0.7) return 'surprised';
  if (HAPPY_PATTERN.test(text) && Math.random() < 0.5) return 'happy';
  return null;
}

interface CompactChatProps {
  expanded: boolean;
  onToggleExpand: () => void;
  onClose?: () => void;
}

export default function CompactChat({
  expanded,
  onToggleExpand,
  onClose,
}: CompactChatProps) {
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
  const triggerReaction = useReactionStore((s) => s.triggerReaction);
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

        const emotion = detectChatEmotion(data.content);
        if (emotion) {
          const ctx = emotion === 'happy' ? 'chat-happy' : 'chat-surprised';
          triggerReaction(emotion, pickReactionMessage(ctx, params));
        }
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
      triggerReaction,
      params,
      applyGrowth,
      incrementInteractions,
    ],
  );

  const recentMessages = messages.slice(-3);

  return (
    <div
      className="w-[280px] sm:w-[320px] rounded-2xl border border-border bg-surface overflow-hidden"
      style={{ boxShadow: 'var(--shadow-chat)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-white text-[10px] font-bold">
            {aiName.charAt(0)}
          </div>
          <span className="text-[13px] font-semibold text-foreground">{aiName}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onToggleExpand}
            className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            aria-label={expanded ? '折りたたむ' : '展開する'}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              {expanded ? (
                <path d="M18 15l-6-6-6 6" />
              ) : (
                <path d="M6 9l6 6 6-6" />
              )}
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
              aria-label="閉じる"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div style={{ maxHeight: '320px' }} className="overflow-y-auto">
              <MessageList messages={messages} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {recentMessages.length > 0 ? (
              <div className="px-3 py-2 space-y-1.5" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-[13px] leading-relaxed ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <span
                      className={`inline-block max-w-[260px] rounded-xl px-3 py-1.5 ${
                        msg.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-chat-ai text-foreground border border-[var(--chat-ai-border)]'
                      }`}
                    >
                      {msg.content.length > 80
                        ? msg.content.slice(0, 80) + '...'
                        : msg.content}
                    </span>
                  </div>
                ))}
                {messages.length > 3 && (
                  <button
                    onClick={onToggleExpand}
                    className="block w-full text-center text-[11px] text-primary hover:underline py-1"
                  >
                    もっと見る
                  </button>
                )}
              </div>
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-[12px] text-muted">
                  {aiName}に話しかけてみよう
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isSending} />
    </div>
  );
}
