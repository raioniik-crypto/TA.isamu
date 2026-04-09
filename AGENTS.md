<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI 協働ルール

詳細なガイドラインは `CLAUDE.md` を参照。以下は協働ワークフローの概要。

## 役割分担
- **Claude Code（実装担当）**: 調査・設計・実装・修正・リファクタリング・検証
- **Codex（レビュー担当）**: コードレビュー・セキュリティチェック・バグ検出（コードの直接編集は行わない）

## ワークフロー
1. Claude Code が実装する
2. キリのいいタイミングで commit & push
3. Codex が GitHub 経由でレビュー
4. Codex の指摘を Claude Code に伝えて修正させる
5. 繰り返し

## 検証コマンド（変更後は必ず実行）
```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run build      # Next.js production build
```

## 重要な注意点
- Gotchas（既知の落とし穴）は `CLAUDE.md` と `progress.md` に記録
- SSR/CSR 境界、Hydration、セキュリティに関する注意事項は `CLAUDE.md` を必読
