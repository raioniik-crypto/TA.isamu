'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { CharacterAvatar } from '@/components/ai-character/CharacterAvatar';
import { ChatBubble } from '@/components/ai-character/ChatBubble';
import { useChatStore } from '@/stores/chat-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useReactionStore } from '@/stores/reaction-store';
import { useViewerStore } from '@/stores/viewer-store';
import { useHistoryStore } from '@/stores/history-store';
import { useHydration } from '@/stores/use-hydration';
import { pickReactionMessage } from '@/lib/reaction-messages';
import type { CharacterExpression, GrowthDelta, ViewerContent } from '@/types';

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
  if (typeof window === 'undefined') return 220;
  const w = window.innerWidth;
  if (w >= 1280) return 260;
  if (w >= 768) return 220;
  return 160;
}

const SAMPLE_URLS = [
  {
    label: 'Wikipedia',
    url: 'https://ja.wikipedia.org/',
    icon: '📚',
    action: '調べものをする',
  },
  {
    label: 'NHK NEWS WEB',
    url: 'https://www3.nhk.or.jp/news/',
    icon: '📰',
    action: '最新ニュースを読む',
  },
  {
    label: 'Yahoo!ニュース',
    url: 'https://news.yahoo.co.jp/',
    icon: '📡',
    action: 'ニュースを探す',
  },
  {
    label: 'YouTube',
    url: 'https://www.youtube.com/',
    icon: '🎬',
    action: '動画を一緒に見る',
  },
  {
    label: 'Qiita',
    url: 'https://qiita.com/',
    icon: '💻',
    action: '技術記事を読む',
  },
  {
    label: 'GitHub',
    url: 'https://github.com/trending',
    icon: '🐙',
    action: 'トレンドを見る',
  },
];

export function HomeCompanionCard() {
  const [charSize, setCharSize] = useState(220);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [chatValue, setChatValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const chatInputRef = useRef<HTMLInputElement>(null);

  const hydrated = useHydration();
  const aiName = useSettingsStore((s) => s.aiName);
  const isSending = useChatStore((s) => s.isSending);
  const reaction = useReactionStore((s) => s.reaction);
  const clearReaction = useReactionStore((s) => s.clearReaction);
  const triggerReaction = useReactionStore((s) => s.triggerReaction);
  const params = useAIProfileStore((s) => s.params);
  const applyGrowth = useAIProfileStore((s) => s.applyGrowth);
  const incrementInteractions = useAIProfileStore((s) => s.incrementInteractions);

  const setContent = useViewerStore((s) => s.setContent);
  const setViewerLoading = useViewerStore((s) => s.setLoading);
  const setViewerError = useViewerStore((s) => s.setError);
  const isViewerLoading = useViewerStore((s) => s.isLoading);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);
  const historyEntries = useHistoryStore((s) => s.entries);

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
    if (isSending || isViewerLoading) return 'thinking';
    if (reaction) return reaction.expression;
    if (greeting) return 'happy';
    return 'neutral';
  })();

  const handleChatSend = useCallback(
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

  const handleOpenUrl = useCallback(
    async (targetUrl: string) => {
      setViewerLoading(true);
      setViewerError(null);
      try {
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'ページを開けませんでした。');
        }
        const data: ViewerContent = await res.json();
        setContent(data);
        addHistoryEntry({ url: data.url, title: data.title, type: data.type });
      } catch (e) {
        setViewerError(
          e instanceof Error ? e.message : 'ページを開けませんでした。',
        );
      } finally {
        setViewerLoading(false);
      }
    },
    [setContent, setViewerLoading, setViewerError, addHistoryEntry],
  );

  const looksLikeUrl = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return false;
    if (/^https?:\/\//i.test(trimmed)) return true;
    // ドメインっぽい形 (x.y)
    return /^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(trimmed);
  };

  const handleChatSubmit = () => {
    const trimmed = chatValue.trim();
    if (!trimmed || isSending) return;
    handleChatSend(trimmed);
    setChatValue('');
  };

  const handleUrlSubmit = () => {
    const trimmed = urlValue.trim();
    if (!trimmed || isViewerLoading) return;
    const finalUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    handleOpenUrl(finalUrl);
    setUrlValue('');
  };

  const hasHistory = hydrated && historyEntries.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center pt-8 pb-12 sm:pt-12 sm:pb-16"
    >
      {/* Character + bubble (centered on home) */}
      <div className="relative" style={{ width: charSize }}>
        <ChatBubble
          message={displayMessage ?? null}
          visible={!!displayMessage}
          centered
        />
        <CharacterAvatar
          size={charSize}
          isThinking={isSending || isViewerLoading}
          expression={expression}
        />
      </div>

      {/* URL input — primary action */}
      <div className="mt-6 w-full max-w-lg px-4">
        <div
          className="flex items-center rounded-2xl border border-border bg-surface overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <span className="pl-4 text-muted shrink-0">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            type="text"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.nativeEvent.isComposing &&
                urlValue.trim() &&
                !isViewerLoading
              ) {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
            placeholder="URLを入力して一緒に見よう"
            disabled={isViewerLoading}
            className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-[15px] text-foreground placeholder:text-muted/50 focus:outline-none disabled:opacity-60"
            autoComplete="off"
            inputMode="url"
          />
          <button
            onClick={handleUrlSubmit}
            disabled={isViewerLoading || !urlValue.trim()}
            className="shrink-0 mr-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-dark active:scale-[0.97] disabled:opacity-40"
          >
            {isViewerLoading ? '…' : '開く'}
          </button>
        </div>
      </div>

      {/* Chat input — secondary: talk to the character */}
      <div className="mt-3 w-full max-w-lg px-4">
        <div
          className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <input
            ref={chatInputRef}
            type="text"
            value={chatValue}
            onChange={(e) => setChatValue(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.nativeEvent.isComposing &&
                chatValue.trim()
              ) {
                e.preventDefault();
                // If it looks like a URL, route to URL open for convenience
                if (looksLikeUrl(chatValue)) {
                  const trimmed = chatValue.trim();
                  const finalUrl =
                    trimmed.startsWith('http://') ||
                    trimmed.startsWith('https://')
                      ? trimmed
                      : `https://${trimmed}`;
                  handleOpenUrl(finalUrl);
                  setChatValue('');
                  return;
                }
                handleChatSubmit();
              }
            }}
            placeholder={`${displayName}に話しかける…`}
            disabled={isSending}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted/50 focus:outline-none disabled:opacity-50"
            autoComplete="off"
          />
          <button
            onClick={handleChatSubmit}
            disabled={isSending || !chatValue.trim()}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
              chatValue.trim() && !isSending
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

      {/* Quick links */}
      <div className="mt-8 w-full max-w-2xl px-4">
        <p className="mb-3 text-center text-[12px] text-muted font-medium">
          おすすめリンクから始める
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SAMPLE_URLS.map((s) => (
            <button
              key={s.url}
              onClick={() => handleOpenUrl(s.url)}
              disabled={isViewerLoading}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-3 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.97] disabled:opacity-40"
            >
              <span className="text-2xl leading-none">{s.icon}</span>
              <span className="text-[12px] font-medium text-foreground text-center leading-tight">
                {s.label}
              </span>
              <span className="text-[11px] text-muted text-center leading-snug">
                {s.action}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Browsing history */}
      {hasHistory && (
        <div className="mt-6 w-full max-w-2xl px-4">
          <h2 className="mb-2 text-[12px] font-semibold text-muted">
            最近開いたページ
          </h2>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {historyEntries.slice(0, 5).map((entry) => (
              <button
                key={entry.url}
                onClick={() => handleOpenUrl(entry.url)}
                disabled={isViewerLoading}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover disabled:opacity-40"
              >
                <span className="text-sm shrink-0">
                  {entry.type === 'youtube' ? '🎬' : '📄'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {entry.title}
                  </p>
                  <p className="text-[11px] text-muted truncate">{entry.url}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
