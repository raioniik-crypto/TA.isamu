/**
 * 成長パラメータ連動のリアクションメッセージ選択
 *
 * 各コンテキスト（挨拶、ページ閲覧、解析、チャット）に対して
 * ベースメッセージ + trait ボーナスメッセージのプールからランダム選択する。
 * trait が閾値を超えるとボーナスがプールに追加され、選出確率が自然に上がる。
 */

import type { GrowthParams, AnalysisType } from '@/types';

export type ReactionContext =
  | 'greeting'
  | 'page-article'
  | 'page-youtube'
  | `analysis-${AnalysisType}`
  | 'chat-happy'
  | 'chat-surprised';

// ── Base messages (existing behavior) ──────────────────────

const BASE: Record<ReactionContext, string[]> = {
  'greeting': [
    'やあ！今日はなにを調べようか？',
    'こんにちは！一緒に学ぼう！',
    '何か気になることはある？',
    '今日も楽しく探検しよう！',
  ],
  'page-article': ['どんな記事かな？', '一緒に読もう！', '気になるね！'],
  'page-youtube': ['動画だ！見てみよう！', '一緒に見よう！', 'どんな動画かな？'],
  'analysis-summary': ['なるほど！整理できたね', 'まとめてみたよ！', 'ポイントはここだね！'],
  'analysis-simplify': ['わかりやすくしたよ！', 'こう言い換えるとわかりやすいかも', 'シンプルにしてみた！'],
  'analysis-caution': ['ここは気をつけたほうがいいかも', 'ちょっと注意が必要かも...', 'うーん、慎重に見てみよう'],
  'analysis-perspective': ['別の見方もあるんだね！', '違う角度から見てみると...', 'こういう視点もあるよ！'],
  'chat-happy': ['うんうん！', 'いい話だね！', 'なんだかうれしいな'],
  'chat-surprised': ['おっ！', 'へぇ〜！', 'そうなんだ！'],
};

// ── Trait bonus messages ───────────────────────────────────
// One bonus per trait per context. Added to the pool when trait >= threshold.

const CURIOSITY_BONUS: Partial<Record<ReactionContext, string>> = {
  'greeting': '何か新しい発見があるといいな！',
  'page-article': 'どんな新しいことが書いてあるかな？',
  'page-youtube': 'どんな内容だろう、わくわく！',
  'analysis-summary': 'こうやって整理すると見えてくるね！',
  'analysis-simplify': 'もっとシンプルに考えてみよう！',
  'analysis-caution': 'こういう落とし穴もあるんだね',
  'analysis-perspective': '別の角度から見ると全然違うね！',
  'chat-happy': 'もっと教えて！',
  'chat-surprised': 'もっと詳しく知りたい！',
};

const EMPATHY_BONUS: Partial<Record<ReactionContext, string>> = {
  'greeting': 'きょうの気分はどう？',
  'page-article': 'この話、気になるね',
  'page-youtube': 'この動画、面白そう！',
  'analysis-summary': 'わかりやすくなったかな？',
  'analysis-simplify': 'これでスッキリしたかな？',
  'analysis-caution': '心配になっちゃうけど、大丈夫かな？',
  'analysis-perspective': 'いろんな考え方があるんだね',
  'chat-happy': 'その気持ち、わかるなぁ',
  'chat-surprised': 'そうだったんだ...',
};

const ATTACHMENT_BONUS: Partial<Record<ReactionContext, string>> = {
  'greeting': 'また会えてうれしいな！',
  'page-article': '一緒に読むの楽しいね！',
  'page-youtube': '一緒に見るの好きだな！',
  'analysis-summary': '一緒に勉強してる感じがするね！',
  'analysis-simplify': 'わかりやすく伝えたいな！',
  'analysis-caution': '気をつけようね、一緒に',
  'analysis-perspective': '一緒に考えると視野が広がるね！',
  'chat-happy': '話してくれてうれしいな',
  'chat-surprised': '教えてくれてありがとう！',
};

// ── Thresholds ─────────────────────────────────────────────
const CURIOSITY_THRESHOLD = 0.65;
const EMPATHY_THRESHOLD = 0.65;
const ATTACHMENT_THRESHOLD = 0.4; // starts at 0.1, so 0.4 already shows growth

// ── Public API ─────────────────────────────────────────────

/**
 * コンテキストと成長パラメータに基づいてリアクションメッセージを選択する。
 * trait が閾値を超えるとボーナスメッセージがプールに混ざり、
 * その trait らしいメッセージが出やすくなる。
 */
export function pickReactionMessage(
  context: ReactionContext,
  params: GrowthParams,
): string {
  const pool = [...(BASE[context] ?? [])];

  if (params.curiosity >= CURIOSITY_THRESHOLD) {
    const bonus = CURIOSITY_BONUS[context];
    if (bonus) pool.push(bonus);
  }
  if (params.empathy >= EMPATHY_THRESHOLD) {
    const bonus = EMPATHY_BONUS[context];
    if (bonus) pool.push(bonus);
  }
  if (params.attachment >= ATTACHMENT_THRESHOLD) {
    const bonus = ATTACHMENT_BONUS[context];
    if (bonus) pool.push(bonus);
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
