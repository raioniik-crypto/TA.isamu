'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import { useAIProfileStore } from '@/stores/ai-profile-store';
import { useChatStore } from '@/stores/chat-store';
import { useDiaryStore } from '@/stores/diary-store';

export function SettingsForm() {
  const settings = useSettingsStore();
  const aiProfileStore = useAIProfileStore();
  const chatStore = useChatStore();
  const diaryStore = useDiaryStore();

  const [name, setName] = useState(settings.aiName);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (trimmed) {
      settings.update({ aiName: trimmed });
      aiProfileStore.setName(trimmed);
    }
  };

  const handleThemeToggle = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    settings.update({ theme: newTheme });
  };

  const handleDeleteAll = () => {
    aiProfileStore.reset();
    chatStore.clearAll();
    diaryStore.clearAll();
    settings.reset();
    setName('アイモ');
    setShowDeleteConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* AI名変更 */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          AI の名前
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleSaveName}
            disabled={!name.trim() || name.trim() === settings.aiName}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </section>

      {/* テーマ切替 */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          テーマ
        </h3>
        <button
          onClick={handleThemeToggle}
          className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm transition-colors hover:bg-surface-hover w-full"
        >
          <span className="text-lg">
            {settings.theme === 'light' ? '🌙' : '☀️'}
          </span>
          <span className="text-foreground">
            {settings.theme === 'light'
              ? 'ダークモードに切替'
              : 'ライトモードに切替'}
          </span>
        </button>
      </section>

      {/* キャラクター移動モード */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          キャラクターの動き
        </h3>
        <button
          onClick={() => settings.update({ wanderMode: !settings.wanderMode })}
          className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm transition-colors hover:bg-surface-hover w-full"
        >
          <span className="text-lg">
            {settings.wanderMode ? '🚶' : '📌'}
          </span>
          <div className="text-left">
            <span className="text-foreground block">
              {settings.wanderMode ? '歩き回りモード' : '固定モード'}
            </span>
            <span className="text-[12px] text-muted leading-snug">
              {settings.wanderMode
                ? 'キャラクターが画面内を歩き回ります'
                : 'キャラクターは右下に固定されます'}
            </span>
          </div>
        </button>
      </section>

      {/* プライバシー */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          プライバシーについて
        </h3>
        <div className="text-[13px] text-muted space-y-2 leading-relaxed">
          <p>
            Aimo は、あなたのデータをブラウザ内（localStorage）に保存します。
            サーバーにデータが送信されることはありません（チャットAPIへの送信を除く）。
          </p>
          <p>
            「このページを見て」機能を使う場合のみ、指定されたURLの内容を
            サーバー経由で取得します。これはユーザーの明示的な操作時のみ実行されます。
          </p>
          <p>
            すべてのデータはいつでも削除できます。
          </p>
        </div>
      </section>

      {/* データ削除 */}
      <section className="rounded-2xl border border-error/20 bg-surface p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-error">
          データの削除
        </h3>
        <p className="mb-3 text-[13px] text-muted">
          すべての会話履歴、日記、AI育成データが削除されます。この操作は取り消せません。
        </p>
        {showDeleteConfirm ? (
          <div className="flex gap-2">
            <button
              onClick={handleDeleteAll}
              className="rounded-xl bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/80"
            >
              本当に削除する
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:bg-surface-hover"
            >
              キャンセル
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-xl border border-error/30 px-4 py-2 text-sm text-error transition-colors hover:bg-error/10"
          >
            すべてのデータを削除
          </button>
        )}
      </section>
    </div>
  );
}
