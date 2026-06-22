# らくしふ風シフト管理UI 全面刷新 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存のデータ層・バックエンドを温存したまま、フロントエンドUIを参照スクショ（らくしふ店長マトリクス画面）に忠実な見た目へ全面刷新する。

**Architecture:** データ層（`types.ts` / `store/` / `api/client.ts`）と Spring Boot バックエンドは変更しない。`styles.css` のデザイントークンを差し替え、`ManagerMatrix` / `RequestEditor` / `SharedView` / `MonthCalendar` / `Header` を新配色・新レイアウトに作り替える。総労働時間・人件費の算出は純粋関数として `store/labor.ts` に切り出し、TDDで実装する。

**Tech Stack:** React 18 + Vite + TypeScript、Vitest + Testing Library、プレーンCSS（CSS変数）。

---

## 設計参照

- 設計ドキュメント: `docs/superpowers/specs/2026-06-22-rakushifu-style-ui-design.md`
- 参照UI: `要件定義/スクリーンショット 2026-06-22 111638.png` / `…111747.png`
- 確定事項: 早番=赤/ピンク・遅番=青・休み=グレー。中番は入れない。配色はスクショ通り（要件のオレンジは不採用）。

## ファイル構成

| 種別 | パス | 責務 |
|---|---|---|
| 作成 | `frontend/src/store/labor.ts` | 日次総労働時間・日次人件費・スタッフ月間労働時間の純粋関数 |
| 作成 | `frontend/src/store/labor.test.ts` | 上記のユニットテスト |
| 変更 | `frontend/src/constants.ts` | `SLOT_HOURS` / `HOURLY_WAGE` 定数を追加 |
| 変更 | `frontend/src/styles.css` | デザイントークン・チップ・マトリクス・曜日色・ツールバーのCSS刷新 |
| 変更 | `frontend/src/components/MonthCalendar.tsx` | 曜日色分けクラスを付与 |
| 変更 | `frontend/src/components/ManagerMatrix.tsx` | 集計行＋スタッフ行のらくしふ風マトリクス＋ツールバー |
| 変更 | `frontend/src/components/ManagerMatrix.test.tsx` | 新DOM（総労働時間・人件費）に追従 |
| 変更 | `frontend/src/components/RequestEditor.tsx` | チップ表記をフルラベル化（早番/遅番/休み） |
| 変更 | `frontend/src/components/SharedView.tsx` | 新チップ言語に追従（アイコン除去・フルラベル） |
| 変更 | `frontend/src/components/Header.tsx` | 上部バーを白基調に（CSSのみで対応可、必要時に微修正） |
| 変更 | `frontend/src/components/ui/Legend.tsx` | 凡例ラベルを新配色に合わせる |

---

## Task 1: 労働時間・人件費の純粋関数（TDD）

**Files:**
- Modify: `frontend/src/constants.ts`
- Create: `frontend/src/store/labor.ts`
- Test: `frontend/src/store/labor.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

Create `frontend/src/store/labor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { dailyWorkHours, dailyLaborCost, staffMonthlyHours } from './labor';
import type { Assignment } from '../types';

const A: Assignment[] = [
  { date: '2026-07-01', slot: 'early', staffIds: ['1', '2'] },
  { date: '2026-07-01', slot: 'late', staffIds: ['3'] },
  { date: '2026-07-02', slot: 'early', staffIds: ['1'] },
];

describe('labor', () => {
  it('dailyWorkHours: 1日の割り当てコマ数×1コマ9hを合計する', () => {
    // 2026-07-01: early2人 + late1人 = 3コマ × 9h = 27h
    expect(dailyWorkHours(A, '2026-07-01')).toBe(27);
    expect(dailyWorkHours(A, '2026-07-02')).toBe(9);
    expect(dailyWorkHours(A, '2026-07-03')).toBe(0);
  });

  it('dailyLaborCost: 総労働時間×仮時給1100円', () => {
    expect(dailyLaborCost(A, '2026-07-01')).toBe(27 * 1100);
    expect(dailyLaborCost(A, '2026-07-03')).toBe(0);
  });

  it('staffMonthlyHours: スタッフの割り当てコマを月内で合計する', () => {
    // staff '1': 07-01 early(9h) + 07-02 early(9h) = 18h
    expect(staffMonthlyHours(A, '1', ['2026-07-01', '2026-07-02', '2026-07-03'])).toBe(18);
    expect(staffMonthlyHours(A, '3', ['2026-07-01', '2026-07-02'])).toBe(9);
    expect(staffMonthlyHours(A, '99', ['2026-07-01'])).toBe(0);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd frontend && npx vitest run src/store/labor.test.ts`
Expected: FAIL（`labor.ts` / 関数が未定義）

- [ ] **Step 3: 定数を追加**

Edit `frontend/src/constants.ts` — 末尾に追記:

```ts
/** 1コマあたりの労働時間（早番 7:00-16:00 / 遅番 15:00-24:00 をデモ用に各9hとみなす） */
export const SLOT_HOURS: Record<WorkSlot, number> = { early: 9, late: 9 };

/** デモ用の仮時給（円）。日次人件費の目安算出に使用 */
export const HOURLY_WAGE = 1100;
```

- [ ] **Step 4: 純粋関数を実装**

Create `frontend/src/store/labor.ts`:

```ts
import type { Assignment } from '../types';
import { WORK_SLOTS, SLOT_HOURS, HOURLY_WAGE } from '../constants';
import { isAssigned, countAssigned } from './assignments';

/** 指定日の総労働時間（全スロットの割り当て人数 × 1コマの時間） */
export function dailyWorkHours(assignments: Assignment[], date: string): number {
  return WORK_SLOTS.reduce(
    (sum, slot) => sum + countAssigned(assignments, date, slot) * SLOT_HOURS[slot],
    0,
  );
}

/** 指定日の人件費の目安（総労働時間 × 仮時給） */
export function dailyLaborCost(assignments: Assignment[], date: string): number {
  return dailyWorkHours(assignments, date) * HOURLY_WAGE;
}

/** 指定スタッフの月間労働時間（割り当てベース） */
export function staffMonthlyHours(
  assignments: Assignment[],
  staffId: string,
  dates: string[],
): number {
  let hours = 0;
  for (const date of dates) {
    for (const slot of WORK_SLOTS) {
      if (isAssigned(assignments, date, slot, staffId)) hours += SLOT_HOURS[slot];
    }
  }
  return hours;
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `cd frontend && npx vitest run src/store/labor.test.ts`
Expected: PASS（3件）

- [ ] **Step 6: コミット**

```bash
git add frontend/src/store/labor.ts frontend/src/store/labor.test.ts frontend/src/constants.ts
git commit -m "feat(frontend): 労働時間・人件費の算出関数を追加"
```

---

## Task 2: デザイントークンをらくしふ配色へ差し替え

**Files:**
- Modify: `frontend/src/styles.css:1-54`

- [ ] **Step 1: `:root` のパレットを置換**

Edit `frontend/src/styles.css` — 既存の `--primary` 〜 `--over` のパレット定義（おおむね 3〜19行目）を次に置換する。`old_string` は以下のブロック:

```css
  --primary: #4f46e5;
  --primary-dark: #4338ca;
  --primary-soft: #eef2ff;
  --bg: #f8fafc;
  --card: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --line: #e2e8f0;
  --early: #f59e0b;
  --early-soft: #fef3c7;
  --late: #6366f1;
  --late-soft: #e0e7ff;
  --off: #94a3b8;
  --off-soft: #f1f5f9;
  --low: #ef4444;
  --ok: #10b981;
  --over: #f59e0b;
```

`new_string`:

```css
  --primary: #2f80c4;
  --primary-dark: #246aa6;
  --primary-soft: #e7f1fb;
  --bg: #f4f5f7;
  --card: #ffffff;
  --text: #1f2933;
  --muted: #6b7785;
  --line: #d8dde3;
  --early: #d96a86;
  --early-soft: #fce6ec;
  --early-text: #a33a58;
  --late: #4a90d9;
  --late-soft: #e3f0fb;
  --late-text: #1f5d9e;
  --mid: #5c9e6a;
  --mid-soft: #e4f3e7;
  --mid-text: #2f7a42;
  --off: #9aa4b0;
  --off-soft: #eef1f4;
  --low: #d64545;
  --ok: #3fa45b;
  --over: #e08a2f;
  --c-sun: #d83a3a;
  --c-sat: #2f72c4;
```

- [ ] **Step 2: フォーカスリングの色をブルー基調に**

Edit `frontend/src/styles.css` — フォーカス可視化の `outline` を置換:

`old_string`:
```css
  outline: 3px solid rgba(79, 70, 229, .28);
  outline-offset: 2px;
```
`new_string`:
```css
  outline: 3px solid rgba(47, 128, 196, .32);
  outline-offset: 2px;
```

- [ ] **Step 3: ビルドで壊れていないことを確認**

Run: `cd frontend && npm run build`
Expected: ビルド成功（エラーなし）

- [ ] **Step 4: コミット**

```bash
git add frontend/src/styles.css
git commit -m "style(frontend): デザイントークンをらくしふ配色に差し替え"
```

---

## Task 3: チップ配色・曜日色分け（CSS + MonthCalendar）

**Files:**
- Modify: `frontend/src/styles.css:357-382`（チップ）, レスポンシブ近辺に曜日色を追記
- Modify: `frontend/src/components/MonthCalendar.tsx`
- Test: `frontend/src/components/MonthCalendar.test.tsx`（変更不要・回帰確認用）

- [ ] **Step 1: チップCSSを新配色に置換**

Edit `frontend/src/styles.css` — 既存のチップ色定義を置換。

`old_string`:
```css
.chip.early {
  background: var(--early-soft);
  color: #92400e;
}

.chip.late {
  background: var(--late-soft);
  color: #3730a3;
}

.chip.off {
  background: var(--off-soft);
  color: var(--muted);
}
```
`new_string`:
```css
.chip.early {
  background: var(--early-soft);
  color: var(--early-text);
}

.chip.late {
  background: var(--late-soft);
  color: var(--late-text);
}

.chip.mid {
  background: var(--mid-soft);
  color: var(--mid-text);
}

.chip.off {
  background: var(--off-soft);
  color: var(--muted);
}

.chip.clickable {
  cursor: pointer;
  transition: background var(--t), color var(--t), box-shadow var(--t), transform var(--t);
}

.chip.clickable:active {
  transform: scale(.97);
}

/* 割り当て確定はベタ塗りで表現 */
.chip.assigned.early {
  background: var(--early);
  color: #fff;
}

.chip.assigned.late {
  background: var(--late);
  color: #fff;
}
```

- [ ] **Step 2: 曜日色分けCSSを追記**

Edit `frontend/src/styles.css` — `/* ---- chips ---- */` ブロックの直前（`.chip {` の直前の行）に次を挿入する。

`old_string`:
```css
/* ---- chips ---- */
.chip {
```
`new_string`:
```css
/* ---- 曜日色分け ---- */
.cal-head.dow-sun,
.day-num.dow-sun,
.date-head.dow-sun .d-num,
.date-head.dow-sun .d-dow {
  color: var(--c-sun);
}

.cal-head.dow-sat,
.day-num.dow-sat,
.date-head.dow-sat .d-num,
.date-head.dow-sat .d-dow {
  color: var(--c-sat);
}

/* ---- chips ---- */
.chip {
```

- [ ] **Step 3: MonthCalendar に曜日クラスを付与**

Replace the full content of `frontend/src/components/MonthCalendar.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { getMonthDates, firstWeekdayOfMonth } from '../lib/date';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function dowClass(dow: number): string {
  if (dow === 0) return 'dow-sun';
  if (dow === 6) return 'dow-sat';
  return '';
}

interface MonthCalendarProps {
  year: number;
  month: number;
  renderCell: (date: string, day: number) => ReactNode;
  onCellClick?: (date: string) => void;
}

export function MonthCalendar({ year, month, renderCell, onCellClick }: MonthCalendarProps) {
  const dates = getMonthDates(year, month);
  const leading = firstWeekdayOfMonth(year, month);

  return (
    <div className="cal-grid">
      {WEEKDAYS.map((weekday, index) => (
        <div key={weekday} className={`cal-head ${dowClass(index)}`}>{weekday}</div>
      ))}
      {Array.from({ length: leading }).map((_, index) => (
        <div key={`empty-${index}`} className="cal-cell empty" />
      ))}
      {dates.map((date, index) => {
        const day = index + 1;
        const dow = (leading + index) % 7;
        const content = (
          <>
            <div className={`day-num ${dowClass(dow)}`}>{day}</div>
            {renderCell(date, day)}
          </>
        );

        return onCellClick ? (
          <button
            key={date}
            type="button"
            className="cal-cell"
            aria-label={`${date}を選択`}
            onClick={() => onCellClick(date)}
          >
            {content}
          </button>
        ) : (
          <div key={date} className="cal-cell">
            {content}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: MonthCalendar テストが通ることを確認**

Run: `cd frontend && npx vitest run src/components/MonthCalendar.test.tsx`
Expected: PASS（aria-label `2026-07-01を選択` は維持されている）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/styles.css frontend/src/components/MonthCalendar.tsx
git commit -m "style(frontend): チップ配色と曜日色分けを追加"
```

---

## Task 4: 店長マトリクスをらくしふ風に再構築

**Files:**
- Modify: `frontend/src/components/ManagerMatrix.test.tsx`
- Modify: `frontend/src/components/ManagerMatrix.tsx`
- Modify: `frontend/src/styles.css:443-612`（マトリクス節を置換）

- [ ] **Step 1: テストを新仕様に更新（先に失敗させる）**

Replace the full content of `frontend/src/components/ManagerMatrix.test.tsx` with:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider } from '../store/AppContext';
import { ManagerMatrix } from './ManagerMatrix';

function mockApi() {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const body = (data: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => data } as Response);
    if (url.includes('/api/auth/me')) return body({ id: 1, name: '山田（店長）', role: 'MANAGER', storeId: 1 });
    if (url.endsWith('/api/stores')) return body([{ id: 1, name: '中島店' }]);
    if (url.includes('/staff')) return body([{ id: 1, name: '山田（店長）', employmentType: '正社員', role: 'MANAGER' }]);
    if (url.includes('/requests')) return body([]);
    if (url.includes('/assignments')) return body([]);
    return body([]);
  });
}

describe('ManagerMatrix', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockApi(); });

  it('集計行（総労働時間・人件費）とスタッフ行を表示する', async () => {
    render(<AppProvider><ManagerMatrix year={2026} month={7} /></AppProvider>);
    await waitFor(() => expect(screen.getByText('山田（店長）')).toBeInTheDocument());
    expect(screen.getByText('総労働時間')).toBeInTheDocument();
    expect(screen.getByText('人件費(目安)')).toBeInTheDocument();
    expect(screen.getByText('早番')).toBeInTheDocument();
    expect(screen.getByText('遅番')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd frontend && npx vitest run src/components/ManagerMatrix.test.tsx`
Expected: FAIL（旧コンポーネントは「総労働時間」「人件費(目安)」を描画しない）

- [ ] **Step 3: ManagerMatrix を再構築**

Replace the full content of `frontend/src/components/ManagerMatrix.tsx` with:

```tsx
import { useApp } from '../store/AppContext';
import { getMonthDates } from '../lib/date';
import { getDayRequest } from '../store/requests';
import { isAssigned, countAssigned, fulfillmentLevel } from '../store/assignments';
import { dailyWorkHours, dailyLaborCost, staffMonthlyHours } from '../store/labor';
import { WORK_SLOTS, SLOT_LABELS, MAX_STAFF_PER_SLOT } from '../constants';
import { Legend } from './ui/Legend';
import type { DayRequestValue, WorkSlot } from '../types';

interface ManagerMatrixProps {
  year: number;
  month: number;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const REQUEST_LABEL: Record<DayRequestValue, string> = {
  none: '', early: '早番', late: '遅番', both: '早番', off: '休み',
};
const REQUEST_CLASS: Record<DayRequestValue, string> = {
  none: '', early: 'early', late: 'late', both: 'early', off: 'off',
};

function dow(date: string): number {
  return new Date(`${date}T00:00:00`).getDay();
}
function dowClass(date: string): string {
  const d = dow(date);
  if (d === 0) return 'dow-sun';
  if (d === 6) return 'dow-sat';
  return '';
}
function yen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`;
}

export function ManagerMatrix({ year, month }: ManagerMatrixProps) {
  const { staff, requests, assignments, toggleAssignment } = useApp();
  const dates = getMonthDates(year, month);

  if (staff.length === 0) {
    return <section className="empty"><p>この店舗のスタッフがいません。</p></section>;
  }

  return (
    <section className="matrix-section">
      <div className="matrix-toolbar">
        <div className="view-tabs" role="tablist" aria-label="表示単位">
          <button type="button" role="tab" aria-selected="false">日</button>
          <button type="button" role="tab" aria-selected="false">週</button>
          <button type="button" role="tab" aria-selected="false">半月</button>
          <button type="button" role="tab" aria-selected="true" className="active">月</button>
        </div>
        <div className="toolbar-actions">
          <span className="alert-badge" aria-label="未収アラート">未収アラート 1件</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨 印刷</button>
        </div>
      </div>

      <Legend />

      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="row-head sticky-col">スタッフ</th>
              {dates.map((date) => (
                <th key={date} className={`date-head ${dowClass(date)}`}>
                  <span className="d-num">{Number(date.slice(8, 10))}</span>
                  <span className="d-dow">{WEEKDAYS[dow(date)]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="summary-row">
              <td className="row-head sticky-col">総労働時間</td>
              {dates.map((date) => (
                <td key={date} className="summary-cell">{dailyWorkHours(assignments, date)}h</td>
              ))}
            </tr>
            <tr className="summary-row">
              <td className="row-head sticky-col">人件費(目安)</td>
              {dates.map((date) => (
                <td key={date} className="summary-cell cost">{yen(dailyLaborCost(assignments, date))}</td>
              ))}
            </tr>
            {WORK_SLOTS.map((slot) => (
              <tr key={slot} className="count-row">
                <td className="row-head sticky-col">{SLOT_LABELS[slot]}</td>
                {dates.map((date) => {
                  const count = countAssigned(assignments, date, slot);
                  const level = fulfillmentLevel(count);
                  return (
                    <td key={date} className={`count ${level}`}>
                      {count}/{MAX_STAFF_PER_SLOT}
                    </td>
                  );
                })}
              </tr>
            ))}
            {staff.map((person) => {
              const hours = staffMonthlyHours(assignments, person.id, dates);
              return (
                <tr key={person.id} className="staff-row">
                  <td className="row-head sticky-col staff-head">
                    <span className="staff-name">{person.name}</span>
                    <span className="staff-hours">{hours}h</span>
                  </td>
                  {dates.map((date) => {
                    const req = getDayRequest(requests, person.id, date);
                    const targetSlot: WorkSlot | null =
                      req === 'off' || req === 'none' ? null : req === 'late' ? 'late' : 'early';
                    const assigned = targetSlot
                      ? isAssigned(assignments, date, targetSlot, person.id) : false;
                    const toggle = () => {
                      if (!targetSlot) return;
                      void toggleAssignment(date, targetSlot, person.id, assigned);
                    };
                    return (
                      <td key={date} className={`shift-cell ${dowClass(date)}`}>
                        {req !== 'none' && (
                          <span
                            className={`chip ${REQUEST_CLASS[req]} ${assigned ? 'assigned' : ''} ${targetSlot ? 'clickable' : ''}`}
                            role={targetSlot ? 'button' : undefined}
                            tabIndex={targetSlot ? 0 : undefined}
                            aria-pressed={targetSlot ? assigned : undefined}
                            aria-label={targetSlot
                              ? `${person.name} ${date} ${SLOT_LABELS[targetSlot]} ${assigned ? '割り当て解除' : '割り当て'}`
                              : undefined}
                            onClick={toggle}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                toggle();
                              }
                            }}
                          >
                            {REQUEST_LABEL[req]}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: マトリクスCSSを置換**

Edit `frontend/src/styles.css` — `/* ---- manager matrix ---- */` から `.fill.over { background: var(--over); }` までのブロック全体（おおむね 443〜612行目、`.legend` 〜 `.fill.over` を含む）を、次の `new_string` に置換する。

`old_string`（このブロックの先頭〜末尾を厳密に一致させること。先頭は次の行）:
```css
/* ---- manager matrix ---- */
.matrix-section {
```
…末尾は…
```css
.fill.over {
  background: var(--over);
}
```

`new_string`（`.matrix-section` から `.count.over` までを丸ごと置き換える内容）:
```css
/* ---- manager matrix ---- */
.matrix-section {
  margin-top: 4px;
}

.matrix-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 4px 2px 10px;
}

.view-tabs {
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  overflow: hidden;
  background: #fff;
}

.view-tabs button {
  border: none;
  background: #fff;
  color: var(--muted);
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
  border-right: 1px solid var(--line);
}

.view-tabs button:last-child {
  border-right: none;
}

.view-tabs button.active {
  background: var(--primary);
  color: #fff;
  font-weight: 700;
}

.toolbar-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.alert-badge {
  font-size: 12px;
  font-weight: 700;
  color: var(--low);
  background: #fdeaea;
  border: 1px solid #f3c6c6;
  border-radius: 999px;
  padding: 4px 10px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 8px 2px 12px;
  font-size: 12px;
  color: var(--muted);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.dot.low { background: var(--low); }
.dot.ok { background: var(--ok); }
.dot.over { background: var(--over); }

.matrix-wrap {
  max-height: calc(100dvh - 230px);
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: #fff;
  box-shadow: var(--sh-sm);
}

.matrix {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  width: 100%;
}

.matrix th,
.matrix td {
  border-bottom: 1px solid var(--line);
  border-right: 1px solid var(--line);
  padding: 5px 6px;
  text-align: center;
  min-width: 46px;
}

.matrix thead th {
  position: sticky;
  top: 0;
  background: #f2f4f7;
  z-index: 2;
  font-weight: 700;
  color: var(--text);
}

.date-head .d-num {
  display: block;
  font-size: 13px;
  font-weight: 700;
}

.date-head .d-dow {
  display: block;
  font-size: 10px;
  color: var(--muted);
}

.row-head,
.sticky-col {
  text-align: left;
  white-space: nowrap;
  position: sticky;
  left: 0;
  background: #fff;
  z-index: 1;
  font-weight: 600;
  box-shadow: 1px 0 0 var(--line);
  min-width: 120px;
}

.matrix thead th.sticky-col {
  z-index: 3;
  background: #f2f4f7;
}

.summary-row td {
  background: #f8fafc;
  color: var(--muted);
  font-weight: 700;
  font-size: 12px;
}

.summary-row .row-head {
  background: #f8fafc;
}

.summary-cell.cost {
  color: var(--text);
  font-weight: 600;
}

.count-row td {
  background: #fbfcfd;
  font-weight: 700;
}

.count.low { color: var(--low); }
.count.ok { color: var(--ok); }
.count.over { color: var(--over); }

.staff-head .staff-name {
  display: block;
  font-weight: 700;
  color: var(--text);
}

.staff-head .staff-hours {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.shift-cell {
  padding: 4px;
}

.shift-cell.dow-sun { background: #fdf4f4; }
.shift-cell.dow-sat { background: #f3f7fb; }
```

注: 旧 `.cell-btn*` / `.staff-name` / `.count-num` / `.fill*` のルールはこの置換で削除される。これらは新DOMで未使用のため問題ない。`.shared-slot` 以降のルール（614行目以降）は残す。

- [ ] **Step 5: テスト・型・ビルドを確認**

Run: `cd frontend && npx vitest run src/components/ManagerMatrix.test.tsx && npx tsc --noEmit && npm run build`
Expected: テストPASS、型エラーなし、ビルド成功

- [ ] **Step 6: コミット**

```bash
git add frontend/src/components/ManagerMatrix.tsx frontend/src/components/ManagerMatrix.test.tsx frontend/src/styles.css
git commit -m "feat(frontend): 店長マトリクスをらくしふ風に再構築"
```

---

## Task 5: スタッフ希望提出・共有ビューのチップ表記を統一

**Files:**
- Modify: `frontend/src/components/RequestEditor.tsx`
- Modify: `frontend/src/components/SharedView.tsx`

- [ ] **Step 1: RequestEditor のチップをフルラベル化**

Edit `frontend/src/components/RequestEditor.tsx` — `VALUE_CHIP` の定義を置換。

`old_string`:
```tsx
const VALUE_CHIP: Record<Exclude<DayRequestValue, 'none'>, { label: string; cls: string }> = {
  early: { label: '早', cls: 'early' },
  late: { label: '遅', cls: 'late' },
  both: { label: '早遅', cls: 'early' },
  off: { label: '休', cls: 'off' },
};
```
`new_string`:
```tsx
const VALUE_CHIP: Record<Exclude<DayRequestValue, 'none'>, { label: string; cls: string }> = {
  early: { label: '早番', cls: 'early' },
  late: { label: '遅番', cls: 'late' },
  both: { label: '早番+遅番', cls: 'early' },
  off: { label: '休み', cls: 'off' },
};
```

- [ ] **Step 2: SharedView のスロット表記をフルラベル・絵文字なしに**

Replace the full content of `frontend/src/components/SharedView.tsx` with:

```tsx
import { useApp } from '../store/AppContext';
import { MonthCalendar } from './MonthCalendar';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';

interface SharedViewProps { year: number; month: number; }

export function SharedView({ year, month }: SharedViewProps) {
  const { staff, assignments } = useApp();
  const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? '';
  const hasAny = assignments.some((assignment) => assignment.staffIds.length > 0);

  return (
    <section className="shared-view">
      <p className="hint">確定したシフトです。各日の出勤者を確認できます。</p>
      {!hasAny && <div className="empty-inline">まだ確定したシフトがありません。</div>}
      <MonthCalendar
        year={year}
        month={month}
        renderCell={(date) => (
          <>
            {WORK_SLOTS.map((slot) => {
              const a = assignments.find((x) => x.date === date && x.slot === slot);
              const names = (a?.staffIds ?? []).map(nameOf).filter(Boolean);
              if (names.length === 0) return null;
              return (
                <div key={slot} className="shared-slot">
                  <span className={`chip ${slot}`}>{SLOT_LABELS[slot]}</span>
                  <span className="shared-names">{names.join('、')}</span>
                </div>
              );
            })}
          </>
        )}
      />
    </section>
  );
}
```

- [ ] **Step 3: 型・テスト・ビルドを確認**

Run: `cd frontend && npx tsc --noEmit && npx vitest run && npm run build`
Expected: 型エラーなし、全テストPASS、ビルド成功

- [ ] **Step 4: コミット**

```bash
git add frontend/src/components/RequestEditor.tsx frontend/src/components/SharedView.tsx
git commit -m "style(frontend): 希望提出・共有ビューのチップ表記を統一"
```

---

## Task 6: 凡例と上部バーの見た目調整

**Files:**
- Modify: `frontend/src/components/ui/Legend.tsx`
- Modify: `frontend/src/styles.css`（topbar 背景）

- [ ] **Step 1: Legend のラベルをフルラベルに**

Replace the full content of `frontend/src/components/ui/Legend.tsx` with:

```tsx
export function Legend() {
  return (
    <div className="legend" aria-label="表示の凡例">
      <span className="legend-item"><span className="chip early">早番</span>早番希望</span>
      <span className="legend-item"><span className="chip late">遅番</span>遅番希望</span>
      <span className="legend-item"><span className="chip off">休み</span>休み希望</span>
      <span className="legend-item"><span className="dot low" />不足</span>
      <span className="legend-item"><span className="dot ok" />適正</span>
      <span className="legend-item"><span className="dot over" />過多</span>
    </div>
  );
}
```

- [ ] **Step 2: 上部バーを白基調に**

Edit `frontend/src/styles.css` — topbar の背景を白に。

`old_string`:
```css
  background: rgba(248, 250, 252, .9);
  backdrop-filter: blur(8px);
```
`new_string`:
```css
  background: rgba(255, 255, 255, .92);
  backdrop-filter: blur(8px);
```

- [ ] **Step 3: 型・テスト・ビルドを確認**

Run: `cd frontend && npx tsc --noEmit && npx vitest run && npm run build`
Expected: 型エラーなし、全テストPASS、ビルド成功

- [ ] **Step 4: コミット**

```bash
git add frontend/src/components/ui/Legend.tsx frontend/src/styles.css
git commit -m "style(frontend): 凡例と上部バーの表記・配色を調整"
```

---

## Task 7: 最終検証

**Files:** なし（検証のみ）

- [ ] **Step 1: フロントエンドの全チェック**

Run:
```bash
cd frontend && npx tsc --noEmit && npm test && npm run build
```
Expected: 型エラーなし、全テストPASS、ビルド成功

- [ ] **Step 2: 目視確認（ローカル起動）**

バックエンドとフロントエンドを別ターミナルで起動し、`http://localhost:5173` を開く:
```bash
cd backend && ./mvnw spring-boot:run
```
```bash
cd frontend && npm run dev
```
確認項目:
- 店長ログインでマトリクス画面が表示され、上部にツールバー（日/週/半月/月・未収アラート・印刷）が出る
- 集計行（総労働時間・人件費・早番/遅番の充足 `n/2`）が表示される
- スタッフ行のチップが 早番=赤/ピンク・遅番=青・休み=グレーで、クリックすると割り当て（ベタ塗り）が切り替わる
- 日付ヘッダーの曜日が 日=赤字・土=青字
- スタッフログインで希望提出（カレンダー→ボトムシート→早番/遅番/休み）が動く
- 確定シフトタブで出勤者が表示される
- スマホ幅でも崩れない（横スクロール・固定列）

- [ ] **Step 3: 完了報告**

実施内容・検証結果（テスト件数、ビルド可否、目視結果）をまとめて報告する。

---

## Self-Review チェック結果

- **Spec coverage:** 配色トークン(Task2/3)、店長マトリクス＋人件費(Task1/4)、スタッフ希望提出(Task5)、確定共有(Task5)、曜日色分け(Task3)、ツールバー(Task4)、凡例/上部バー(Task6) — 設計の全項目に対応タスクあり。中番は設計通り不採用（凡例にも載せない）。
- **Placeholder scan:** TODO/TBD なし。全ステップに具体コードまたは具体コマンドあり。
- **Type consistency:** `dailyWorkHours` / `dailyLaborCost` / `staffMonthlyHours`(Task1) を Task4 で同一シグネチャで使用。`WorkSlot` / `DayRequestValue` は既存 `types.ts` 準拠。チップクラスは全画面で `early` / `late` / `off`（+ `mid` は凡例外の予備）に統一。
