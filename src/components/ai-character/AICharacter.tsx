'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterAvatar } from './CharacterAvatar';
import { ChatBubble } from './ChatBubble';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useSettingsStore } from '@/stores/settings-store';
import { useChatStore } from '@/stores/chat-store';

const GREETINGS = [
  'やあ！今日はなにを調べようか？',
  'こんにちは！一緒に学ぼう！',
  '何か気になることはある？',
  '今日も楽しく探検しよう！',
];

/**
 * 画面右下に常駐するAIキャラクター
 * クリックでチャットパネルを開閉
 */
export function AICharacter() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const aiName = useSettingsStore((s) => s.aiName);
  const isSending = useChatStore((s) => s.isSending);

  // 初回表示時にあいさつ吹き出し
  useEffect(() => {
    const timer = setTimeout(() => {
      const msg = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      setGreeting(msg);
    }, 1500);
    const hideTimer = setTimeout(() => setGreeting(null), 6000);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (isMinimized) {
    return (
      <motion.button
        className="fixed bottom-4 right-4 z-50 rounded-full bg-primary p-2 text-white shadow-lg"
        onClick={() => setIsMinimized(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={`${aiName}を表示`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </motion.button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* チャットパネル */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-20 right-0 w-[360px] sm:w-[400px]"
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

      {/* アバター */}
      <div className="flex items-end gap-2">
        <CharacterAvatar
          isThinking={isSending}
          onClick={() => {
            setIsOpen(!isOpen);
            setGreeting(null);
          }}
        />
      </div>
    </div>
  );
}
