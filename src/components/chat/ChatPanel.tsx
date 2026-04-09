'use client';

import { useCallback } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useReactionStore } from '@/stores/reaction-store';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { GrowthDelta } from '@/types';

// ── Chat emotion detection ─────────────────────────────────
const HAPPY_PATTERN =
  /楽し|嬉し|うれし|すごい|いいね|面白|素敵|わくわく|よかった|がんば|応援/;
const SURPRISED_PATTERN =
  /びっくり|驚|意外|知らなかった|気をつけ|注意/;

const CHAT_HAPPY_MSGS = ['うんうん！', 'いい話だね！', 'なんだかうれしいな'];
const CHAT_SURPRISED_MSGS = ['おっ！', 'へぇ〜！', 'そうなんだ！'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Detect emotion from the assistant response text. Returns null most of the time to stay subtle. */
function detectChatEmotion(
  text: string,
): { expression: 'happy' | 'surprised'; message: string } | null {
  // Check surprised first — more specific, less common
  if (SURPRISED_PATTERN.test(text) && Math.random() < 0.7) {
    return { expression: 'surprised', message: pick(CHAT_SURPRISED_MSGS) };
  }
  if (HAPPY_PATTERN.test(text) && Math.random() < 0.5) {
    return { expression: 'happy', message: pick(CHAT_HAPPY_MSGS) };
  }
  return null;
}

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

        // Trigger character emotion based on response content
        const emotion = detectChatEmotion(data.content);
        if (emotion) {
          triggerReaction(emotion.expression, emotion.message);
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
    <div
      className="flex flex-col rounded-2xl border border-border bg-surface overflow-hidden"
      style={{ height: 'min(520px, calc(100dvh - 120px))', boxShadow: 'var(--shadow-chat)' }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-white text-xs font-bold">
              {aiName.charAt(0)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-surface" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">{aiName}</h3>
            <p className="text-[11px] text-muted leading-tight">オンライン</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onMinimize}
            className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            aria-label="最小化"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            aria-label="閉じる"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
