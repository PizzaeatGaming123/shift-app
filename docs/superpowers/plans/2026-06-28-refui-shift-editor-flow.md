# 参考UI風シフト編集フロー + バグ修正 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** シフト表の編集体験を「参考UI風」に統一しつつ、月既定の翌月化、スタッフ画面の読取専用化、「先月と同じ」ボタンのUI馴染ませを同時に反映する。

**Architecture:** すべて `frontend/src/` 内で完結する変更。`ShiftTable` / `ShiftStaffRow` に `shiftMode: 'assignment' | 'confirmed' | 'readonly'` を導入し、編集モーダルを `ShiftCellEditorModal` 1本に統一する。月の既定は `AppContext` の初期化ロジックを差し替え、`StaffApp` の年補正 useEffect を削除する。

**Tech Stack:** React 18 + TypeScript + Vite + Vitest + Testing Library。バックエンドは不変。

**Spec:** `docs/superpowers/specs/2026-06-28-refui-shift-editor-flow-design.md`

**Working directory:** `frontend/`（特記なき限り `cd frontend` してから）。

---

## Task 1: 月の初期値を翌月にし、StaffApp の年補正を削除する

**Files:**
- Modify: `frontend/src/store/AppContext.tsx`
- Modify: `frontend/src/components/StaffApp.tsx`
- Test: `frontend/src/store/AppContext.test.tsx`（新規）

- [ ] **Step 1: AppContext のテストファイルを作成して失敗テストを書く**

新規ファイル `frontend/src/store/AppContext.test.tsx`:

```tsx
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextMonthIso } from './AppContext';

describe('nextMonthIso', () => {
  beforeEach(() => {
    // Vitest の fake timers で「実機の今」を 2026-06-28 に固定する。
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 28));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('実機が 6 月のとき 2026-07 を返す', () => {
    expect(nextMonthIso()).toBe('2026-07');
  });

  it('実機が 12 月のとき翌年 01 月を返す', () => {
    vi.setSystemTime(new Date(2026, 11, 1));
    expect(nextMonthIso()).toBe('2027-01');
  });
});
```

ファイル先頭に `import { vi } from 'vitest';` を追加する。

- [ ] **Step 2: テストを実行して失敗を確認**

```cmd
cd frontend
npx vitest run src/store/AppContext.test.tsx
```

Expected: FAIL（`nextMonthIso is not exported from './AppContext'`）

- [ ] **Step 3: AppContext.tsx に nextMonthIso を実装し、currentMonthIso 利用箇所を差し替える**

`frontend/src/store/AppContext.tsx` の冒頭ヘルパー（13–18 行目あたり）を以下に置き換え：

```ts
/** 月選択をブラウザ間で持続させる localStorage キー。 */
const MONTH_STORAGE_KEY = 'akiyume-month';

/** 実機の翌月を 'YYYY-MM' で返す（12 月の翌は翌年 1 月）。 */
export function nextMonthIso(): string {
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
  return `${year}-${String(month).padStart(2, '0')}`;
}
```

同ファイル 169 行目あたり：

```ts
const [month, setMonthState] = useState<string>(() => getSetting(MONTH_STORAGE_KEY, nextMonthIso()));
```

旧 `currentMonthIso` 関数は削除する。

- [ ] **Step 4: nextMonthIso のテストが通ることを確認**

```cmd
npx vitest run src/store/AppContext.test.tsx
```

Expected: PASS

- [ ] **Step 5: StaffApp.tsx の年補正 useEffect を削除する**

`frontend/src/components/StaffApp.tsx` の 17–26 行目を以下に置き換える：

```tsx
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
```

`allowedYear` 変数と `useEffect` ブロックは丸ごと削除。`import { useEffect, useState } from 'react';` から `useEffect` も削除（他で使っていない）。

- [ ] **Step 6: フロント全体のテストが通ることを確認**

```cmd
npx vitest run
```

Expected: 既存テスト含めて全て PASS（年補正に依存するテストはないはず）

- [ ] **Step 7: 型チェック**

```cmd
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 8: コミット**

```cmd
git add frontend/src/store/AppContext.tsx frontend/src/store/AppContext.test.tsx frontend/src/components/StaffApp.tsx
git commit -m "fix(month): 初期月を実機の翌月にし、StaffApp の年補正を削除"
```

---

## Task 2: 「先月と同じ」ボタンを下線テキストリンク風に作り直す

**Files:**
- Modify: `frontend/src/styles.css:3856-3881`

- [ ] **Step 1: `.rk-shift-staff__copy` 系セレクタを書き換える**

`frontend/src/styles.css` の `.rk-shift-staff__copy` ブロック（3856 行〜3881 行）を以下に置き換える：

```css
.rk-shift-staff__copy {
  display: inline;
  margin-left: 6px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--rk-text-muted);
  font-size: 11px;
  line-height: 1.4;
  text-decoration: underline dotted;
  cursor: pointer;
  white-space: nowrap;
  transition: color 120ms ease, text-decoration-style 120ms ease;
}

.rk-shift-staff__copy:hover,
.rk-shift-staff__copy:focus-visible {
  color: var(--rk-text);
  text-decoration: underline solid;
  outline: none;
}

.rk-shift-staff-row--large .rk-shift-staff__copy {
  font-size: 12px;
}
```

- [ ] **Step 2: 開発サーバで見た目を目視確認するためテスト実行**

```cmd
npx vitest run src/components/manager/ShiftStaffRow.test.tsx
```

Expected: PASS（マークアップは変えていないので既存テストはそのまま通る）

- [ ] **Step 3: コミット**

```cmd
git add frontend/src/styles.css
git commit -m "style(shift-table): 「先月と同じ」ボタンを下線テキストリンク風に統一"
```

---

## Task 3: `ShiftStaffRow` に `shiftMode` プロップを追加し描画を分岐させる

**Files:**
- Modify: `frontend/src/components/manager/ShiftStaffRow.tsx`
- Modify: `frontend/src/components/manager/ShiftStaffRow.test.tsx`

- [ ] **Step 1: ShiftStaffRow.test.tsx に「assignment モードで点線のみ・空セルに+」テストを追記**

`frontend/src/components/manager/ShiftStaffRow.test.tsx` の `describe('ShiftStaffRow', () => {` 内、最初の `it` の前に以下を追加：

```tsx
  it('shiftMode="assignment" で希望のみ描画し、ベタ塗り割当は出ない', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[{ staffId: '1', date, slot: 'early' }]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="assignment"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText('早番', { selector: '.rk-shift-chip--request' }))
      .toBeInTheDocument();
    expect(screen.queryByText('早番', { selector: '.rk-shift-chip--assigned' }))
      .not.toBeInTheDocument();
  });

  it('shiftMode="confirmed" でベタ塗り割当のみ描画し、希望は出ない', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[{ staffId: '1', date, slot: 'early' }]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="confirmed"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );
    expect(screen.queryByText('早番', { selector: '.rk-shift-chip--request' }))
      .not.toBeInTheDocument();
    expect(screen.getByText('早番', { selector: '.rk-shift-chip--assigned' }))
      .toBeInTheDocument();
  });

  it('shiftMode="readonly" でチップを <span> で描画する', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[{ staffId: '1', date, slot: 'early' }]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="readonly"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );
    const requestChip = screen.getByText('早番', { selector: '.rk-shift-chip--request' });
    const assignedChip = screen.getByText('早番', { selector: '.rk-shift-chip--assigned' });
    expect(requestChip.tagName).toBe('SPAN');
    expect(assignedChip.tagName).toBe('SPAN');
  });
```

既存の最初のテスト「氏名、月間時間、希望、確定シフト、勤務メモを分けて表示する」は両チップが見えることを期待しているので、`shiftMode="readonly"` を渡すように修正する：

```tsx
            shiftMode="readonly"
```

を `density="standard"` の直後に追加。

既存テスト2つ目（「希望シフトと勤務メモを個別に非表示にできる」）と 3 つ目（「シフトパターンとタスクを個別に非表示にできる」）にも同様に `shiftMode="readonly"` を追加する（layers の `showRequests` などを尊重しつつチップが現れる挙動を残すため）。

- [ ] **Step 2: テストを実行して新規 3 件が失敗することを確認**

```cmd
npx vitest run src/components/manager/ShiftStaffRow.test.tsx
```

Expected: 新規 3 件が「Property 'shiftMode' is missing」または描画分岐がないため FAIL

- [ ] **Step 3: ShiftStaffRow.tsx に `shiftMode` プロップと描画分岐を実装**

`frontend/src/components/manager/ShiftStaffRow.tsx` の `interface ShiftStaffRowProps` の末尾（44 行目あたり）に追加：

```ts
  /**
   * シフトモード。'assignment' は点線希望のみ、'confirmed' はベタ塗り割当のみ、
   * 'readonly' は両方を <span> で描画する。
   */
  shiftMode?: 'assignment' | 'confirmed' | 'readonly';
  /** チップ・空セル「+」クリック時のエディタ起動。指定時のみクリック可能。 */
  onOpenEditor?: (input: { staffId: string; date: string; existing?: { slot: 'early' | 'late'; startTime: string | null; endTime: string | null } }) => void;
```

`export function ShiftStaffRow({ ... })` の引数分割代入に追加：

```ts
  shiftMode = 'assignment',
  onOpenEditor,
```

dates.map のループ内（112 行目以降）を以下のように書き換える：

```tsx
      {dates.map((date) => {
        const cell = getShiftCellModel({
          staffId: person.id,
          date,
          requests,
          assignments,
          notes,
        });
        const showRequest = shiftMode !== 'confirmed'
          && cell.request
          && (shiftMode === 'readonly' || layers.showRequests)
          && layers.visibleSlots[cell.request.slot];
        const showAssignment = shiftMode !== 'assignment'
          && cell.assignment
          && layers.visibleSlots[cell.assignment.slot];
        const patternSource: WorkSlot | null = showAssignment && cell.assignment && isWorkSlot(cell.assignment.slot)
          ? cell.assignment.slot
          : showRequest && cell.request && isWorkSlot(cell.request.slot)
            ? cell.request.slot
            : null;
        const taskSource: WorkSlot | null = showAssignment && cell.assignment && isWorkSlot(cell.assignment.slot)
          ? cell.assignment.slot
          : null;

        const isEmpty = !showRequest && !showAssignment;
        const interactive = shiftMode !== 'readonly';

        function openEditorForRequest() {
          if (!onOpenEditor || !cell.request) return;
          onOpenEditor({ staffId: person.id, date });
        }

        function openEditorForAssignment() {
          if (!onOpenEditor || !cell.assignment) return;
          onOpenEditor({
            staffId: person.id,
            date,
            existing: {
              slot: cell.assignment.slot as WorkSlot,
              startTime: cell.assignment.startTime,
              endTime: cell.assignment.endTime,
            },
          });
        }

        return (
          <td className="rk-shift-cell" key={date}>
            {showRequest && cell.request && (
              interactive && cell.request.slot !== 'off' ? (
                <button
                  type="button"
                  className={['rk-shift-chip', 'rk-shift-chip--request', slotClass(cell.request.slot)].join(' ')}
                  aria-label={`${person.name} ${date} ${cell.request.label}を編集`}
                  onClick={openEditorForRequest}
                >
                  {cell.request.label}
                </button>
              ) : (
                <span className={['rk-shift-chip', 'rk-shift-chip--request', slotClass(cell.request.slot)].join(' ')}>
                  {cell.request.label}
                </span>
              )
            )}

            {showAssignment && cell.assignment && (
              interactive ? (
                <button
                  type="button"
                  className={['rk-shift-chip', 'rk-shift-chip--assigned', slotClass(cell.assignment.slot)].join(' ')}
                  aria-label={`${person.name} ${date} ${cell.assignment.label}を編集`}
                  onClick={openEditorForAssignment}
                >
                  {cell.assignment.label}
                </button>
              ) : (
                <span className={['rk-shift-chip', 'rk-shift-chip--assigned', slotClass(cell.assignment.slot)].join(' ')}>
                  {cell.assignment.label}
                </span>
              )
            )}

            {isEmpty && interactive && shiftMode === 'assignment' && onOpenEditor && (
              <button
                type="button"
                className="rk-shift-cell__empty"
                aria-label={`${person.name} ${date} に割当を追加`}
                onClick={() => onOpenEditor({ staffId: person.id, date })}
              >
                ＋
              </button>
            )}

            {layers.showPatterns && patternSource && (
              <span className="rk-shift-cell__pattern">
                {patternTime(shiftPatterns, patternSource)}
              </span>
            )}

            {layers.showTasks && taskSource && (
              <span className="rk-shift-cell__task">
                {taskLabel(taskSource)}
              </span>
            )}

            {layers.showNotes && cell.note && (
              <span className="rk-shift-cell__note">{cell.note}</span>
            )}
          </td>
        );
      })}
```

旧 `onToggleAssignment` / `onOpenAssignTimeModal` プロップは Task 4 の終わりまでは引数として残しておいてよい（型エラー回避のため、型は維持。本体からの利用は削除済み）。

- [ ] **Step 4: テストが通ることを確認**

```cmd
npx vitest run src/components/manager/ShiftStaffRow.test.tsx
```

Expected: PASS

- [ ] **Step 5: 型チェック**

```cmd
npx tsc --noEmit
```

Expected: エラーなし（`onToggleAssignment` を引き続き受け取る型は残る）

- [ ] **Step 6: コミット**

```cmd
git add frontend/src/components/manager/ShiftStaffRow.tsx frontend/src/components/manager/ShiftStaffRow.test.tsx
git commit -m "feat(shift-table): ShiftStaffRow に shiftMode 分岐と onOpenEditor を実装"
```

---

## Task 4: `ShiftTable` を `ShiftCellEditorModal` 起動に統一する

**Files:**
- Modify: `frontend/src/components/manager/ShiftTable.tsx`
- Modify: `frontend/src/components/manager/ShiftTable.test.tsx`

- [ ] **Step 1: ShiftTable.test.tsx に「readonly モードでは + ボタンが描画されない」テストを追加**

`frontend/src/components/manager/ShiftTable.test.tsx` を確認して、既存テストの末尾に以下を追加（既存の import で足りなければ調整）：

```tsx
  it('shiftMode="readonly" のとき空セルに「+」ボタンが出ない', () => {
    render(
      <ShiftTable
        dates={['2026-07-01']}
        staff={[person]}
        requests={[]}
        assignments={[]}
        notes={[]}
        storeNotes={[]}
        positionNotes={{}}
        layers={DEFAULT_SHIFT_LAYERS}
        density="standard"
        sortMode="default"
        salesTarget={0}
        requiredByBand={() => ({ early: 0, late: 0 })}
        shiftMode="readonly"
        onToggleAssignment={() => {}}
        onStoreNoteChange={() => {}}
        onPositionNoteChange={() => {}}
        onSortChange={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: /割当を追加/ })).not.toBeInTheDocument();
  });
```

`person` 定数の定義が既存テストに無ければ追加：

```tsx
const person = { id: '1', name: '田中太郎', storeId: '1', employmentType: '正社員' as const, role: 'STAFF' as const };
```

- [ ] **Step 2: テストを実行して失敗を確認**

```cmd
npx vitest run src/components/manager/ShiftTable.test.tsx
```

Expected: FAIL（`shiftMode` プロップが存在しないか描画が変わっていない）

- [ ] **Step 3: ShiftTable.tsx を編集して `shiftMode` 受け渡しとモーダル統一を実装**

`frontend/src/components/manager/ShiftTable.tsx` 全体を以下のように更新：

a) import 文の `AssignTimeModal` を削除し、`ShiftCellEditorModal` と関連型を追加：

```ts
import { ShiftCellEditorModal, type ShiftCellSaveData } from './ShiftCellEditorModal';
```

b) `ShiftTableProps` インターフェースを以下に置き換える（既存に対し `shiftMode`、`taskOptions`、`storeName`、`position`、`onSaveAssignmentDetails`、`onDeleteAssignment` を追加。`onToggleAssignment` は残置）：

```ts
interface ShiftTableProps {
  dates: string[];
  staff: Staff[];
  requests: ShiftRequest[];
  assignments: Assignment[];
  notes: DayNote[];
  storeNotes: StoreNote[];
  positionNotes: Record<string, string>;
  layers: ShiftLayerVisibility;
  density: ShiftTableDensity;
  sortMode: StaffSortMode;
  salesTarget: number;
  requiredByBand: (date: string) => RequiredByBand;
  visibleSummaryItems?: SummaryItemKey[];
  shiftMode?: 'assignment' | 'confirmed' | 'readonly';
  /** モーダル右上に表示する店舗名（無ければ '店舗'）。 */
  storeName?: string;
  /** モーダル右上に表示するポジション名（無ければ 'ホール'）。 */
  position?: string;
  /** タスクチェックボックスの選択肢。未指定なら空配列。 */
  taskOptions?: string[];
  onToggleAssignment: (
    date: string,
    slot: WorkSlot,
    staffId: string,
    assigned: boolean,
    startTime?: string | null,
    endTime?: string | null,
  ) => void;
  /** ShiftCellEditorModal で保存したときの永続化。confirmed/assignment 共通。 */
  onSaveAssignmentDetails?: (input: {
    date: string;
    slot: WorkSlot;
    staffId: string;
    startTime: string | null;
    endTime: string | null;
    tasks: string[];
    breaks: { startTime: string; endTime: string }[];
    workMemo: string;
  }) => void;
  onStoreNoteChange: (date: string, text: string) => void;
  onPositionNoteChange: (date: string, text: string) => void;
  onSortChange: (mode: StaffSortMode) => void;
  onCopyPreviousMonth?: (staffId: string) => void;
  slotHours?: Record<WorkSlot, number>;
  shiftPatterns?: ShiftPatterns;
}
```

c) コンポーネント本体の `assignTarget` state を以下に置き換える：

```ts
  const [editTarget, setEditTarget] = useState<{
    staffId: string;
    date: string;
    existing?: { slot: WorkSlot; startTime: string | null; endTime: string | null };
  } | null>(null);
  const targetStaff = editTarget ? staff.find((p) => p.id === editTarget.staffId) ?? null : null;

  function handleSave(data: ShiftCellSaveData) {
    if (!editTarget) return;
    if (data.mode === 'off') {
      if (editTarget.existing) {
        onToggleAssignment(
          editTarget.date,
          editTarget.existing.slot,
          editTarget.staffId,
          true,
          editTarget.existing.startTime,
          editTarget.existing.endTime,
        );
      }
      setEditTarget(null);
      return;
    }
    if (onSaveAssignmentDetails && data.slot && data.startTime && data.endTime) {
      onSaveAssignmentDetails({
        date: editTarget.date,
        slot: data.slot,
        staffId: editTarget.staffId,
        startTime: data.startTime,
        endTime: data.endTime,
        tasks: data.tasks,
        breaks: data.breaks,
        workMemo: data.workMemo,
      });
    }
    setEditTarget(null);
  }

  function handleDelete() {
    if (!editTarget?.existing) return;
    onToggleAssignment(
      editTarget.date,
      editTarget.existing.slot,
      editTarget.staffId,
      true,
      editTarget.existing.startTime,
      editTarget.existing.endTime,
    );
    setEditTarget(null);
  }

  function dateLabel(date: string): string {
    const parsed = new Date(`${date}T00:00:00`);
    const wd = ['日','月','火','水','木','金','土'][parsed.getDay()];
    return `${parsed.getDate()}(${wd})`;
  }
```

d) `<ShiftStaffRow>` の利用箇所を更新：

```tsx
          {visibleStaff.map((person) => (
            <ShiftStaffRow
              key={person.id}
              person={person}
              dates={dates}
              requests={requests}
              assignments={assignments}
              notes={notes}
              layers={layers}
              density={density}
              shiftMode={shiftMode}
              slotHours={slotHours}
              shiftPatterns={shiftPatterns}
              onToggleAssignment={onToggleAssignment}
              onOpenEditor={(input) => setEditTarget(input)}
              onCopyPreviousMonth={onCopyPreviousMonth}
            />
          ))}
```

e) 末尾のモーダル描画を `ShiftCellEditorModal` に置き換える：

```tsx
      {targetStaff && editTarget && (
        <ShiftCellEditorModal
          open
          staffName={targetStaff.name}
          storeName={storeName ?? '店舗'}
          position={position ?? 'ホール'}
          dateLabel={dateLabel(editTarget.date)}
          employmentType={targetStaff.employmentType}
          patterns={shiftPatterns ?? DEFAULT_SHIFT_PATTERNS}
          taskOptions={taskOptions ?? []}
          initial={editTarget.existing && editTarget.existing.startTime && editTarget.existing.endTime
            ? {
                startTime: editTarget.existing.startTime,
                endTime: editTarget.existing.endTime,
                tasks: [],
                breaks: [],
                workMemo: '',
              }
            : undefined}
          isEditing={Boolean(editTarget.existing)}
          onSave={handleSave}
          onDelete={editTarget.existing ? handleDelete : undefined}
          onClose={() => setEditTarget(null)}
        />
      )}
```

f) `const wide = ...` の前後で `shiftMode = 'assignment'` のデフォルトを引数分割代入に追加：

```ts
  shiftMode = 'assignment',
  storeName,
  position,
  taskOptions,
  onSaveAssignmentDetails,
```

- [ ] **Step 4: テストが通ることを確認**

```cmd
npx vitest run src/components/manager/ShiftTable.test.tsx
```

Expected: PASS

- [ ] **Step 5: 型チェック**

```cmd
npx tsc --noEmit
```

Expected: エラーなし（`AssignTimeModal` の import を消したため、未使用検知が出れば該当行を削除する）

- [ ] **Step 6: コミット**

```cmd
git add frontend/src/components/manager/ShiftTable.tsx frontend/src/components/manager/ShiftTable.test.tsx
git commit -m "feat(shift-table): ShiftTable をShiftCellEditorModal起動に統一"
```

---

## Task 5: `ManagerShiftScreen` と `SharedView` から `shiftMode` を伝搬する

**Files:**
- Modify: `frontend/src/components/manager/ManagerShiftScreen.tsx`
- Modify: `frontend/src/components/SharedView.tsx`

- [ ] **Step 1: ManagerShiftScreen.tsx でタスク選択肢の定数を定義**

`frontend/src/components/manager/ManagerShiftScreen.tsx` の `function ManagerShiftScreen` の直前に追加：

```ts
const DEFAULT_TASK_OPTIONS = ['開店作業', '閉店作業', 'レジ', '清掃', '発注', '研修'];
```

- [ ] **Step 2: ShiftTable に shiftMode と taskOptions・saveAssignmentDetails を渡す**

`frontend/src/components/manager/ManagerShiftScreen.tsx` 内の `<ShiftTable ... />` 利用箇所（469 行目以降）を以下に変更（既存プロップの直前または直後に追加）：

```tsx
        <ShiftTable
          dates={dates}
          staff={visibleStaff}
          requests={requests}
          assignments={assignments}
          notes={dayNotes}
          storeNotes={storeNotes}
          positionNotes={positionNotes}
          layers={layers}
          density={density}
          sortMode={sortMode}
          salesTarget={salesTarget}
          requiredByBand={requiredByBand}
          visibleSummaryItems={visibleSummaryItems}
          shiftMode={shiftMode}
          storeName={stores.find((s) => String(s.id) === String(storeId))?.name ?? '店舗'}
          position={position}
          taskOptions={DEFAULT_TASK_OPTIONS}
          onToggleAssignment={(date, slot, staffId, assigned, startTime, endTime) =>
            void toggleAssignment(date, slot, staffId, assigned, startTime, endTime)}
          onSaveAssignmentDetails={(input) => void saveAssignmentDetails(input)}
          onStoreNoteChange={editStoreNote}
          onPositionNoteChange={editPositionNote}
          onSortChange={setSortMode}
          onCopyPreviousMonth={(staffId) => void handleCopyPreviousMonth(staffId)}
          slotHours={slotHours}
          shiftPatterns={shiftPatterns}
        />
```

`useApp()` の分割代入に `saveAssignmentDetails` を追加（既に AppContext で公開済み）。

- [ ] **Step 3: SharedView.tsx で shiftMode="readonly" を渡す**

`frontend/src/components/SharedView.tsx` の `<ShiftTable ... />`（46–75 行目）に `shiftMode="readonly"` を追加：

```tsx
      <ShiftTable
        dates={dates}
        staff={[mySelf, ...others]}
        requests={requests}
        assignments={assignments}
        notes={dayNotes}
        storeNotes={[]}
        positionNotes={{}}
        layers={{
          showSummary: false,
          pinHeader: false,
          onlyAssigned: false,
          showPatterns: true,
          showRequests: false,
          showTasks: true,
          showNotes: true,
          visibleSlots: { early: true, late: true, any: true, off: true },
        }}
        density="small"
        sortMode="default"
        salesTarget={0}
        requiredByBand={(date) => requiredForDate(DEFAULT_WEEKDAY_REQUIRED, date)}
        visibleSummaryItems={[]}
        shiftMode="readonly"
        onToggleAssignment={() => { /* read-only */ }}
        onStoreNoteChange={() => { /* read-only */ }}
        onPositionNoteChange={() => { /* read-only */ }}
        onSortChange={() => { /* read-only */ }}
      />
```

- [ ] **Step 4: 全テストと型チェック**

```cmd
npx vitest run
npx tsc --noEmit
```

Expected: ともに PASS

- [ ] **Step 5: コミット**

```cmd
git add frontend/src/components/manager/ManagerShiftScreen.tsx frontend/src/components/SharedView.tsx
git commit -m "feat(shift-table): ManagerShiftScreenはモード連動、SharedViewは読取専用"
```

---

## Task 6: `AssignTimeModal` と関連テストを削除する

**Files:**
- Delete: `frontend/src/components/manager/AssignTimeModal.tsx`
- Delete: `frontend/src/components/manager/AssignTimeModal.test.tsx`

- [ ] **Step 1: 残った参照がないことを確認**

```cmd
cd ..
grep -rn "AssignTimeModal" frontend/src
```

Expected: 出力なし（Task 4 で全部消えているはず）

- [ ] **Step 2: ファイル削除**

```cmd
git rm frontend/src/components/manager/AssignTimeModal.tsx
git rm frontend/src/components/manager/AssignTimeModal.test.tsx
```

- [ ] **Step 3: 全テストと型チェック**

```cmd
cd frontend
npx vitest run
npx tsc --noEmit
```

Expected: ともに PASS

- [ ] **Step 4: コミット**

```cmd
git commit -m "refactor(shift-table): AssignTimeModalを廃止してShiftCellEditorModalに統一"
```

---

## Task 7: `ShiftCellEditorModal` のテストを追加する

**Files:**
- Create: `frontend/src/components/manager/ShiftCellEditorModal.test.tsx`

- [ ] **Step 1: テストファイルを作成**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHIFT_PATTERNS } from '../../lib/shiftPatterns';
import { ShiftCellEditorModal } from './ShiftCellEditorModal';

const defaultProps = {
  open: true,
  staffName: '田中太郎',
  storeName: '中島店',
  position: 'ホール',
  dateLabel: '7/1(水)',
  employmentType: '正社員' as const,
  patterns: DEFAULT_SHIFT_PATTERNS,
  taskOptions: ['開店作業', '閉店作業', 'レジ'],
  isEditing: false,
  onSave: () => {},
  onClose: () => {},
};

describe('ShiftCellEditorModal', () => {
  it('open=false なら何もレンダーされない', () => {
    render(<ShiftCellEditorModal {...defaultProps} open={false} />);
    expect(screen.queryByLabelText('勤務開始時刻')).not.toBeInTheDocument();
  });

  it('initial 未指定なら 10:00-18:00 の初期値が入る', () => {
    render(<ShiftCellEditorModal {...defaultProps} />);
    expect(screen.getByLabelText('勤務開始時刻')).toHaveValue('10:00');
    expect(screen.getByLabelText('勤務終了時刻')).toHaveValue('18:00');
  });

  it('initial 指定なら既存値を反映する', () => {
    render(
      <ShiftCellEditorModal
        {...defaultProps}
        isEditing
        initial={{ startTime: '09:30', endTime: '17:30', tasks: ['レジ'], breaks: [], workMemo: 'メモ' }}
      />,
    );
    expect(screen.getByLabelText('勤務開始時刻')).toHaveValue('09:30');
    expect(screen.getByLabelText('勤務終了時刻')).toHaveValue('17:30');
    expect(screen.getByLabelText('レジ')).toBeChecked();
    expect(screen.getByDisplayValue('メモ')).toBeInTheDocument();
  });

  it('「休み」タブで保存すると mode=off で onSave が呼ばれる', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<ShiftCellEditorModal {...defaultProps} onSave={onSave} />);
    await user.click(screen.getByRole('tab', { name: '休み' }));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).toHaveBeenCalledWith({ mode: 'off', tasks: [], breaks: [], workMemo: '' });
  });

  it('正社員には「シフトパターン入力」タブが出る', () => {
    render(<ShiftCellEditorModal {...defaultProps} employmentType="正社員" />);
    expect(screen.getByRole('tab', { name: 'シフトパターン入力' })).toBeInTheDocument();
  });

  it('パートには「シフトパターン入力」タブが出ない', () => {
    render(<ShiftCellEditorModal {...defaultProps} employmentType="パート" />);
    expect(screen.queryByRole('tab', { name: 'シフトパターン入力' })).not.toBeInTheDocument();
  });

  it('isEditing=true かつ onDelete 指定で「削除」ボタンが出る', () => {
    render(<ShiftCellEditorModal {...defaultProps} isEditing onDelete={() => {}} />);
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('保存ボタンを押すと現在の時刻と slot で onSave が呼ばれる', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<ShiftCellEditorModal {...defaultProps} onSave={onSave} />);
    // 既定 10:00-18:00 のまま保存
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'time',
      slot: 'early',
      startTime: '10:00',
      endTime: '18:00',
    }));
  });
});
```

- [ ] **Step 2: テストを実行して通ることを確認**

```cmd
npx vitest run src/components/manager/ShiftCellEditorModal.test.tsx
```

Expected: PASS（モーダル実装は既存）

- [ ] **Step 3: コミット**

```cmd
git add frontend/src/components/manager/ShiftCellEditorModal.test.tsx
git commit -m "test(shift-table): ShiftCellEditorModalのテストを追加"
```

---

## Task 8: SharedView のテストで読取専用を保証する

**Files:**
- Modify: `frontend/src/components/SharedView.test.tsx`

- [ ] **Step 1: SharedView.test.tsx の現状を確認**

```cmd
cd C:/Users/User/shift-app
type frontend\src\components\SharedView.test.tsx
```

- [ ] **Step 2: 「他人の行のチップが <span> でクリックしてもハンドラが呼ばれない」テストを追加**

`describe('SharedView', () => {` 内の最後の `it` の直後に以下を追加（既存 mock 構成に合わせて `useApp` を差し替える既存 helper があれば再利用、なければ inline で同様に構築）：

```tsx
  it('他人の行のチップは <span> でクリックしてもハンドラを呼ばない', async () => {
    const user = userEvent.setup();
    const toggleAssignment = vi.fn();
    // 既存テストの useApp モック作成箇所を踏襲して、me=自分・staff=2名・assignments=他人にのみ早番、shiftPlanStatus=PUBLISHED を返す。
    mockApp({
      me: { id: 1, name: '自分' },
      staff: [
        { id: '1', name: '自分', storeId: '1', employmentType: '正社員', role: 'STAFF' },
        { id: '2', name: '山田花子', storeId: '1', employmentType: 'パート', role: 'STAFF' },
      ],
      assignments: [{ date: '2026-07-01', slot: 'early', staffIds: ['2'] }],
      requests: [],
      dayNotes: [],
      storeId: '1',
      shiftPlanStatus: 'PUBLISHED',
      toggleAssignment,
    });

    render(<SharedView year={2026} month={7} />);
    const chip = screen.getByText('早番', { selector: '.rk-shift-chip--assigned' });
    expect(chip.tagName).toBe('SPAN');
    await user.click(chip);
    expect(toggleAssignment).not.toHaveBeenCalled();
  });
```

`mockApp` ヘルパー名は既存テスト内の関数名に合わせて読み替える（既存テストが `useApp` を直接 `vi.mock` していればその構造を使う）。

- [ ] **Step 3: テストが通ることを確認**

```cmd
cd frontend
npx vitest run src/components/SharedView.test.tsx
```

Expected: PASS

- [ ] **Step 4: コミット**

```cmd
git add frontend/src/components/SharedView.test.tsx
git commit -m "test(shared-view): 他人のチップが読取専用であることを保証"
```

---

## Task 9: 最終確認

**Files:** なし（コマンド実行のみ）

- [ ] **Step 1: 全フロントテスト**

```cmd
cd frontend
npx vitest run
```

Expected: 全 PASS

- [ ] **Step 2: 型チェック**

```cmd
npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 3: 本番ビルド**

```cmd
npm run build
```

Expected: ビルド成功

- [ ] **Step 4: 手動確認チェックリスト**

`mvnw.cmd spring-boot:run` でバックエンドを起動し、別ターミナルで `npm run dev` を起動して以下を確認：

1. ブラウザの localStorage で `akiyume-month` を削除して再ロード → シフト表が **2026-07** で開く（実機が 2026-06 のため）。
2. 矢印で 8 月へ移動 → リロード → 8 月のまま。
3. ヘッダの「モデルシフト」など別セクションを開いて「シフト表へ戻る」→ 8 月のまま。
4. assignment モードで点線「早番」希望をクリック → ShiftCellEditorModal が新規モードで開く。10:00-18:00 のまま保存 → 「確定シフト」モードに切り替えるとベタ塗りで現れる。
5. 同じセルが assignment モードに戻すと（希望は消費されたので）何も表示されない or 空セル「+」が出る。
6. confirmed モードでベタ塗りをクリック → 編集モーダル（削除ボタン付き）が開く。削除 → ベタ塗りが消える。
7. スタッフでログインし「シフト確定」タブを開く → 自分の行と他人（山田花子）の行が見える。両方ともセルをクリックしても何も起きない。`+` ボタンは出ない。
8. 「先月と同じ」ボタンが下線テキストとしてスタッフ名の右にインライン表示され、ホバーで色が濃くなる。

- [ ] **Step 5: 手動確認の結果を要約してコミット**

問題が無ければ追加コミットなし。バグが見つかれば該当 Task に戻る。

---

## Self-Review Notes

- spec のセクション 1〜5 はそれぞれ Task 1, 2, 3-4-5, 5(SharedView), 7-8 に対応している。
- spec で `AssignTimeModal` を削除する宣言は Task 6 で実現している。
- `shiftMode` プロップは `ShiftStaffRow` / `ShiftTable` 間で同名同型（`'assignment' | 'confirmed' | 'readonly'`）で一貫している。
- `onSaveAssignmentDetails` の引数は `AppContext` の `saveAssignmentDetails` と同型。
- `taskOptions` の暫定リストは `ManagerShiftScreen` で `DEFAULT_TASK_OPTIONS` として定数化（spec 通り）。
- 月の翌月計算は 12 月 → 翌年 1 月の境界を Task 1 のテストで検証している。
