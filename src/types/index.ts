// ============================================================
// Core domain types for TA.isamu - AI育成型ブラウジングプラットフォーム
// ============================================================

/** 育成パラメータ（0.0〜1.0） */
export interface GrowthParams {
  curiosity: number;   // 好奇心
  empathy: number;     // 共感
  logic: number;       // 論理性
  caution: number;     // 慎重さ
  attachment: number;  // 親密度
}

export const DEFAULT_GROWTH_PARAMS: GrowthParams = {
  curiosity: 0.5,
  empathy: 0.5,
  logic: 0.5,
  caution: 0.5,
  attachment: 0.1,
};

/** 育成パラメータの変動差分 */
export type GrowthDelta = Partial<GrowthParams>;

/** AIプロフィール */
export interface AIProfile {
  id: string;
  name: string;
  params: GrowthParams;
  totalInteractions: number;
  createdAt: string;
  updatedAt: string;
}

/** メッセージ */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    growthDelta?: GrowthDelta;
    analysisType?: AnalysisType;
  };
  createdAt: string;
}

/** 会話セッション */
export interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
  createdAt: string;
}

/** ページ解析の種類 */
export type AnalysisType = 'summary' | 'simplify' | 'caution' | 'perspective';

export const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  summary: '要約',
  simplify: '言い換え',
  caution: '注意点',
  perspective: '別の視点',
};

/** ページ解析リクエスト */
export interface AnalyzeRequest {
  url: string;
  content: string;
  type: AnalysisType;
}

/** 学習日記 */
export interface LearningDiary {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  mood: string;
  createdAt: string;
}

/** 育成ログ */
export interface GrowthLog {
  id: string;
  triggerType: 'chat' | 'page_read' | 'diary';
  changes: GrowthDelta;
  createdAt: string;
}

/** アプリ設定 */
export interface AppSettings {
  aiName: string;
  theme: 'light' | 'dark';
  privacyAcknowledged: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  aiName: 'イサム',
  theme: 'light',
  privacyAcknowledged: false,
};

/** LLMプロバイダー */
export type LLMProvider = 'openai' | 'anthropic' | 'mock';

/** LLMリクエスト */
export interface LLMRequest {
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

/** LLMレスポンス */
export interface LLMResponse {
  content: string;
  usage?: { promptTokens: number; completionTokens: number };
}

/** 性格傾向の表現 */
export interface PersonalityExpression {
  trait: string;        // 例: "探究者タイプ"
  description: string;  // 例: "好奇心が強く、新しい話題に目を輝かせます"
  tone: string;         // プロンプトに含める口調指示
}
