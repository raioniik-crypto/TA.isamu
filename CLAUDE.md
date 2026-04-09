@AGENTS.md

# いさむ株式会社 — Claude Code 運用規約

## 役割分担
- **Claude Code（実装担当）**: 調査・設計・実装・修正・リファクタリング・検証
- **Codex（レビュー担当）**: コードレビュー・セキュリティチェック・バグ検出（コード直接編集なし）

## 技術スタック
- Next.js 16 (App Router) / TypeScript strict mode
- Tailwind CSS v4（`globals.css`内の`@theme`で設定。`tailwind.config.*`は使わない）
- Framer Motion / Zustand（localStorage persist + `useHydration()`）
- uuid / styled-jsx
- LLM: openai / anthropic / mock（`LLM_PROVIDER`環境変数で切替）

## コマンド
- `npm run dev` — 開発サーバー
- `npm run build` — プロダクションビルド
- `npm run lint` — ESLint
- `npm run typecheck` — tsc --noEmit
- 変更後は必ず3点セット: `npm run lint && npm run typecheck && npm run build`

## ディレクトリ規約
- `src/app/` — ルート + APIルート
- `src/components/` — UIコンポーネント（機能別サブフォルダ）
- `src/lib/` — UIに依存しないロジック
- `src/stores/` — Zustand + hydrationフック
- `src/types/` — 共通型定義（`.ts`統一、`.d.ts`禁止）

## ワークフロー（必ず従うこと）
1. **探索**: コードベースを読んで現状把握
2. **計画**: 変更内容を箇条書きで提示し確認を得る
3. **実装**: 小さな単位で変更。1ファイルずつ
4. **検証**: lint && typecheck && build

## Gotchas（違反厳禁）
1. **Hydration**: browser-only値を初回レンダリングに混ぜない。`hydrated`ガード必須
2. **next/dynamic**: named export + ssr:false はNext.js 16で壊れている。default exportを使う
3. **React 19 lint**: useEffect内のsetStateは違反。useSyncExternalStoreを使う
4. **framer-motion**: motionValue.set()は即座。animate()で滑らかに
5. **SSRF**: redirect:'follow'禁止。redirect:'manual' + 手動追跡
6. **AICharacter**: dynamic(ssr:false) + isClient + canDrag=hydrated&&isDesktop() の三重防御
7. **Tailwind v4**: tailwind.config不使用。globals.css内@themeで設定
8. **Zustand persist**: useHydration()でmismatch防御

## やってはいけないこと
- 既存ファイル未確認で新規作成
- テストなしで複雑ロジック実装
- 1回で5ファイル以上同時編集
- 依存関係を勝手に追加（確認必須）
- .env.localの内容をログに含める
- apiGuard()を外す
- console.logをPRに残す

## セキュリティ
- 全APIルートにapiGuard()適用済み
- /api/debug-transcriptは本番404
- SSRF防御: isBlockedUrl() + 手動リダイレクト（最大5ホップ）
