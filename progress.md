# Aimo 開発進捗

## 現在のフェーズ: 相棒感強化

### 完了済み機能 (MVP)
- Safari風ブラウザUI (BrowserBar, BrowserHome, 履歴, 候補URL)
- 記事抽出・解析 (要約/言い換え/注意点/別視点)
- YouTube共同視聴 (字幕取得, VideoQA)
- AIキャラクター (歩行アニメ, 表情, 放浪/固定, スナップ, ドラッグ)
- チャット (ChatPanel, 育成パラメータ連動)
- 学習日記 (自動生成, 一覧/詳細)
- プロフィール (レーダーチャート, 成長パラメータ)
- 設定 (AI名, テーマ, データ管理)
- セキュリティ (SSRF防御, レートリミット, CSRF, 本番デバッグ無効化)

### 直近の修正履歴
| 日付 | 内容 | コミット |
|------|------|---------|
| 2026-04-09 | 相棒感: チャット応答時の感情反応 | `1679ca9` |
| 2026-04-09 | 相棒感: 解析結果に応じた感情反応 | `588c4f3` |
| 2026-04-09 | 相棒感: 瞬き・視線・待機リアクション | `7f7f22d` |
| 2026-04-09 | P1 安定化追補 (エラーサニタイズ, store reset, docs) | `de064cd` |
| 2026-04-09 | セキュリティ修正 (SSRF, レートリミット, lint) | `00afbe1` |
| 2026-04-09 | Hydration mismatch 解決 (canDrag パターン) | `23a1219` |
| 2026-04-09 | AI協働ルール追加 | `c010fcd` |

### 検証状態
- build: ✅
- lint: ✅
- typecheck: ✅
- dev server: ✅

---

## Gotchas (既知の落とし穴)

### 1. Hydration Mismatch — browser-only 値を初回レンダリングに混ぜるな
**問題**: `window.innerWidth` を使う `isDesktop()` が SSR と client で異なる値を返し、framer-motion の `drag` prop が異なる HTML 属性を生成。
**解決**: `const canDrag = hydrated && isDesktop()` で、hydration 完了前は一律 `false` にする。SSR と client 初回レンダリングの DOM 属性を一致させる。
**ファイル**: `src/components/ai-character/AICharacter.tsx`

### 2. next/dynamic — named export + ssr:false は Next.js 16 で壊れている
**問題**: `dynamic(() => import('./Foo').then(m => m.Foo), { ssr: false })` が正常に動作しない。
**解決**: コンポーネントを `export default` にして、`.then()` なしの `dynamic(() => import('./Foo'), { ssr: false })` を使う。
**ファイル**: `src/app/providers.tsx`

### 3. useSyncExternalStore で isClient/hydrated パターンを実装
**問題**: React 19 の `react-hooks/set-state-in-effect` lint ルールが `useEffect(() => setState(true), [])` を禁止。
**解決**: `useSyncExternalStore(() => () => {}, () => true, () => false)` で SSR=false / client=true を lint 違反なく実現。
**ファイル**: `src/stores/use-hydration.ts`, `src/components/ai-character/AICharacter.tsx`

### 4. framer-motion animate() で滑らかな歩行を実現
**問題**: `motionValue.set()` は即座に位置を変更するため、歩行アニメーションにならない。
**解決**: `animate(motionValue, target, { duration })` で距離に応じたスムーズな移動。`animX.stop()` で中断可能。
**ファイル**: `src/components/ai-character/AICharacter.tsx`

### 5. YouTube 字幕取得 — innertube API + HTML スクレイピングの二段構え
**問題**: innertube API だけでは取得できないケースがある。
**解決**: innertube API → HTML ページスクレイピングの fallback チェーン。言語優先度: ja手動 > ja自動 > en > その他。
**ファイル**: `src/lib/youtube/transcript.ts`

### 6. SSRF 防御 — redirect 先も検証が必要
**問題**: `redirect: 'follow'` だとリダイレクト先の URL が SSRF チェックをバイパスする。
**解決**: `redirect: 'manual'` + 手動リダイレクト追跡。各ホップで `isBlockedUrl()` を再検証。最大5ホップ。
**ファイル**: `src/lib/page-reader/extractor.ts`

---

## 相棒感強化フェーズ
- [x] 瞬き (scaleY squash blink, CSS keyframe, 4s cycle)
- [x] 視線・待機リアクション (12-18s ランダムで glance tilt)
- [x] アイドル呼吸に微細な首振り追加
- [x] 解析結果に応じた感情反応 (reaction-store + 吹き出し, 4s auto-clear)
- [x] チャット応答時の感情反応 (keyword sentiment + 確率ゲート)
- [ ] 会話記憶の永続化と参照
- [ ] ページ閲覧時のリアルタイムコメント
- [ ] 成長システムの可視化改善
- [ ] モバイル体験の最適化
