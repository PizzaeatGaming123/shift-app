# 2026-06-28 参考UI風シフト編集フロー + 月保持/読取専用バグ修正 設計

## 目的

シフト表の編集体験を「参考UI」のフロー（希望＝点線、確定＝ベタ塗り、編集モーダルは1種類）に寄せながら、運用で見つかった3つのバグを同時に解消する：

1. 月の初期値が実機の翌月でなく、localStorage に古い `2025-09` が残ると `2026-09` に化ける。
2. スタッフ画面「確定シフト」で他人のシフトセルが押せて、割当が変えられる。
3. 「先月と同じ」ボタンが浮いて見え、AI 提案のようで他のUIと馴染まない。

これらは互いに参照箇所が重なるため、1つの仕様としてまとめて反映する。

## 非目的

- バックエンドAPI／DBスキーマ／割当ドメインモデルは変更しない。`saveAssignmentDetails` / `toggleAssignment` を再利用する。
- 「シフト確定」「公開」ダイアログ自体の挙動には触れない。
- DayTimeline（日次タイムライン）には触れない。

## 全体方針

すべてフロントエンド (`frontend/src/`) のみで完結する。中心になる変更は以下の3点：

- `ShiftTable` / `ShiftStaffRow` に新規プロップ `shiftMode: 'assignment' | 'confirmed' | 'readonly'` を導入し、表示と入力の責務をモードで切り替える。
- 編集モーダルは `ShiftCellEditorModal` 1つに統一し、既存の `AssignTimeModal` を廃止する。
- `AppContext` の月の初期値ロジックを翌月既定に直し、StaffApp の年補正ロジックを削除する。

## 1. 月の初期値とバグ修正

### 現状

`AppContext.tsx:169` で `useState(() => getSetting(MONTH_STORAGE_KEY, currentMonthIso()))`。localStorage が空なら実機の現在月。

`StaffApp.tsx:22-26` に「`year` が現在年と違ったら、月だけ残して現在年に補正して localStorage に上書きする」useEffect がある。これが localStorage の `2025-09` を `2026-09` に書き換えてしまう。

### 変更

- `AppContext.tsx` に `nextMonthIso()` を追加（実機の翌月。月跨ぎは `new Date(year, month + 1, 1)` で1月補正）。
- `currentMonthIso()` の利用箇所を `nextMonthIso()` に置き換える。
- `StaffApp.tsx` の年補正 useEffect (`useEffect(() => { if (year === allowedYear) return; ... })`) を削除。`year`, `monthNum` をそのまま `RequestEditor` / `SharedView` に渡す。
- localStorage は完全保持。値があれば常にそれを優先する（古い値も尊重）。
- `MONTH_STORAGE_KEY` / `getSetting`/`setSetting` の挙動は変えない。

### 期待動作

- localStorage が空（初回・クリア後）→ 翌月（実機が 2026-06 なら 2026-07）。
- localStorage に `2026-09` が入っている → そのまま `2026-09`。
- スタッフがシフト表で月矢印を動かしたら、その月を localStorage に保存し、次回も同じ月で開く。
- 「暁夢シフト」ロゴクリック（`goHome`）は月を変えない（既存挙動を踏襲）。

## 2. 「先月と同じ」ボタンのUI

### 現状

`ShiftStaffRow.tsx:100-109` でスタッフ名セルの中に独立した枠付き小ボタン `.rk-shift-staff__copy`。背景 白 / 枠線 灰 / 角丸 1px / `padding: 2px 8px`。スタッフ名の下にブロックで配置される。

### 変更

- 同じセル内、スタッフ名の右側にインライン配置。
- 見た目をテキストリンク風に：
  - `background: transparent`
  - `border: none`
  - `padding: 0`
  - `font-size: 11px`
  - `color: var(--rk-text-muted)`
  - `text-decoration: underline dotted`
- ホバー / フォーカス時に `color: var(--rk-text)` に変えて、下線を `underline solid` に。
- アクセシビリティ用 `aria-label` は維持。

### 期待動作

スタッフ名の隣に小さな下線つき補助テキストとして見え、他の補助操作（ソート切替の `<button>` など）と統一感が出る。

## 3. シフトモード分離 + 点線セルから `ShiftCellEditorModal`

### 現状

- `ShiftStaffRow.tsx` は `shiftMode` を知らず、`layers.showRequests` / `layers.visibleSlots` だけで表示制御。希望チップ（点線）も割当チップ（ベタ）も同時に出る。
- 希望チップのクリック → `onToggleAssignment` 直叩きで即時割当。時間入力なし。
- 空セルクリック → `AssignTimeModal`（時間入力モーダル）が開き、割当が作られる。
- 既存割当のチップのクリック → `onToggleAssignment` で即時解除。

### 変更

#### プロップ
- `ShiftTable` のプロップに `shiftMode: 'assignment' | 'confirmed' | 'readonly'` を追加。
- `ShiftStaffRow` も同じ `shiftMode` を受け取り、表示と入力の責務を切り替える。
- `ManagerShiftScreen.tsx` の既存 `shiftMode` state（`'assignment' | 'confirmed'`）をそのまま渡す。`SharedView` は `'readonly'` を渡す。

#### 表示
- `'assignment'`:
  - 希望（点線）チップのみ描画。`cell.assignment` は無視する。
  - 空セルに「＋」ボタンを描画する。
- `'confirmed'`:
  - 割当（ベタ）チップのみ描画。`cell.request` は無視する。
  - 空セルに「＋」は出さない（このモードは閲覧と既存編集に専念）。
- `'readonly'`:
  - 希望と割当の両方を描画する。ただし `<button>` ではなく `<span>` で描画する。
  - 空セルに「＋」は出さない。

#### 編集モーダル
- `AssignTimeModal` を削除し、`ShiftCellEditorModal` に統一する。
- `'assignment'` モードで希望クリック / 空セル「＋」クリック → `ShiftCellEditorModal` を `isEditing=false` で開く。
  - 希望から開いた場合、`initial` は未指定（モーダルは 10:00–18:00 をデフォルトに立ち上がる）。希望の slot は無視する（時間は人が決める）。
  - 保存 → `saveAssignmentDetails(date, slot, staffId, startTime, endTime, tasks, breaks, workMemo)` を呼ぶ。`slot` はモーダルが `startTime` から推定した値（`inferSlot`）を使う。
- `'confirmed'` モードで割当クリック → `ShiftCellEditorModal` を `isEditing=true` で開く。
  - `initial` には既存 `Assignment` の `startTime`/`endTime`/`tasks`/`breaks`/`workMemo` を流す。
  - 保存 → `saveAssignmentDetails` で上書き。
  - 削除 → `toggleAssignment(date, slot, staffId, true, startTime, endTime)` で割当解除。
- `'readonly'` モードでは `ShiftCellEditorModal` を一切開かない（`editTarget` を `null` に固定）。

#### `ShiftCellEditorModal` 側
- 既存実装は維持。`initial` 未指定でも安全に立ち上がるよう、現状の `useEffect` 既定値（10:00–18:00）に依存する。
- 「シフトパターン入力」タブは正社員のみという既存仕様も維持。
- `taskOptions` は当面 `['開店', '閉店', 'レジ', '清掃', '発注']` の暫定リストを `ManagerShiftScreen` / `SharedView` から定数として渡す（バックエンド側のタスクマスタ実装はスコープ外）。

### 期待動作

- `'assignment'` モードでは点線の希望が並び、押すと時間入力モーダルが開く。保存すると希望は消え、`'confirmed'` モードで見えるベタ塗り割当になる。
- `'confirmed'` モードでは確定済みのベタ塗りだけが並び、押すと既存値で編集モーダルが開く。
- セル内に2つのチップが並ぶことはない。

## 4. スタッフ画面「確定シフト」を読み取り専用化

### 現状

`SharedView.tsx` は `ShiftTable` に `[mySelf, ...others]` を渡す。`onToggleAssignment` などはダミー `() => {}` を渡しているが、`ShiftTable` 内部の `AssignTimeModal` 状態は活きていて、`+` ボタンも `<button>` の割当チップも表示されている。スタッフがそれを押せてしまうのが報告の不具合。

### 変更

- `SharedView.tsx` で `ShiftTable` に `shiftMode="readonly"` を渡す。
- ダミーの `onToggleAssignment` / `onStoreNoteChange` / `onPositionNoteChange` / `onSortChange` は維持（プロップは required のまま）。
- `ShiftTable.tsx` 内の `assignTarget` state は、`shiftMode === 'readonly'` のときに `setAssignTarget` を呼ばないようガードする。
- `ShiftStaffRow.tsx` の `'readonly'` モードでチップを `<span>` に切り替える。

### 期待動作

- スタッフが他人の行のセルを押しても何も起きない。フォーカスインジケータも出ない（`<span>` で `tabIndex` なし）。
- 自分の行のセルも同様に読み取り専用。
- 「先月と同じ」ボタンは元から `onCopyPreviousMonth` 未指定で出ない（既存仕様、維持）。

## 5. テスト

### 追加

- `ShiftCellEditorModal.test.tsx`（新規）:
  - 開閉、`initial` 未指定時のデフォルト時刻、`initial` 指定時の既存値反映。
  - 「休み」タブで保存すると `mode: 'off'` で `onSave` が呼ばれる。
  - 「シフトパターン入力」タブは `employmentType: '正社員'` のときのみ表示。
  - パターンボタンで `startTime`/`endTime` が埋まる。
  - 休憩追加 / 削除、タスクのトグル、メモの 100 文字制限。
  - 削除ボタンは `isEditing=true && onDelete` のときのみ描画。

### 改修

- `ShiftStaffRow.test.tsx`:
  - `shiftMode="assignment"` で希望のみ描画され、空セルに「＋」が出ること。
  - `shiftMode="confirmed"` で割当のみ描画され、空セルに「＋」が出ないこと。
  - `shiftMode="readonly"` でチップが `<span>` で描画され、「＋」が出ないこと。
- `ShiftTable.test.tsx`:
  - `shiftMode="readonly"` のときに空セルを操作してもモーダルが開かないこと。
  - 既存 `AssignTimeModal` 経由のテストは `ShiftCellEditorModal` 経由に書き直す。
- `SharedView.test.tsx`:
  - 他人の行のセルが `<span>` で描画され、クリックしても `saveAssignmentDetails` も `toggleAssignment` も呼ばれないこと。
- `ManagerShiftScreen.test.tsx`（または該当の AppContext テスト）:
  - localStorage が空の状態で AppContext を初期化すると、`month` が実機の翌月になること。
  - localStorage に `2026-09` があれば、初期化後の `month` がそのまま `2026-09` になること。

### 削除

- `AssignTimeModal.test.tsx` を削除（モーダル自体を廃止するため）。

## 影響範囲

| ファイル | 種別 |
|---|---|
| `frontend/src/store/AppContext.tsx` | 月既定の差し替え（`currentMonthIso` → `nextMonthIso`） |
| `frontend/src/components/StaffApp.tsx` | 年補正 useEffect 削除 |
| `frontend/src/components/manager/ShiftTable.tsx` | `shiftMode` プロップ追加、`AssignTimeModal` を `ShiftCellEditorModal` に置換 |
| `frontend/src/components/manager/ShiftStaffRow.tsx` | `shiftMode` 別の描画分岐、希望クリックで `onOpenEditor`、`<span>` 切替 |
| `frontend/src/components/manager/ManagerShiftScreen.tsx` | `shiftMode` を `ShiftTable` に伝搬、`taskOptions` 定数を渡す、`saveAssignmentDetails` をモーダル経由で呼ぶ |
| `frontend/src/components/SharedView.tsx` | `shiftMode="readonly"` を渡す |
| `frontend/src/components/manager/AssignTimeModal.tsx` | 削除 |
| `frontend/src/components/manager/AssignTimeModal.test.tsx` | 削除 |
| `frontend/src/components/manager/ShiftCellEditorModal.test.tsx` | 新規 |
| `frontend/src/components/manager/ShiftStaffRow.test.tsx` | 改修 |
| `frontend/src/components/manager/ShiftTable.test.tsx` | 改修 |
| `frontend/src/components/SharedView.test.tsx` | 改修 |
| `frontend/src/styles.css` | `.rk-shift-staff__copy` をテキストリンク風に作り直す |

## ロールアウト

すべて1ブランチ `feature/shift-app-1-3` 上で進める。フィーチャーフラグは置かない。実装が終わったらまとめてコミットし、`pnpm test` がグリーン、`pnpm dev` で:

1. 初回ロード（localStorage クリア後）が翌月で開く。
2. 月矢印で動かしてリロードしても同じ月で開く。
3. assignment モードで点線希望をクリック → 新モーダル → 保存 → confirmed モードで確定済み表示。
4. confirmed モードで確定済みをクリック → 編集モーダル → 削除可能。
5. スタッフでログインして「シフト確定」を開いたとき、他人のセルを押しても何も起きない。

の5点を手動で確認する。
