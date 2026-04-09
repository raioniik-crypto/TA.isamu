@AGENTS.md

# AI協働ルール

## 役割分担
- **Claude Code（実装担当）**: コードの設計・実装・修正・リファクタリングを担当
- **Codex（レビュー担当）**: コードレビュー・セキュリティチェック・バグ検出を担当。コードの直接編集は行わない

## ワークフロー
1. Claude Codeが実装する
2. キリのいいタイミングでcommit & push
3. CodexがGitHub経由でレビュー
4. Codexの指摘をClaude Codeに伝えて修正させる
5. 繰り返し

# 開発ガイドライン

## 検証コマンド
変更後は必ず以下を実行:
```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run build      # Next.js production build
```

## Gotchas (既知の落とし穴)

詳細は `progress.md` を参照。以下は要点のみ:

1. **Hydration**: browser-only 値 (`window.*`, `document.*`) を初回レンダリングに混ぜない。`hydrated` ガード必須。
2. **next/dynamic**: named export + `ssr: false` は Next.js 16 で壊れている。default export を使う。
3. **React 19 lint**: `useEffect(() => setState(...), [])` は `react-hooks/set-state-in-effect` に違反。`useSyncExternalStore` を使う。
4. **framer-motion**: `motionValue.set()` は即座。滑らかな移動は `animate()` 関数を使う。
5. **SSRF**: `redirect: 'follow'` はリダイレクト先が SSRF チェックをバイパスする。`redirect: 'manual'` + 手動追跡。
6. **AICharacter**: client-only overlay。`dynamic(ssr: false)` + `isClient` ガード + `canDrag = hydrated && isDesktop()` の三重防御。

## アーキテクチャ注意点
- Tailwind CSS v4: `tailwind.config.*` ではなく `globals.css` 内の `@theme` で設定
- Zustand stores: localStorage persist 使用。hydration mismatch を `useHydration()` で防御
- LLM: `LLM_PROVIDER` 環境変数で openai/anthropic/mock を切替
- セキュリティ: 全APIルートに `apiGuard()` 適用済み。`/api/debug-transcript` は本番で404
