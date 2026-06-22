# らくしふ風シフト管理UIへの全面刷新 設計

- 日付: 2026-06-22
- 対象: 株式会社暁夢向けシフト管理アプリ（デモ）のフロントエンドUI
- 参照: `要件定義/要件定義.md`、`要件定義/スクリーンショット 2026-06-22 111638.png`、`要件定義/スクリーンショット 2026-06-22 111747.png`、`要件定義/start_manual.pdf`（らくしふ スタートマニュアル）

## 背景と目的

既存UIは「インディゴ基調のSaaS調」だが、顧客が示した参照UI（クラウドサービス「らくしふ」の店長シフト作成画面）と乖離している。ユーザーから「画像通りに変換するなら今のUIは全部消してよい」と明確な許可を得た。

本作業は、データ層とバックエンドを温存しつつ、フロントエンドUIをスクリーンショットの「らくしふ風マトリクス画面」に忠実に作り替えることを目的とする。

## 決定事項（ユーザー承認済み）

1. **範囲**: 全画面（店長マトリクス／スタッフ希望提出／確定シフト共有）をらくしふ風の世界観で統一する。
2. **配色**: スクショ通り。白基調＋パステルチップ（早番=赤/ピンク・遅番=青・休み=グレー）。要件定義のオレンジは採用しない。
3. **技術構成**: 現状維持。`frontend`（React + Vite + TypeScript）+ `backend`（Spring Boot + H2）。データ層（`types.ts` / `store/` / `api/client.ts`）は再利用。
4. **中番（緑チップ）**: 入れない。要件定義が早番/遅番の2スロットのみであり、「機能を盛り込みすぎない」方針に従う。スクショの中番チップはデモ範囲外とし、レイアウト・チップの見た目のみ再現する。

## 非対象（YAGNI）

- 中番スロットの追加（データモデル・バックエンド enum・シードの変更を伴うため除外）。
- LINE連携、印刷の実処理、未収アラートの実集計など、らくしふの装飾的機能の本実装。これらは見た目のみ（デモ用ダミー）に留める。
- 認証・DB の作り替え（既存のまま）。

## アーキテクチャ

### 温存するもの（変更しない）

- `frontend/src/types.ts` … `WorkSlot = 'early' | 'late'`、`DayRequestValue`、各 interface。
- `frontend/src/store/AppContext.tsx` … 状態・API連携・`toggleAssignment` / `setDayRequest`。
- `frontend/src/store/requests.ts` / `assignments.ts` … 純粋関数（`getDayRequest` / `isAssigned` / `countAssigned` / `fulfillmentLevel`）。
- `frontend/src/lib/date.ts` … `getMonthDates` 等。
- `frontend/src/api/client.ts` とバックエンド全体。
- `frontend/src/constants.ts` … `SLOT_LABELS` / `SLOT_TIMES` / `WORK_SLOTS` / 充足閾値。必要なら定数追加のみ。

### 作り替えるもの

- `frontend/src/styles.css` … デザイントークン（CSS変数）と全コンポーネントのスタイルを、らくしふ風に全面刷新。
- `frontend/src/components/ManagerMatrix.tsx` … 店長マトリクス画面。
- `frontend/src/components/RequestEditor.tsx` … スタッフ希望提出画面。
- `frontend/src/components/SharedView.tsx` … 確定シフト共有画面。
- `frontend/src/components/Header.tsx` … 上部ツールバー。
- `frontend/src/App.tsx` … レイアウト・画面切り替えの調整。
- `frontend/src/components/ui/*` … Legend / Badge / SummaryBar 等を新配色に合わせて調整。必要に応じて小部品を追加。

## デザイントークン（`styles.css` の CSS変数）

| トークン | 用途 | 値の方針 |
|---|---|---|
| `--c-early` / `--c-early-bg` / `--c-early-border` | 早番チップ | 赤/ピンク系 |
| `--c-late` / `--c-late-bg` / `--c-late-border` | 遅番チップ | 青系 |
| `--c-off-bg` / `--c-off-border` | 休みチップ | グレー系 |
| `--c-sun` / `--c-sat` | 曜日色（日=赤・土=青） | |
| `--c-surface` / `--c-line` / `--c-header-bg` | 背景・罫線・ヘッダー帯 | 白・薄グレー・極薄グレー |
| `--c-text` / `--c-text-muted` | 文字色 | |

`prefers-reduced-motion`、可視フォーカス、ARIA を維持する。

## 画面設計

### ① 店長マトリクス（`ManagerMatrix.tsx`）

スクショの主役。横スクロール可能なテーブル。

- **上部ツールバー（`Header.tsx`）**: 店舗セレクタ（既存機能・動作）、「シフト確定」ボタン（共有画面への導線/装飾）、未収アラート（ダミー件数表示）、印刷ボタン（装飾）、月送り（既存機能・動作）。
- **表示切替タブ（日/週/半月/月）**: デモでは「月」を選択状態で固定。タブは見た目のみ。
- **マトリクス本体**:
  - 日付ヘッダー行: 日＋曜日。日曜=赤字、土曜=青字、平日=黒字。
  - 集計行:
    - 総労働時間（時間帯別の割り当て人数 × 1コマの時間から算出、`h`表記）。
    - 人件費の目安（割り当てコマ数 × 仮時給 × 時間。要件④を充足。仮時給は `constants.ts` に定数で持つ）。
    - 時間帯別充足（`countAssigned` を用いて `2/2` 形式＋充足レベルの色）。
  - スタッフ行: 氏名＋月間合計時間。各日セルに希望/割り当てをパステルチップで表示。クリック/Enter/Spaceで割り当てトグル（既存 `toggleAssignment` 流用）。アクセシブルな `role="button"` / `aria-label` を維持。
- レスポンシブ: 狭幅では氏名列を固定し本体を横スクロール。

### ② スタッフ希望提出（`RequestEditor.tsx`）

- スマホ前提の月カレンダー。日をタップ → 既存 `BottomSheet` で「早番 / 遅番 / 休み / 取消」を選択 → `setDayRequest`。
- 選択済みの日はチップ色で表示。タップ中心・文字入力なし（要件の最優先事項）。

### ③ 確定シフト共有（`SharedView.tsx`）

- 確定済み割り当て（`assignments`）を同じチップ言語で月カレンダー表示。スタッフ視点で「誰がいつ出勤か」が分かる。

## データフロー

UI → `useApp()`（`AppContext`）→ `api`（`client.ts`）→ バックエンド。
割り当てトグル・希望更新は既存の `toggleAssignment` / `setDayRequest` を呼び、`reloadStoreData` で再取得する現行フローを踏襲する。新規のAPI追加は行わない。

## エラー処理

- スタッフ0件・データ未取得時は既存同様の空状態/スケルトンを表示。
- 既存の `Toast` を用いて操作結果を通知（任意・現行踏襲）。
- 外部由来データはレンダリング時に既存の型で扱い、XSSは React の標準エスケープに委ねる（`dangerouslySetInnerHTML` を使わない）。

## テスト

既存テストを壊さないことを最優先とする。

- `ManagerMatrix.test.tsx`: 割り当てトグル・人数集計の表示を新DOM構造に合わせて更新。人件費/総労働時間の算出に純粋関数を切り出した場合はその単体テストを追加。
- `MonthCalendar.test.tsx` / `BottomSheet.test.tsx` / `summary.test.ts` / `Toast.test.tsx`: 構造変更に追従。
- 算出ロジック（総労働時間・人件費）は純粋関数として `store/` または `lib/` に置き、TDDで先にテストを書く。

最終確認: `npx tsc --noEmit` / `npm test` / `npm run build`。

## リスク

- スクショは実サービス（らくしふ）の密なレイアウト。デモ範囲に収めるため、装飾的な行・ボタンは見た目のみとし、機能と装飾の境界を明示する。
- 既存テストがDOM構造に依存しているため、UI刷新で広範に更新が必要になる。テストを弱体化させず、新仕様に合わせて正しく更新する。
- 横スクロール＋固定列のレスポンシブ実装はブラウザ差異に注意。

## 検証方法

1. `npx tsc --noEmit` 型チェック。
2. `npm test` 全テスト。
3. `npm run build` ビルド。
4. `npm run dev` でブラウザ確認し、スクショとの見た目一致・主要操作（希望提出→マトリクス割り当て→共有表示）を目視確認。
