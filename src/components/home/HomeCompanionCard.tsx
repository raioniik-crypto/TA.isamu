'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { CharacterAvatar } from '@/components/ai-character/CharacterAvatar';
import { ChatBubble } from '@/components/ai-character/ChatBubble';
import { useChatStore } from '@/stores/chat-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useReactionStore } from '@/stores/reaction-store';
import { useHydration } from '@/stores/use-hydration';
import { pickReactionMessage } from '@/lib/reaction-messages';
import type { CharacterExpression, GrowthDelta } from '@/types';

const HAPPY_PATTERN =
  /楽し|嬉し|うれし|すごい|いいね|面白|素敵|わくわく|よかった|がんば|応援/;
const SURPRISED_PATTERN =
  /びっくり|驚|意外|知らなかった|気をつけ|注意/;

function detectChatEmotion(text: string): 'happy' | 'surprised' | null {
  if (SURPRISED_PATTERN.test(text) && Math.random() < 0.7) return 'surprised';
  if (HAPPY_PATTERN.test(text) && Math.random() < 0.5) return 'happy';
  return null;
}

function getHomeCharacterSize(): number {
  if (typeof window === 'undefined') return 240;
  const w = window.innerWidth;
  if (w >= 1280) return 280;
  if (w >= 768) return 240;
  return 180;
}

export function HomeCompanionCard() {
  const [charSize, setCharSize] = useState(240);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const hydrated = useHydration();
  const aiName = useSettingsStore((s) => s.aiName);
  const isSending = useChatStore((s) => s.isSending);
  const reaction = useReactionStore((s) => s.reaction);
  const clearReaction = useReactionStore((s) => s.clearReaction);
  const triggerReaction = useReactionStore((s) => s.triggerReaction);
  const params = useAIProfileStore((s) => s.params);
  const applyGrowth = useAIProfileStore((s) => s.applyGrowth);
  const incrementInteractions = useAIProfileStore((s) => s.incrementInteractions);

  const {
    currentConversationId,
    startConversation,
    addMessage,
    setIsSending,
    getCurrentConversation,
  } = useChatStore();

  const conversation = getCurrentConversation();
  const messages = conversation?.messages ?? [];
  const latestAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  const displayName = hydrated ? aiName : 'アイモ';

  // Responsive size
  useEffect(() => {
    setCharSize(getHomeCharacterSize());
    const handleResize = () => setCharSize(getHomeCharacterSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Greeting on mount (only if no prior conversation)
  useEffect(() => {
    if (!hydrated) return;
    if (latestAssistant) return; // already has conversation
    const timer = setTimeout(() => {
      const currentParams = useAIProfileStore.getState().params;
      setGreeting(pickReactionMessage('greeting', currentParams));
    }, 1500);
    return () => clearTimeout(timer);
  }, [hydrated, latestAssistant]);

  // Auto-clear reaction after 4 seconds
  useEffect(() => {
    if (!reaction) return;
    const timer = setTimeout(clearReaction, 4000);
    return () => clearTimeout(timer);
  }, [reaction, clearReaction]);

  // Bubble display: reaction > latest assistant > greeting
  const displayMessage = reaction?.message ?? latestAssistant?.content ?? greeting;

  const expression: CharacterExpression = (() => {
    if (isSending) return 'thinking';
    if (reaction) return reaction.expression;
    if (greeting) return 'happy';
    return 'neutral';
  })();

  const handleSend = useCallback(
    async (content: string) => {
      let convId = currentConversationId;
      if (!convId) {
        convId = startConversation();
      }

      addMessage(convId, { role: 'user', content });
      setIsSending(true);
      setGreeting(null);

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

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;
    handleSend(trimmed);
    setInputValue('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-12 sm:py-16"
    >
      {/* Character + bubble */}
      <div className="relative" style={{ width: charSize }}>
        <ChatBubble
          message={displayMessage ?? null}
          visible={!!displayMessage}
          centered
        />
        <CharacterAvatar
          size={charSize}
          isThinking={isSending}
          expression={expression}
        />
      </div>

      {/* Subtle label */}
      <p className="mt-3 text-[12px] text-muted font-medium">
        {displayName}
      </p>

      {/* Input field */}
      <div className="mt-5 w-full max-w-sm px-4">
        <div
          className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && inputValue.trim()) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={`${displayName}に話しかける…`}
            disabled={isSending}
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted/50 focus:outline-none disabled:opacity-50"
            autoComplete="off"
          />
          <button
            onClick={handleSubmit}
            disabled={isSending || !inputValue.trim()}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
              inputValue.trim() && !isSending
                ? 'bg-primary text-white shadow-sm hover:bg-primary-dark active:scale-95'
                : 'bg-transparent text-muted'
            }`}
            aria-label="送信"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
