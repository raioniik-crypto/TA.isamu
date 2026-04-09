'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useViewerStore } from '@/stores/viewer-store';
import { useWatchingStore, type QAMessage } from '@/stores/watching-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';

const BETA_BADGE = (
  <span className="inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
    BETA
  </span>
);

export function VideoQA() {
  // ─── すべての hooks をコンポーネント先頭で無条件に呼ぶ ───
  const content = useViewerStore((s) => s.content);
  const session = useWatchingStore((s) => s.session);
  const addMessage = useWatchingStore((s) => s.addMessage);
  const startSession = useWatchingStore((s) => s.startSession);
  const updateTranscript = useWatchingStore((s) => s.updateTranscript);

  const aiName = useSettingsStore((s) => s.aiName);
  const params = useAIProfileStore((s) => s.params);

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [manualText, setManualText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const isYouTube = !!content && content.type === 'youtube';
  const hasTranscript = isYouTube && !!content.body;
  const videoId = isYouTube ? content.youtubeId : undefined;
  const hasSession = !!session && !!videoId && session.videoId === videoId;
  const hasSessionText = hasSession && session.transcript.length > 0;
  const messagesLength = session?.messages.length ?? 0;

  // セッション自動開始: 字幕が自動取得できていたら即セッション開始
  useEffect(() => {
    if (!isYouTube || !videoId || !hasTranscript || hasSession) return;
    startSession(videoId, content.body!, 'auto');
  }, [isYouTube, videoId, hasTranscript, hasSession, content?.body, startSession]);

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesLength]);

  // ─── 早期 return は hooks の後ろ ───
  if (!isYouTube) return null;

  const handleManualSubmit = () => {
    const text = manualText.trim();
    if (!text || !videoId) return;
    if (hasSession) {
      updateTranscript(text, 'manual');
    } else {
      startSession(videoId, text, 'manual');
    }
    setManualText('');
  };

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || !hasSessionText) return;
    setIsAsking(true);

    const userMsg: QAMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);
    setQuestion('');

    try {
      const allMessages = [...session!.messages, userMsg];
      const res = await fetch('/api/video-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTranscript: session!.transcript,
          messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          aiName,
          growthParams: params,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '回答の取得に失敗しました。');
      }

      const data: { content: string; excerpts?: string[] } = await res.json();

      const assistantMsg: QAMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        excerpts: data.excerpts,
        createdAt: new Date().toISOString(),
      };
      addMessage(assistantMsg);
    } catch (e) {
      const errMsg: QAMessage = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: e instanceof Error ? e.message : '回答の取得に失敗しました。',
        createdAt: new Date().toISOString(),
      };
      addMessage(errMsg);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      data-snap-target
      className="rounded-2xl border border-border bg-surface overflow-hidden"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* ヘッダー */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className="text-base">💬</span>
        <h3 className="text-sm font-semibold text-foreground">
          この動画について質問する
        </h3>
        {BETA_BADGE}
      </div>

      <div className="p-4 space-y-3">
        {/* セッション未開始 & 字幕なし → 手動テキスト入力 */}
        {!hasSessionText && (
          <div className="space-y-2">
            <p className="text-[12px] text-muted leading-relaxed">
              {hasTranscript
                ? '字幕を読み込み中...'
                : '字幕の自動取得に失敗しました。字幕テキストや動画のメモを貼り付けると、その内容について質問できます。'}
            </p>
            {!hasTranscript && (
              <>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={'字幕テキストや動画の概要・メモを貼り付けてください'}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted/50 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualText.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-white transition-all hover:bg-primary-dark active:scale-[0.97] disabled:opacity-40"
                >
                  テキストを設定してQ&Aを開始
                </button>
              </>
            )}
          </div>
        )}

        {/* Q&A会話履歴 */}
        {hasSessionText && (
          <>
            {session!.messages.length > 0 && (
              <div
                ref={scrollRef}
                className="max-h-[280px] overflow-y-auto space-y-2 rounded-lg border border-border bg-background p-3"
              >
                <AnimatePresence initial={false}>
                  {session!.messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} aiName={aiName} />
                  ))}
                </AnimatePresence>
                {isAsking && (
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                      className="text-[12px] text-muted"
                    >
                      {aiName}が考え中...
                    </motion.span>
                  </div>
                )}
              </div>
            )}

            {/* Onboarding hint */}
            {session!.messages.length === 0 && (
              <p className="text-[12px] text-muted/70 leading-relaxed px-1">
                動画の内容について自由に質問できます。「この動画のポイントは？」「○○について詳しく教えて」など。
              </p>
            )}

            {/* 質問入力 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && !isAsking) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder="この動画について質問してみよう..."
                disabled={isAsking}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60"
              />
              <button
                onClick={handleAsk}
                disabled={isAsking || !question.trim()}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-primary-dark active:scale-[0.97] disabled:opacity-40"
              >
                質問
              </button>
            </div>

            {/* セッション情報 */}
            <p className="text-[11px] text-muted/60">
              {session!.source === 'auto' ? '自動取得した字幕' : '手動入力テキスト'}を使用中
              （{session!.transcript.length.toLocaleString()}文字）
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}

function MessageBubble({ message, aiName }: { message: QAMessage; aiName: string }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
          isUser
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-surface border border-border text-foreground rounded-bl-sm'
        }`}
      >
        {!isUser && (
          <span className="block text-[10px] font-bold text-primary mb-0.5">
            {aiName}
          </span>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        {/* 参照した字幕断片 */}
        {!isUser && message.excerpts && message.excerpts.length > 0 && (
          <div className="mt-2 pt-1.5 border-t border-border/50">
            <p className="text-[10px] font-medium text-muted mb-1">参照した部分:</p>
            <ul className="space-y-0.5">
              {message.excerpts.map((excerpt, i) => (
                <li
                  key={i}
                  className="text-[11px] text-muted/80 leading-snug pl-2 border-l-2 border-primary/30"
                >
                  {excerpt}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}
