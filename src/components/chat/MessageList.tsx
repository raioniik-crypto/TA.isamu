'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Message } from '@/types';
import { useSettingsStore } from '@/stores/settings-store';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiName = useSettingsStore((s) => s.aiName);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-10 text-center">
        <div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/5">
            <span className="text-3xl">👋</span>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {aiName}に話しかけてみよう
          </p>
          <p className="text-xs text-muted leading-relaxed">
            なんでも気軽に聞いてね
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg, i) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i === messages.length - 1 ? 0.1 : 0, duration: 0.2 }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === 'assistant' && (
            <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary text-[10px] font-bold text-white">
              {aiName.charAt(0)}
            </div>
          )}

          <div
            className={`max-w-[78%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-primary text-white rounded-br-md'
                : 'bg-chat-ai text-foreground rounded-bl-md border border-[var(--chat-ai-border)]'
            }`}
          >
            {msg.role === 'assistant' && (
              <span className="mb-0.5 block text-[11px] font-semibold text-primary">
                {aiName}
              </span>
            )}
            <p className="whitespace-pre-wrap text-[13.5px] leading-[1.65]">{msg.content}</p>
            <span className={`mt-1.5 block text-right text-[10px] ${
              msg.role === 'user' ? 'text-white/60' : 'text-muted'
            }`}>
              {new Date(msg.createdAt).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </motion.div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
