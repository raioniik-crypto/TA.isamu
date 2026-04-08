'use client';

import { create } from 'zustand';

/** Q&Aメッセージ */
export interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** AI回答時に参照した字幕断片 */
  excerpts?: string[];
  createdAt: string;
}

/** 視聴セッション状態 */
interface WatchingSession {
  videoId: string;
  /** 解析に使うテキスト（自動字幕 or 手動貼り付け） */
  transcript: string;
  /** テキストの出所 */
  source: 'auto' | 'manual';
  /** Q&A会話履歴 */
  messages: QAMessage[];
}

interface WatchingState {
  session: WatchingSession | null;

  /** 視聴セッションを開始する（動画が表示されたとき） */
  startSession: (videoId: string, transcript: string, source: 'auto' | 'manual') => void;

  /** 手動テキストでセッションを更新する（貼り付け時） */
  updateTranscript: (transcript: string, source: 'auto' | 'manual') => void;

  /** Q&Aメッセージを追加する */
  addMessage: (message: QAMessage) => void;

  /** セッションをクリアする */
  clearSession: () => void;
}

export const useWatchingStore = create<WatchingState>()((set) => ({
  session: null,

  startSession: (videoId, transcript, source) =>
    set({
      session: { videoId, transcript, source, messages: [] },
    }),

  updateTranscript: (transcript, source) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: { ...state.session, transcript, source },
      };
    }),

  addMessage: (message) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          messages: [...state.session.messages, message],
        },
      };
    }),

  clearSession: () => set({ session: null }),
}));
