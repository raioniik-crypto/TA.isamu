'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className="border-t border-border bg-surface px-3 py-3">
      <div className="flex items-end gap-2 rounded-xl bg-background border border-border px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[13.5px] text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50 leading-relaxed"
          style={{ maxHeight: '80px' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !hasContent}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
            hasContent && !disabled
              ? 'bg-primary text-white shadow-sm hover:bg-primary-dark active:scale-95'
              : 'bg-transparent text-muted'
          }`}
          aria-label="送信"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
