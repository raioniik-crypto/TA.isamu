'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { CharacterAvatar } from './CharacterAvatar';
import { ChatBubble } from './ChatBubble';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useSettingsStore } from '@/stores/settings-store';
import { useChatStore } from '@/stores/chat-store';
import { useHydration } from '@/stores/use-hydration';

const GREETINGS = [
  'やあ！今日はなにを調べようか？',
  'こんにちは！一緒に学ぼう！',
  '何か気になることはある？',
  '今日も楽しく探検しよう！',
];

/** レスポンシブサイズ */
function getCharacterSize(): number {
  if (typeof window === 'undefined') return 100;
  const w = window.innerWidth;
  if (w >= 1280) return 200;  // desktop: 大きく
  if (w >= 1024) return 160;  // laptop
  if (w >= 768) return 130;   // tablet
  return 90;                  // mobile: コンパクト
}

/** 安全領域内のランダム座標を返す */
function getRandomSafePosition(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 40, y: 40 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = getCharacterSize();
  const charH = size * 1.4;

  // 安全領域: ヘッダー(100px)避け + 左右余白 + 下部余白
  const minX = 20;
  const maxX = w - size - 20;
  const minY = 120;          // ヘッダー + BrowserBar を避ける
  const maxY = h - charH - 20;

  return {
    x: Math.max(minX, Math.min(maxX, minX + Math.random() * (maxX - minX))),
    y: Math.max(minY, Math.min(maxY, minY + Math.random() * (maxY - minY))),
  };
}

/** ホームポジション（右下） */
function getHomePosition(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 40, y: 40 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  const size = getCharacterSize();
  const charH = size * 1.4;
  return {
    x: w - size - 24,
    y: h - charH - 24,
  };
}

/** デスクトップかどうか */
function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 1024;
}

export function AICharacter() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [charSize, setCharSize] = useState(100);
  const [isDragging, setIsDragging] = useState(false);

  const hydrated = useHydration();
  const aiName = useSettingsStore((s) => s.aiName);
  const isSending = useChatStore((s) => s.isSending);
  const displayName = hydrated ? aiName : 'アイモ';

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const wanderTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isWandering = useRef(true);
  const initialized = useRef(false);

  // 初期化: サイズ設定 + ホームポジションへ配置
  useEffect(() => {
    const size = getCharacterSize();
    setCharSize(size);
    const home = getHomePosition();
    x.set(home.x);
    y.set(home.y);
    initialized.current = true;

    const handleResize = () => {
      setCharSize(getCharacterSize());
      if (!isDragging && isWandering.current) {
        const newHome = getHomePosition();
        x.set(newHome.x);
        y.set(newHome.y);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ゆっくり移動（デスクトップのみ、チャット非表示時のみ）
  const startWandering = useCallback(() => {
    if (wanderTimer.current) clearInterval(wanderTimer.current);
    if (!isDesktop()) return;

    wanderTimer.current = setInterval(() => {
      if (!isWandering.current) return;
      const target = getRandomSafePosition();
      // MotionValue に直接セットするとアニメーションなし
      // → animate で対応するため state 経由にしない
      // 代わりに小刻みに近づける
      const currentX = x.get();
      const currentY = y.get();
      const dx = target.x - currentX;
      const dy = target.y - currentY;
      // 1回の移動で全距離の30〜50%だけ動く（ゆっくり）
      const ratio = 0.3 + Math.random() * 0.2;
      x.set(currentX + dx * ratio);
      y.set(currentY + dy * ratio);
    }, 4000 + Math.random() * 3000);
  }, [x, y]);

  useEffect(() => {
    if (!hydrated || !initialized.current) return;

    if (isOpen || isMinimized) {
      // チャット開いている時は移動停止
      isWandering.current = false;
      if (wanderTimer.current) clearInterval(wanderTimer.current);
      // ホームポジションに戻る
      const home = getHomePosition();
      x.set(home.x);
      y.set(home.y);
    } else {
      isWandering.current = true;
      startWandering();
    }

    return () => {
      if (wanderTimer.current) clearInterval(wanderTimer.current);
    };
  }, [hydrated, isOpen, isMinimized, startWandering, x, y]);

  // あいさつ吹き出し
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      const msg = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      setGreeting(msg);
    }, 1500);
    const hideTimer = setTimeout(() => setGreeting(null), 6000);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [hydrated]);

  if (isMinimized) {
    return (
      <motion.button
        className="fixed bottom-5 right-5 z-50 rounded-full bg-primary p-3 text-white"
        style={{ boxShadow: 'var(--shadow-lg)' }}
        onClick={() => setIsMinimized(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={`${displayName}を表示`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </motion.button>
    );
  }

  const charH = Math.round(charSize * 1.4);

  return (
    <motion.div
      className="fixed z-50"
      style={{
        x,
        y,
        width: charSize,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      drag={isDesktop()}
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={() => {
        setIsDragging(true);
        isWandering.current = false;
        if (wanderTimer.current) clearInterval(wanderTimer.current);
      }}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        // ドラッグ後の位置を保持（MotionValueはdrag中に自動更新される）
        // 5秒後に移動再開
        setTimeout(() => {
          if (!isOpen && !isMinimized) {
            isWandering.current = true;
            startWandering();
          }
        }, 5000);
      }}
      transition={{ type: 'tween', duration: 2, ease: 'easeInOut' }}
    >
      {/* チャットパネル */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-0 w-[calc(100vw-2.5rem)] max-w-[400px]"
            style={{ bottom: charH + 16 }}
          >
            <ChatPanel
              onClose={() => setIsOpen(false)}
              onMinimize={() => {
                setIsOpen(false);
                setIsMinimized(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 吹き出し */}
      <ChatBubble message={greeting} visible={!isOpen && !!greeting} />

      {/* キャラクター */}
      <CharacterAvatar
        size={charSize}
        isThinking={isSending}
        onClick={() => {
          if (isDragging) return; // ドラッグ終了直後のクリックを防ぐ
          setIsOpen(!isOpen);
          setGreeting(null);
        }}
      />
    </motion.div>
  );
}
