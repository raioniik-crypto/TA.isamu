'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ChatBubbleProps {
  message: string | null;
  visible: boolean;
}

/**
 * AIの短い吹き出し（キャラの横に表示）
 */
export function ChatBubble({ message, visible }: ChatBubbleProps) {
  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl rounded-br-sm bg-surface p-3 text-sm shadow-lg border border-border"
        >
          <p className="text-foreground leading-relaxed">{message}</p>
          {/* 吹き出しの尻尾 */}
          <div className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 bg-surface border-r border-b border-border" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
