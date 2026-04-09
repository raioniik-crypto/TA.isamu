@AGENTS.md

# Aimo — AI育成型ブラウジングプラットフォーム

## プロジェクト概要

ユーザーが Web を閲覧する横で AI キャラ「フィル」が一緒に学び、成長する体験を提供する。
Next.js 16 App Router / React 19 / Tailwind CSS v4 / Zustand v5 / Framer Motion v12。

## 検証コマンド

変更後は **必ず** 以下を実行:

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run build      # Next.js production build
```

## AI 協働ルール

### 役割分担
| ロール | 担当 |
|--------|------|
| **Claude Code** | 調査・設計・実装・修正・リファクタリング・検証 |
| **Codex** | コードレビュー・セキュリティチェック・バグ検出（コード直接編集は行わない） |

### ワークフロー
1. Claude Code が実装する
2. キリのいいタイミングで commit & push
3. Codex が GitHub 経由でレビュー
4. Codex の指摘を Claude Code に伝えて修正させる
5. 繰り返し

## アーキテクチャ

### ディレクトリ構造
```
src/
├── app/              # Next.js App Router (page.tsx, layout.tsx, api/)
├── components/
│   ├── ai-character/ # AICharacter, CharacterAvatar, CompanionViewer, ChatBubble
│   ├── browser/      # BrowserBar, BrowserHome
│   ├── chat/         # ChatPanel, ChatInput, MessageList
│   ├── page-reader/  # AnalysisResult
│   ├── ui/           # Header, ThemeProvider
│   └── viewer/       # ContentViewer, VideoQA, ViewerAnalysis
├── lib/
│   ├── ai/           # LLM プロバイダ, プロンプト, パーソナリティ
│   ├── security/     # SSRF 防御, API ガード, レートリミット
│   ├── youtube/      # 字幕取得
│   ├── reaction-messages.ts  # 性格連動リアクション文言
│   └── use-sprite-animation.ts  # スプライトアニメーション hook
├── stores/           # Zustand stores (chat, viewer, ai-profile, reaction, sprite 等)
└── types/            # 型定義 (index.ts, sprite.ts)
```

### 主要パターン

| パターン | 説明 |
|----------|------|
| Hydration ガード | `useHydration()` / `useSyncExternalStore` で SSR/CSR 境界を防御 |
| next/dynamic | `ssr: false` は **default export** 必須（Next.js 16 バグ） |
| テーマ | Tailwind v4: `globals.css` 内の `@theme` で設定（`tailwind.config.*` 不使用） |
| LLM 切替 | `LLM_PROVIDER` 環境変数で openai / anthropic / mock を切替 |
| セキュリティ | 全 API ルートに `apiGuard()` 適用。SSRF は `redirect: 'manual'` + 手動追跡 |
| リアクション | `reaction-store`（ephemeral）→ キャラ表情 + 吹き出し。4 秒 auto-clear |
| スプライト | `sprite-store` + `useSpriteAnimation()` (rAF)。素材待ち、コード基盤のみ |

### YouTube 視聴モード
YouTube コンテンツ表示時は専用レイアウト:
- `VideoQA` / `ViewerAnalysis` を非表示
- `CompanionViewer` で動画下にキャラ埋め込み（一緒に視聴する体験）
- 浮遊 `AICharacter` は自動非表示（重複回避）

## Gotchas（既知の落とし穴）

詳細は `progress.md` を参照。要点:

1. **Hydration**: browser-only 値 (`window.*`) を初回レンダリングに混ぜない。`hydrated` ガード必須
2. **next/dynamic**: named export + `ssr: false` は Next.js 16 で壊れている。default export を使う
3. **React 19 lint**: `useEffect(() => setState(...), [])` は `react-hooks/set-state-in-effect` 違反。`useSyncExternalStore` を使う
4. **framer-motion**: `motionValue.set()` は即座。滑らかな移動は `animate()` 関数を使う
5. **SSRF**: `redirect: 'follow'` はリダイレクト先が検証をバイパスする。`redirect: 'manual'` + 手動追跡
6. **AICharacter**: client-only。`dynamic(ssr: false)` + `isClient` ガード + `canDrag = hydrated` の防御
7. **IPv6 SSRF**: `::ffff:` mapped は dotted と hex-hextet の両形式を検証。`parseInt` 部分解釈を正規表現でガード
8. **スプライト状態優先度**: `surprised > walk > sit > blink > idle`。複数状態の同時 activate に対応

## セキュリティ方針

- 全 API ルートに `apiGuard()` (CSRF + レートリミット)
- `/api/debug-transcript` は本番で 404
- SSRF: IPv4 プライベート、IPv6 loopback/ULA/link-local/mapped をブロック
- `extractMappedIPv4()`: hex-hextet に `^[0-9a-f]{1,4}$` 正規表現ガード
- リダイレクト: 各ホップで `isBlockedUrl()` 再検証、最大 5 ホップ
