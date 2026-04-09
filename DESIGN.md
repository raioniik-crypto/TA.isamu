# DESIGN: UX改善パッケージ

SPEC.md に基づく詳細設計。CLAUDE.md の Gotchas を確認済み。

---

## 1. 影響範囲

### 変更ファイル一覧

| # | ファイル | 変更種別 | Release |
|---|---------|---------|---------|
| 1 | `src/lib/page-reader/extractor.ts` | 修正 | R2 |
| 2 | `src/components/page-reader/AnalysisResult.tsx` | 修正 | R2 |
| 3 | `src/components/browser/BrowserHome.tsx` | 修正 | R3 |
| 4 | `src/lib/ai/personality.ts` | 修正 | R1 |
| 5 | `src/components/chat/CompactChat.tsx` | **新規** | R1 |
| 6 | `src/components/ai-character/AICharacter.tsx` | 修正 | R1 |
| 7 | `src/components/ai-character/CompanionViewer.tsx` | 修正 | R1 |

### 変更しないファイル（互換性維持）

- `src/components/chat/ChatPanel.tsx` — 残すが、AICharacter/CompanionViewerからの参照を CompactChat に切り替え
- `src/components/chat/ChatInput.tsx` — CompactChat 内で再利用
- `src/components/chat/MessageList.tsx` — CompactChat の展開モードで再利用
- `src/stores/chat-store.ts` — 変更なし。既存の会話・メッセージ管理をそのまま利用
- `src/stores/reaction-store.ts` — 変更なし
- API ルート (`/api/chat`, `/api/analyze` 等) — 変更なし。`buildSystemPrompt()` のシグネチャは据え置き

---

## 2. コンポーネント設計

### Step 1-2: extractor.ts の変更（R2）

新規関数・変更関数のみ記述。

#### `isWikipediaUrl(url: string): boolean`（新規・モジュール内 private）

```
入力: URL文字列
判定: hostname が ja.wikipedia.org, en.wikipedia.org, *.m.wikipedia.org 等にマッチ
出力: boolean
```

#### `stripWikipediaElements(html: string): string`（新規・モジュール内 private）

```
入力: Wikipedia ページの HTML（article/main 内 or 全体）
除去対象:
  - id="toc" または class="toc"（目次）
  - id="p-lang", class="interlanguage-links"（言語リンク）
  - class="reflist", class="references"（脚注一覧）
  - id="catlinks"（カテゴリ）
  - class="mw-editsection"（編集リンク）
  - class="navbox", class="sisternav"（ナビボックス）
  - class="infobox"（情報ボックス — 検討の余地あるが本文ノイズ大）
  - class="noprint"（印刷非表示 = UI要素）
出力: クリーニング済み HTML
注: 正規表現ベース。class は部分一致で判定（class="..." に含まれるか）
```

#### `extractSemanticContent(html: string): string | null`（変更）

```
現状: <article> → <main> → role="main" の順で探索
変更: Wikipedia の場合は #mw-content-text を最優先で探索
  - <div id="mw-content-text"...>...</div> にマッチすればそれを返す
  - これにより article タグ内の非本文要素（目次等）を含む範囲ではなく、
    実際の本文コンテナを取得できる
判定: extractSemanticContent に url パラメータを追加（string | undefined）
  シグネチャ: extractSemanticContent(html: string, url?: string): string | null
```

#### `htmlToText(html: string, url?: string): string`（変更）

```
現状: セマンティック抽出 → 不要タグ除去 → nav/aside/footer 除去（非セマンティック時のみ）
変更:
  1. url が Wikipedia なら stripWikipediaElements を先に適用
  2. extractSemanticContent に url を渡す
  3. nav/aside/footer 除去をセマンティック有無に関わらず常時実行
     ← SPEC の「全サイト共通でも積極的に除去」に対応
```

**呼び出し元への影響**: `htmlToText` は `extractPage` 内でのみ呼ばれる。`extractPage` は url を持っているので渡すだけ。外部 API 変更なし。

### Step 3: AnalysisResult.tsx の変更（R2）

```
変更箇所: line 58 のみ
現状: text-[15px] leading-[1.8]
変更: text-[15px] leading-[1.6]
```

1行の CSS クラス変更。コンポーネント props・責務に変更なし。

### Step 4: BrowserHome.tsx の変更（R3）

```
変更箇所: SAMPLE_URLS 定数配列（lines 11-36）
変更内容: 5〜6個の実用的サイトに入れ替え
候補（ジャンルバランス重視）:
  { label: 'Wikipedia', url: 'https://ja.wikipedia.org/', icon: '📚', action: '調べものをする' }
  { label: 'NHK NEWS WEB', url: 'https://www3.nhk.or.jp/news/', icon: '📰', action: '最新ニュースを読む' }
  { label: 'Yahoo!ニュース', url: 'https://news.yahoo.co.jp/', icon: '📡', action: 'ニュースを探す' }
  { label: 'YouTube', url: 'https://www.youtube.com/', icon: '🎬', action: '動画を一緒に見る' }
  { label: 'Qiita', url: 'https://qiita.com/', icon: '💻', action: '技術記事を読む' }
  { label: 'GitHub', url: 'https://github.com/trending', icon: '🐙', action: 'トレンドを見る' }
グリッド: 現状の grid-cols-2 sm:grid-cols-4 → sm:grid-cols-3 に変更（6個÷3=2行）
```

### Step 5: personality.ts の変更（R1）

#### `getAttachmentTone(attachment: number): string`（変更）

```
現状の4段階を SPEC の口調指示に合わせて調整:

< 0.2: "丁寧で優しい敬語。「〜ですね」「〜ですよ」のような柔らかい丁寧語を使う。
        堅すぎず、温かみのある話し方。"
0.2-0.5: "少し砕けた敬語。「〜だね」「〜かもしれないね」が時々混ざる。
           基本は丁寧だが、親しみが出てきた雰囲気。"
0.5-0.8: "自然なタメ口寄り。「〜だよ」「〜だね」が中心。
           ただし上品さと落ち着きは維持。粗雑にはならない。"
≥ 0.8: "温かく親密な口調。自然体のタメ口だが崩しすぎない。
         時々名前で呼びかける。大切な相手に話すような優しさ。"
```

#### `buildSystemPrompt()` — シグネチャ変更なし

プロンプトの `## ルール` セクションに以下を追加:
```
- 返答は1〜3文程度にしてください（短すぎず長すぎず）
- 上品で落ち着いた雰囲気を保ってください
```

現在の「2〜4文程度」を「1〜3文程度」に短縮（吹き出し表示に合わせてコンパクト化）。

### Step 6: CompactChat.tsx（R1・新規）

#### 責務

キャラクターの近くに表示するコンパクトなチャット UI。
- **折りたたみ状態（デフォルト）**: 最新1〜3件のメッセージを吹き出し風に表示 + 入力欄
- **展開状態**: 過去の会話履歴をスクロール表示

#### Props 型

```typescript
interface CompactChatProps {
  /** 展開状態か否か */
  expanded: boolean;
  /** 展開/折りたたみのトグル */
  onToggleExpand: () => void;
  /** 完全に閉じる（AICharacter のみ使用） */
  onClose?: () => void;
}
```

#### 内部構造

```
CompactChat
├── [展開時] MessageList（既存コンポーネント再利用、max-height 制限付き）
├── [折りたたみ時] RecentMessages（最新1〜3件を吹き出し風表示）
│   └── 各メッセージ: 小さい吹き出しスタイル（max-w-[260px]）
│   └── 「もっと見る」ボタン → onToggleExpand
├── CompactInput（ChatInput を縮小版で再利用、または軽量な独自入力）
└── [展開時] 閉じるボタン → onToggleExpand
```

#### レイアウト方針

- 幅: `w-[280px] sm:w-[320px]`（既存 ChatPanel の 400px より狭い）
- 折りたたみ時の高さ: auto（メッセージ数で自然に決まる、最大 200px）
- 展開時の高さ: `max-h-[400px]`（内部スクロール）
- 背景: `bg-surface` + `border border-border` + `rounded-2xl`
- 吹き出しの尻尾: キャラクター方向に向ける（CSS triangle）

#### 送信ロジック

`CompactChat` 自身は送信ロジックを持たない。
`ChatPanel.tsx` の `handleSend` コールバックパターンを踏襲し、
親コンポーネント（AICharacter/CompanionViewer）から `onSend` を受け取る。

**修正**: 既存の `ChatPanel` が `handleSend` をカプセル化しているため、
CompactChat も同様に **内部で chat-store + API 呼び出しを行う**。
これは ChatPanel と同じパターン（stores を直接 subscribe）。

#### Gotchas チェック

- Hydration: `CompactChat` は `'use client'` コンポーネント。`window.*` は不使用（サイズは親が管理）。問題なし
- Tailwind v4: 直接クラス指定のみ使用。`@theme` 変更なし
- Framer Motion: `AnimatePresence` + `motion.div` で入退場アニメーション

### Step 7: AICharacter.tsx の変更（R1）

```
変更箇所:
  1. ChatPanel の import を CompactChat に変更
  2. isOpen 時のレンダリング: ChatPanel → CompactChat
  3. CompactChat の expanded 状態を useState で管理
  4. ChatBubble は CompactChat が折りたたみ時かつ会話なし時のみ表示
     （CompactChat が表示されている時は ChatBubble は非表示）

配置:
  - 現在: ChatPanel が absolute で charH + 16 の位置
  - 変更: CompactChat を同じ absolute 配置だが幅を狭く
  - CompactChat の bottom 位置: charH + 12（キャラとの距離を少し詰める）

状態遷移:
  キャラクリック → isOpen=true (CompactChat 折りたたみ表示)
  「もっと見る」 → expanded=true (CompactChat 展開)
  閉じる       → isOpen=false, expanded=false
```

### Step 8: CompanionViewer.tsx の変更（R1）

```
変更箇所:
  1. ChatPanel の import を CompactChat に変更
  2. isOpen 時のレンダリング: ChatPanel → CompactChat
  3. expanded 状態の管理を追加
  4. CompactChat をキャラの横に配置（YouTube視聴モードではスペースあり）

配置:
  - 現在: ChatPanel がキャラの上に表示（w-full max-w-[400px]）
  - 変更: CompactChat をキャラの横に配置（横並び flex）
  - モバイル: キャラの下に配置（flex-col）

レイアウト変更:
  現在: flex-col items-center
  変更: flex flex-col sm:flex-row items-center sm:items-end gap-4
  CompactChat は sm 以上でキャラの右側に表示
```

---

## 3. データフロー

### Zustand ストア変更

**変更なし。** 既存の `chat-store` をそのまま使用。

- `getCurrentConversation()` → 最新会話の messages を取得
- `addMessage()` → ユーザー/AI メッセージ追加
- `isSending` → 送信中フラグ

CompactChat の展開/折りたたみ状態は **ローカル useState** で管理（persist 不要、SPEC 準拠）。

### API ルート変更

**変更なし。** `/api/chat` のリクエスト/レスポンス形式は据え置き。

### LLM プロンプト変更

`buildSystemPrompt()` 内の2箇所:
1. `getAttachmentTone()` の返却文字列を4段階すべて更新（Step 5 参照）
2. ルールセクションの返答長指示を「2〜4文」→「1〜3文」に短縮
3. 上品さ維持の指示を追加

**シグネチャ変更なし** → API ルート側の追従不要。

---

## 4. 実装ステップ

### Step 1: Wikipedia 特別処理 + 全サイト共通除去強化

**対象**: `src/lib/page-reader/extractor.ts`（1ファイル）

1. `isWikipediaUrl()` 関数を追加（hostname 判定）
2. `stripWikipediaElements()` 関数を追加（id/class ベースの HTML 要素除去）
3. `extractSemanticContent()` に `url?` パラメータ追加。Wikipedia 時は `#mw-content-text` を最優先
4. `htmlToText()` に `url?` パラメータ追加:
   - Wikipedia の場合は `stripWikipediaElements` を最初に適用
   - nav/aside/footer 除去を**常時実行**に変更（L175-180 の `if (!semanticContent)` ガード撤廃）
5. 内部呼び出し元 (`extractPage`) で url を渡す

**検証**: lint && typecheck && build

### Step 2: 要約テキスト行間 + ホーム画面URL更新

**対象**: `src/components/page-reader/AnalysisResult.tsx`, `src/components/browser/BrowserHome.tsx`（2ファイル）

1. AnalysisResult.tsx L58: `leading-[1.8]` → `leading-[1.6]`
2. BrowserHome.tsx: `SAMPLE_URLS` 配列を6サイトに更新
3. BrowserHome.tsx: グリッドを `sm:grid-cols-3` に変更（6個に合わせる）

**検証**: lint && typecheck && build

### Step 3: 口調プロンプト調整

**対象**: `src/lib/ai/personality.ts`（1ファイル）

1. `getAttachmentTone()` の4段階の返却文字列を更新
2. `buildSystemPrompt()` のルールセクション: 返答長「1〜3文」+ 上品さ維持指示追加

**検証**: lint && typecheck && build

### Step 4: CompactChat コンポーネント作成

**対象**: `src/components/chat/CompactChat.tsx`（1ファイル・新規）

1. `CompactChat` コンポーネントを作成
2. 折りたたみ表示: 最新1〜3件の `RecentMessages` 内部コンポーネント
3. 展開表示: 既存 `MessageList` を max-height 制限で再利用
4. 入力欄: 既存 `ChatInput` の縮小版を内蔵（1行 input、送信ボタン）
5. 送信ロジック: ChatPanel と同じパターン（chat-store + /api/chat 直接呼び出し）
6. Framer Motion による展開/折りたたみアニメーション

**検証**: lint && typecheck && build（まだ使用箇所なしでもビルド通過を確認）

### Step 5: AICharacter + CompanionViewer に CompactChat 統合

**対象**: `src/components/ai-character/AICharacter.tsx`, `src/components/ai-character/CompanionViewer.tsx`（2ファイル）

1. AICharacter.tsx:
   - `ChatPanel` import → `CompactChat` に変更
   - `isOpen` 時の描画を CompactChat に置換
   - `expanded` useState を追加
   - ChatBubble の表示条件を調整（CompactChat 表示中は非表示）
2. CompanionViewer.tsx:
   - `ChatPanel` import → `CompactChat` に変更
   - レイアウトを flex-row（sm以上）に変更
   - `expanded` useState を追加

**検証**: lint && typecheck && build

---

## 5. Gotchas チェックリスト（全ステップ共通）

| Gotcha | 対策 | 該当ステップ |
|--------|------|-------------|
| Hydration | CompactChat は `'use client'`。`window.*` 不使用 | Step 4 |
| next/dynamic | AICharacter は既に default export + ssr:false。変更なし | Step 5 |
| React 19 lint | CompactChat で `useEffect(() => setState)` は使わない。サイズは親管理 | Step 4 |
| Framer Motion | 既存 `AnimatePresence` パターン踏襲 | Step 4, 5 |
| SSRF | extractor.ts の変更は HTML パース部のみ。fetch ロジックに触らない | Step 1 |
| Tailwind v4 | クラス直接指定のみ。`@theme` 変更なし | 全ステップ |
| Zustand persist | chat-store は変更なし。展開状態は useState（persist 不要） | Step 4, 5 |
| 5ファイル制限 | 各ステップ最大2ファイル。制限内 | 全ステップ |
