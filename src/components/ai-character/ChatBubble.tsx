'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ChatBubbleProps {
  message: string | null;
  visible: boolean;
}

/**
 * AIの短い吹き出し（全身キャラの頭上に表示）
 */
export function ChatBubble({ message, visible }: ChatBubbleProps) {
  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 8 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute bottom-[calc(100%+8px)] right-0 w-64 rounded-2xl rounded-br-md bg-surface p-4 text-sm border border-border"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <p className="text-foreground leading-relaxed">{message}</p>
          {/* 吹き出しの尻尾 */}
          <div className="absolute -bottom-[6px] right-5 h-3 w-3 rotate-45 bg-surface border-r border-b border-border" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
