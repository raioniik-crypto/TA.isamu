'use client';

import { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '@/stores/chat-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useReactionStore } from '@/stores/reaction-store';
import { useHydration } from '@/stores/use-hydration';
import { pickReactionMessage } from '@/lib/reaction-messages';
import { ChatInput } from './ChatInput';
import type { GrowthDelta } from '@/types';

const HAPPY_PATTERN =
  /楽し|嬉し|うれし|すごい|いいね|面白|素敵|わくわく|よかった|がんば|応援/;
const SURPRISED_PATTERN =
  /びっくり|驚|意外|知らなかった|気をつけ|注意/;

function detectChatEmotion(text: string): 'happy' | 'surprised' | null {
  if (SURPRISED_PATTERN.test(text) && Math.random() < 0.7) return 'surprised';
  if (HAPPY_PATTERN.test(text) && Math.random() < 0.5) return 'happy';
  return null;
}

export function CasualChatPage() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydration();

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

  const displayName = hydrated ? aiName : 'アイモ';

  // Auto-scroll on new messages
  const messageCount = messages.length;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount]);

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

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4" style={{ height: 'calc(100dvh - 120px)' }}>
      {/* Header */}
      <div className="shrink-0 py-3 text-center">
        <h2 className="text-[13px] font-semibold text-muted">
          {displayName} とおしゃべり
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16 text-center">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                {displayName}とおしゃべりしよう
              </p>
              <p className="text-[13px] text-muted leading-relaxed">
                なんでも気軽に話してみてね
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i === messages.length - 1 ? 0.1 : 0, duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`whitespace-pre-wrap text-[15px] leading-[1.7] ${
                  msg.role === 'user'
                    ? 'max-w-[75%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-white'
                    : 'max-w-[80%] rounded-2xl rounded-bl-md border border-[var(--chat-ai-border)] bg-chat-ai px-4 py-3 text-foreground'
                }`}
              >
                <p>{msg.content}</p>
                <span
                  className={`mt-1 block text-right text-[11px] ${
                    msg.role === 'user' ? 'text-white/60' : 'text-muted'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </motion.div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0">
        <ChatInput onSend={handleSend} disabled={isSending} />
      </div>
    </div>
  );
}
