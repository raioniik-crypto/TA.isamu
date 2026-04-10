# DESIGN: ホーム/雑談 2層チャット構成

SPEC.md に基づく詳細設計。CLAUDE.md の Gotchas を確認済み。

---

## 1. 影響範囲

### 変更ファイル一覧

| # | ファイル | 変更種別 | 概要 |
|---|---------|---------|------|
| 1 | `src/components/ui/Header.tsx` | 修正 | NAV_ITEMS に「雑談」タブ追加 |
| 2 | `src/app/chat/page.tsx` | **新規** | 雑談タブのルート |
| 3 | `src/components/chat/CasualChatPage.tsx` | **新規** | 雑談ページ本体 |
| 4 | `src/components/home/HomeCompanionCard.tsx` | **新規** | ホーム専用キャラカード |
| 5 | `src/app/page.tsx` | 修正 | BrowserHome → HomeCompanionCard に差し替え |
| 6 | `src/components/ai-character/AICharacter.tsx` | 修正 | ホーム（コンテンツなし）で非表示化 |

### 変更しないファイル（互換性維持）

- `src/stores/chat-store.ts` — 会話データ構造は変更なし。ホームと雑談で同一 conversation を参照
- `src/stores/reaction-store.ts` — 変更なし
- `src/stores/ai-profile-store.ts` — 変更なし
- `src/components/chat/CompactChat.tsx` — 残置。浮遊キャラ（非ホームページ）で引き続き使用
- `src/components/chat/ChatPanel.tsx` — 残置。直接使用箇所はないが削除しない
- `src/components/chat/ChatInput.tsx` — CasualChatPage・HomeCompanionCard から再利用
- `src/components/chat/MessageList.tsx` — CasualChatPage で利用しない（独自描画）。CompactChat 展開モードでは引き続き使用
- `src/components/ai-character/CharacterAvatar.tsx` — HomeCompanionCard から再利用
- `src/components/ai-character/ChatBubble.tsx` — HomeCompanionCard から再利用
- `src/components/ai-character/CompanionViewer.tsx` — YouTube モードは変更なし
- `src/components/browser/BrowserHome.tsx` — ホームでの描画対象外になるが、ファイルは削除しない
- `src/components/browser/BrowserBar.tsx` — Header 内で常時表示。URL 入力はここが担う
- API ルート (`/api/chat`, `/api/analyze` 等) — 変更なし

---

## 2. コンポーネント設計

### 2-1. Header.tsx の変更

```
現状の NAV_ITEMS:
  ホーム → / 
  日記   → /diary
  AI情報 → /profile
  設定   → /settings

変更後:
  ホーム → /
  雑談   → /chat       ← 新規追加（ホームと日記の間）
  日記   → /diary
  AI情報 → /profile
  設定   → /settings
```

`pathname === '/chat'` でアクティブ判定。既存の Link + usePathname パターンそのまま。

### 2-2. CasualChatPage（新規）

#### 責務

雑談タブの本体。共通会話履歴を全件表示し、継続会話する。

#### 内部構造

```
CasualChatPage
├── ヘッダー（AI名のみ。小さく、控えめ）
├── メッセージ領域（flex-1, overflow-y-auto, 自動スクロール）
│   └── メッセージごと:
│       ├── assistant → 左寄せ吹き出し（名前・アイコンなし）
│       └── user → 右寄せ吹き出し
├── ChatInput（既存コンポーネント再利用、画面下固定）
```

#### メッセージ吹き出しスタイル

SPEC §4-4 に準拠。MessageList とは別の描画ロジック（名前・アイコン排除のため）。

```
assistant:
  - 左寄せ: justify-start
  - max-w-[80%]
  - bg-chat-ai, border border-[var(--chat-ai-border)]
  - rounded-2xl rounded-bl-md
  - px-4 py-3, text-[15px] leading-[1.7]
  - タイムスタンプ: text-[11px] text-muted, 吹き出し下

user:
  - 右寄せ: justify-end
  - max-w-[75%]
  - bg-primary text-white
  - rounded-2xl rounded-br-md
  - px-4 py-2.5, text-[15px] leading-[1.7]
  - タイムスタンプ: text-[11px] text-white/60, 吹き出し下
```

#### 送信ロジック

CompactChat / ChatPanel と同一パターン（chat-store + `/api/chat` 直接呼び出し）。

```
1. currentConversationId がなければ startConversation()
2. addMessage(convId, { role: 'user', content })
3. setIsSending(true)
4. fetch('/api/chat', { messages, aiName, growthParams })
5. addMessage(convId, { role: 'assistant', content, metadata })
6. applyGrowth + incrementInteractions
7. detectChatEmotion → triggerReaction
8. setIsSending(false)
```

#### 空状態

メッセージが0件の場合:
```
「{aiName}とおしゃべりしよう」
「なんでも気軽に話してみてね」
```

#### Gotchas チェック

- `'use client'` コンポーネント。`window.*` 不使用
- ChatInput を再利用（既に hydration 安全）
- autoScroll は `useRef` + `useEffect` で `scrollIntoView`（既存 MessageList と同パターン）
- Framer Motion: メッセージ入場に `motion.div`（既存パターン踏襲）

### 2-3. HomeCompanionCard（新規）

#### 責務

ホーム専用のキャラ表示 + 最新返答吹き出し + 入力欄。
SPEC §3「ホームはキャラに話しかける場所」を体現する。

#### 内部構造

```
HomeCompanionCard
├── キャラ表示エリア（中央配置）
│   ├── ChatBubble（centered, 最新返答 or リアクション）
│   └── CharacterAvatar（大サイズ、クリックなし）
├── キャラ名ラベル（小テキスト、控えめ）
├── 入力エリア（キャラ真下）
│   └── 1行 input + 送信ボタン
```

#### 表示仕様（SPEC §3-2, §3-3 厳守）

**表示する:**
- キャラ本体（CharacterAvatar）
- 最新 assistant メッセージ 1件の吹き出し（ChatBubble）
- キャラ直下の入力欄 + 送信ボタン

**表示しない:**
- ユーザーメッセージ
- 過去のチャット履歴
- 名前ラベル（吹き出し内外とも）
- アイコン
- 複数件の吹き出し

#### 吹き出し表示ロジック

```typescript
// 表示優先度:
// 1. リアクション（4秒で自動消去、既存 reaction-store）
// 2. 最新の assistant メッセージ（永続的）
// 3. 挨拶メッセージ（初期表示、pickReactionMessage('greeting', params)）

const latestAssistant = messages.findLast(m => m.role === 'assistant');
const displayMessage = reaction?.message ?? latestAssistant?.content ?? greeting;
```

#### 入力欄仕様

```
- placeholder: "{aiName}に話しかける…"（SPEC §3-4 例文準拠）
- 1行テキスト input（textarea ではない）
- 右端に送信ボタン（小さい、アイコンのみ）
- Enter で送信（IME composing 中は無視）
- 送信後: 入力クリア、ユーザー発話はホーム非表示
- 送信中: input 無効化、キャラ expression='thinking'
```

#### 送信ロジック

CasualChatPage と同一パターン。送信後、ホームには AI 返答のみ吹き出し表示。
ユーザー発話は chat-store に保存されるが、HomeCompanionCard 上では描画しない。

#### 挨拶メッセージ

AICharacter と同様、マウント後 1.5 秒で `pickReactionMessage('greeting', params)` を表示。
会話開始（latestAssistant 存在）後は挨拶を非表示にする。

#### キャラサイズ

```typescript
function getHomeCharacterSize(): number {
  if (typeof window === 'undefined') return 240;
  const w = window.innerWidth;
  if (w >= 1280) return 280;
  if (w >= 768) return 240;
  return 180;
}
```

CompanionViewer と同様のパターン。`useEffect` 内で `setCharSize(getHomeCharacterSize())` + resize listener。

#### Gotchas チェック

- Hydration: `typeof window === 'undefined'` ガード + `useEffect` でサイズ初期化
- `useHydration()` で `displayName` / `params` をガード
- ChatBubble は `centered` prop で中央寄せ
- CharacterAvatar は既存再利用（onClick は不要 or 空関数）

### 2-4. page.tsx（ホーム）の変更

```
現状:
  !hasContent → <BrowserHome ... />

変更後:
  !hasContent → <HomeCompanionCard />
```

BrowserHome の import を HomeCompanionCard に差し替え。
`hasContent` 時の ContentViewer / ViewerAnalysis / CompanionViewer は変更なし。

BrowserHome に渡していた props（displayName, displayCount, personality）は不要になる。
HomeCompanionCard は内部で store を直接 subscribe する。

#### 削除される import

```diff
- import { BrowserHome } from '@/components/browser/BrowserHome';
+ import { HomeCompanionCard } from '@/components/home/HomeCompanionCard';
```

HomeCompanionCard で直接参照するため、page.tsx から以下の import も不要になる可能性がある:
- `useSettingsStore`（aiName）
- `useAIProfileStore`（params, totalInteractions）
- `derivePersonality`
- `DEFAULT_GROWTH_PARAMS`

ただし、`hasContent` 判定に `useViewerStore` は引き続き必要。
error 表示も残すため、page.tsx のロジックは最小限の整理に留める。

### 2-5. AICharacter.tsx の変更

```
現状の非表示条件:
  if (!isClient) return null;
  if (viewerContent?.type === 'youtube') return null;

追加:
  // ホーム（コンテンツなし）では HomeCompanionCard がキャラを表示
  if (pathname === '/' && !viewerContent) return null;
```

**必要な追加:**
- `import { usePathname } from 'next/navigation';`
- `const pathname = usePathname();` — hooks セクション（他の hooks と同列、条件分岐前）

**動作:**
- `/` でコンテンツなし → 非表示（HomeCompanionCard が代替）
- `/` でコンテンツあり（記事閲覧中） → 表示（浮遊キャラ）
- `/` でコンテンツあり（YouTube） → 非表示（既存: CompanionViewer が代替）
- `/chat`, `/diary`, `/profile`, `/settings` → 表示（浮遊キャラ）

### 2-6. chat/page.tsx（新規ルート）

```typescript
'use client';

import { CasualChatPage } from '@/components/chat/CasualChatPage';

export default function ChatPage() {
  return <CasualChatPage />;
}
```

最小限のルートファイル。default export 必須（App Router 規約）。

---

## 3. データフロー

### Zustand ストア変更

**変更なし。** 既存の `chat-store` をそのまま使用。

```
chat-store（persist key: 'ta-isamu:conversations'）
├── conversations: Conversation[]
├── currentConversationId: string | null
├── isSending: boolean
└── actions: startConversation, addMessage, setIsSending, ...
```

**HomeCompanionCard の読み取り:**
```
getCurrentConversation().messages → findLast(role === 'assistant') → 吹き出し表示
```

**CasualChatPage の読み取り:**
```
getCurrentConversation().messages → 全件表示
```

**書き込み（共通）:**
```
addMessage(convId, { role, content }) → 両方のビューに即時反映
```

### データ共有の保証

ホームと雑談は同一の `currentConversationId` を参照する。
Zustand のリアクティブ更新により、一方で追加されたメッセージは他方にも即座に反映。

例: ホームで送信 → assistant 返答が追加 → 雑談タブに切り替え → そのメッセージが見える
例: 雑談で送信 → assistant 返答が追加 → ホームタブに切り替え → 最新返答が吹き出しに反映

### API ルート変更

**変更なし。** `/api/chat` のリクエスト/レスポンス形式は据え置き。

### LLM プロンプト変更

**変更なし。** 前回の DESIGN で調整済み（1〜3文、上品で落ち着いた雰囲気）。

---

## 4. 実装ステップ

### Step 1: 雑談タブ追加

**対象**: `src/components/ui/Header.tsx`, `src/app/chat/page.tsx`（2ファイル）

1. `Header.tsx`: `NAV_ITEMS` に `{ href: '/chat', label: '雑談' }` をホームと日記の間に追加
2. `src/app/chat/page.tsx`: 新規作成。仮のプレースホルダーページ（「雑談ページ準備中」テキスト）

**検証**: lint && typecheck && build
**確認**: タブ表示・遷移が正常に動作すること

### Step 2: CasualChatPage 作成

**対象**: `src/components/chat/CasualChatPage.tsx`, `src/app/chat/page.tsx`（2ファイル）

1. `CasualChatPage.tsx`: 新規作成
   - 全会話履歴表示（名前・アイコンなし、左右吹き出し）
   - ChatInput 再利用（画面下固定）
   - 送信ロジック（CompactChat と同パターン）
   - 自動スクロール
   - 空状態表示
2. `src/app/chat/page.tsx`: CasualChatPage を import して描画

**検証**: lint && typecheck && build
**確認**: 雑談タブで会話ができること。既存 CompactChat での会話履歴が表示されること

### Step 3: HomeCompanionCard 作成

**対象**: `src/components/home/HomeCompanionCard.tsx`（1ファイル・新規）

1. `HomeCompanionCard.tsx`: 新規作成
   - CharacterAvatar 中央配置（レスポンシブサイズ）
   - ChatBubble（centered, 最新 assistant 返答 or リアクション or 挨拶）
   - 入力欄（1行 input + 送信ボタン、キャラ直下）
   - 送信ロジック（同パターン）
   - ユーザーメッセージはホーム上に表示しない
   - 挨拶メッセージ（マウント後 1.5s）

**検証**: lint && typecheck && build（まだ使用箇所なしでもビルド通過を確認）

### Step 4: ホーム統合 + 浮遊キャラ非表示

**対象**: `src/app/page.tsx`, `src/components/ai-character/AICharacter.tsx`（2ファイル）

1. `page.tsx`:
   - `BrowserHome` import → `HomeCompanionCard` に変更
   - `!hasContent` 時の描画を `<HomeCompanionCard />` に置換
   - 不要になった props 計算・import を整理
2. `AICharacter.tsx`:
   - `usePathname` を追加
   - `pathname === '/' && !viewerContent` で `return null`

**検証**: lint && typecheck && build
**確認**:
- ホーム: キャラ表示 + 吹き出し + 入力欄のみ
- ホームで送信 → 入力クリア、AI 返答が吹き出しに表示
- 雑談に切り替え → ホームの会話が見える
- 雑談で送信 → ホームに戻ると最新返答が吹き出しに反映
- コンテンツ閲覧中 → 浮遊キャラが表示される（従来通り）
- リロード後の整合性

---

## 5. Gotchas チェックリスト（全ステップ共通）

| Gotcha | 対策 | 該当ステップ |
|--------|------|-------------|
| Hydration | HomeCompanionCard: `typeof window === 'undefined'` ガード + `useEffect` でサイズ設定。`useHydration()` で aiName/params ガード | Step 3, 4 |
| Hydration | CasualChatPage: `'use client'` + store 直接参照のみ。`window.*` 不使用 | Step 2 |
| next/dynamic | AICharacter は既存の default export + ssr:false を維持。変更なし | Step 4 |
| React 19 lint | HomeCompanionCard のサイズ初期化は `useEffect` 内の `setState`。eslint-disable コメント付き（CompanionViewer と同パターン） | Step 3 |
| Framer Motion | CasualChatPage のメッセージ入場は `motion.div`。既存 MessageList と同パターン | Step 2 |
| SSRF | 変更なし。fetch ロジックに触らない | - |
| Tailwind v4 | クラス直接指定のみ。`@theme` 変更なし | 全ステップ |
| Zustand persist | chat-store は変更なし。HomeCompanionCard の greeting/expanded 状態は useState（persist 不要） | Step 2, 3 |
| 5ファイル制限 | 各ステップ最大2ファイル。制限内 | 全ステップ |

---

## 6. 設計判断メモ

### BrowserHome の扱い

SPEC §3-2「以下のみ表示する」に従い、ホーム初期状態から BrowserHome（URL 入力・サンプルリンク・閲覧履歴）を外す。URL 入力は Header 内の BrowserBar が常時提供するため、ブラウジング機能は維持される。BrowserHome.tsx はファイルとして残す（将来的な再利用の余地あり）。

### 送信ロジックの重複

CompactChat / ChatPanel / CasualChatPage / HomeCompanionCard の4箇所に同一パターンの送信ロジックが存在する。共通 hook `useChatSend()` への抽出は有益だが、今回のスコープでは各コンポーネントにインライン実装する（CLAUDE.md「Three similar lines is better than a premature abstraction」準拠）。抽出はフォローアップ検討事項。

### MessageList の再利用

CasualChatPage では既存 MessageList を使わず、独自のメッセージ描画を行う。理由:
- MessageList は各 assistant メッセージにアバターアイコン + 名前ラベルを表示（SPEC で不要指定）
- prop で制御するより、雑談専用の描画を持つほうがシンプルで SPEC §4-4 のスタイル要件に忠実

### 共通吹き出しコンポーネント（SPEC §10 Step 4）

SPEC は「吹き出しUIを共通部品化」を Step 4 として挙げている。しかし:
- HomeCompanionCard は既存 ChatBubble（キャラ頭上吹き出し）を再利用
- CasualChatPage のメッセージ吹き出しは会話ログ用で、ChatBubble とは責務が異なる

両者を統合する共通コンポーネントは過剰抽象化のリスクがあるため、今回は見送る。必要性が明確になった段階で検討する。
