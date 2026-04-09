'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterAvatar } from './CharacterAvatar';
import { ChatBubble } from './ChatBubble';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useSettingsStore } from '@/stores/settings-store';
import { useChatStore } from '@/stores/chat-store';
import { useViewerStore } from '@/stores/viewer-store';
import { useReactionStore } from '@/stores/reaction-store';
import { useHydration } from '@/stores/use-hydration';
import type { CharacterExpression } from '@/types';

function getCompanionSize(): number {
  if (typeof window === 'undefined') return 220;
  const w = window.innerWidth;
  if (w >= 1280) return 260;
  if (w >= 1024) return 240;
  if (w >= 768) return 220;
  return 180;
}

export function CompanionViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [charSize, setCharSize] = useState(220);

  const hydrated = useHydration();
  const aiName = useSettingsStore((s) => s.aiName);
  const isSending = useChatStore((s) => s.isSending);
  const isLoading = useViewerStore((s) => s.isLoading);
  const reaction = useReactionStore((s) => s.reaction);
  const displayName = hydrated ? aiName : 'アイモ';

  useEffect(() => {
    setCharSize(getCompanionSize()); // eslint-disable-line react-hooks/set-state-in-effect -- syncs with window dimensions
    const handleResize = () => setCharSize(getCompanionSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const expression: CharacterExpression = (() => {
    if (isSending || isLoading) return 'thinking';
    if (reaction) return reaction.expression;
    return 'neutral';
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-surface overflow-hidden"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex flex-col items-center py-6 px-4">
        {/* Chat panel (opens above the character) */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-[400px] mb-4"
            >
              <ChatPanel
                onClose={() => setIsOpen(false)}
                onMinimize={() => setIsOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Character with chat bubble */}
        <div className="relative" style={{ width: charSize }}>
          <ChatBubble
            message={reaction?.message ?? null}
            visible={!isOpen && !!reaction?.message}
          />

          <CharacterAvatar
            size={charSize}
            isThinking={isSending}
            expression={expression}
            onClick={() => setIsOpen(!isOpen)}
          />
        </div>

        {/* Label */}
        <p className="mt-2 text-[12px] text-muted font-medium">
          {displayName} も一緒に見てるよ
        </p>
      </div>
    </motion.div>
  );
}
