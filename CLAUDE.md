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
