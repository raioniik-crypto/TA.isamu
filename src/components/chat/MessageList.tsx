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
      <div className="flex flex-1 items-center justify-center p-6 text-center text-muted">
        <div>
          <p className="text-2xl mb-2">👋</p>
          <p className="text-sm">
            {aiName}に話しかけてみよう！
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((msg, i) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i === messages.length - 1 ? 0.1 : 0 }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-chat-user text-foreground rounded-br-sm'
                : 'bg-chat-ai text-foreground rounded-bl-sm'
            }`}
          >
            {msg.role === 'assistant' && (
              <span className="mb-1 block text-xs font-medium text-primary">
                {aiName}
              </span>
            )}
            <p className="whitespace-pre-wrap">{msg.content}</p>
            <span className="mt-1 block text-right text-[10px] text-muted">
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
