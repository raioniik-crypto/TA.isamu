import type {
  AIProfile,
  Conversation,
  LearningDiary,
  GrowthLog,
  AppSettings,
} from '@/types';

/**
 * ストレージアダプタのインターフェース
 * localStorage / Supabase どちらでも差し替え可能
 */
export interface StorageAdapter {
  // AI Profile
  getAIProfile(): Promise<AIProfile | null>;
  saveAIProfile(profile: AIProfile): Promise<void>;

  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  saveConversation(conversation: Conversation): Promise<void>;
  deleteConversation(id: string): Promise<void>;

  // Learning Diaries
  getDiaries(): Promise<LearningDiary[]>;
  getDiary(id: string): Promise<LearningDiary | null>;
  saveDiary(diary: LearningDiary): Promise<void>;

  // Growth Logs
  getGrowthLogs(): Promise<GrowthLog[]>;
  saveGrowthLog(log: GrowthLog): Promise<void>;

  // Settings
  getSettings(): Promise<AppSettings | null>;
  saveSettings(settings: AppSettings): Promise<void>;

  // Data management
  clearAll(): Promise<void>;
}
