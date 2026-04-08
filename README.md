# TA.isamu - AI育成型ブラウジングパートナー

AIキャラクターと一緒にWebを探検し、共に学び、共に育つブラウザベースのプラットフォームです。

## 機能

- **AIキャラクター常駐UI**: 画面右下にAIキャラクターが常駐。クリックでチャットパネルを開閉
- **チャット機能**: AIと自由に会話。会話履歴を保持
- **ページ読解**: URLを入力してAIにページ内容を解析してもらう（要約・言い換え・注意点・別の視点）
- **AI育成**: 会話や利用に応じて5つのパラメータ（好奇心・共感・論理性・慎重さ・親密度）が変動
- **学習日記**: AIが学んだことを日記として記録
- **設定**: AI名変更、ダーク/ライトテーマ切替、データ削除

## セットアップ

```bash
# 依存パッケージのインストール
npm install

# 環境変数の設定（任意）
cp .env.example .env.local
# .env.local を編集してAPIキーを設定

# 開発サーバーの起動
npm run dev
```

http://localhost:3000 でアクセスできます。

### LLM設定

APIキーを設定しなくてもモックモードで動作します。

| 環境変数 | 説明 |
|---------|------|
| `LLM_PROVIDER` | `openai` / `anthropic` / `mock` |
| `OPENAI_API_KEY` | OpenAI APIキー |
| `OPENAI_MODEL` | 使用モデル（デフォルト: `gpt-4o-mini`） |
| `ANTHROPIC_API_KEY` | Anthropic APIキー |
| `ANTHROPIC_MODEL` | 使用モデル（デフォルト: `claude-haiku-4-5-20251001`） |

## 技術スタック

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** - アニメーション
- **Zustand** - 状態管理（localStorage永続化）

## ディレクトリ構成

```
src/
├── app/                  # Next.js App Router
│   ├── api/              # APIルート (chat, analyze, diary)
│   ├── diary/            # 日記ページ
│   ├── profile/          # AIプロフィールページ
│   ├── settings/         # 設定ページ
│   └── page.tsx          # ホーム
├── components/
│   ├── ai-character/     # AIキャラクターUI
│   ├── chat/             # チャットUI
│   ├── diary/            # 日記コンポーネント
│   ├── page-reader/      # ページ読解UI
│   ├── profile/          # レーダーチャート等
│   ├── settings/         # 設定フォーム
│   └── ui/               # 共通UI
├── lib/
│   ├── ai/               # LLM抽象レイヤー、プロンプト、性格ロジック
│   ├── diary/            # 日記生成
│   ├── growth/           # 育成エンジン
│   ├── page-reader/      # ページ本文抽出
│   └── storage/          # ストレージアダプタ
├── stores/               # Zustandストア
└── types/                # 型定義
```

## アーキテクチャの設計思想

- **疎結合**: UI / AI応答 / ページ解析 / 育成ロジック / 保存処理 を分離
- **LLM差し替え可能**: `lib/ai/llm-client.ts` のアダプタパターンで任意のLLMに切替
- **ストレージ差し替え可能**: `lib/storage/types.ts` のインターフェースに基づくアダプタ
- **ローカルファースト**: 認証不要。データはlocalStorageに保存

## 未実装事項 (TODO)

- [ ] Supabase連携（スキーマ設計済み、アダプタ実装のみ）
- [ ] ストリーミングレスポンス
- [ ] AIキャラクターの表情差分
- [ ] 初回オンボーディングフロー
- [ ] 今日の成長サマリー
- [ ] PWA対応
- [ ] ブラウザ拡張連携
- [ ] 音声入力/出力
- [ ] 複数AI育成
- [ ] 認証 (Supabase Auth)

## ライセンス

Private
