import type {
  AIProfile,
  Conversation,
  LearningDiary,
  GrowthLog,
  AppSettings,
} from '@/types';
import type { StorageAdapter } from './types';

const KEYS = {
  AI_PROFILE: 'ta-isamu:ai-profile',
  CONVERSATIONS: 'ta-isamu:conversations',
  DIARIES: 'ta-isamu:diaries',
  GROWTH_LOGS: 'ta-isamu:growth-logs',
  SETTINGS: 'ta-isamu:settings',
} as const;

function getItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const localStorageAdapter: StorageAdapter = {
  // AI Profile
  async getAIProfile() {
    return getItem<AIProfile>(KEYS.AI_PROFILE);
  },
  async saveAIProfile(profile) {
    setItem(KEYS.AI_PROFILE, profile);
  },

  // Conversations
  async getConversations() {
    return getItem<Conversation[]>(KEYS.CONVERSATIONS) ?? [];
  },
  async getConversation(id) {
    const convs = await this.getConversations();
    return convs.find((c) => c.id === id) ?? null;
  },
  async saveConversation(conversation) {
    const convs = await this.getConversations();
    const idx = convs.findIndex((c) => c.id === conversation.id);
    if (idx >= 0) {
      convs[idx] = conversation;
    } else {
      convs.unshift(conversation);
    }
    setItem(KEYS.CONVERSATIONS, convs);
  },
  async deleteConversation(id) {
    const convs = await this.getConversations();
    setItem(
      KEYS.CONVERSATIONS,
      convs.filter((c) => c.id !== id),
    );
  },

  // Diaries
  async getDiaries() {
    return getItem<LearningDiary[]>(KEYS.DIARIES) ?? [];
  },
  async getDiary(id) {
    const diaries = await this.getDiaries();
    return diaries.find((d) => d.id === id) ?? null;
  },
  async saveDiary(diary) {
    const diaries = await this.getDiaries();
    diaries.unshift(diary);
    setItem(KEYS.DIARIES, diaries);
  },

  // Growth Logs
  async getGrowthLogs() {
    return getItem<GrowthLog[]>(KEYS.GROWTH_LOGS) ?? [];
  },
  async saveGrowthLog(log) {
    const logs = await this.getGrowthLogs();
    logs.unshift(log);
    // 直近100件に制限
    setItem(KEYS.GROWTH_LOGS, logs.slice(0, 100));
  },

  // Settings
  async getSettings() {
    return getItem<AppSettings>(KEYS.SETTINGS);
  },
  async saveSettings(settings) {
    setItem(KEYS.SETTINGS, settings);
  },

  // Clear all
  async clearAll() {
    if (typeof window === 'undefined') return;
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  },
};
