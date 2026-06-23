# シフト管理アプリ（機能1〜3）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ラーメン店「暁夢」向けシフト管理デモを React で構築し、希望提出（機能1）・店長の確認/割り当て（機能2）・共有表示（機能3）をブラウザだけで動かす。

**Architecture:** React + Vite + TypeScript の SPA。ロジック（日付・希望・割り当て・充足判定）は純粋関数 + reducer に集約し Vitest でTDD。データは `store/storage.ts` を単一窓口として localStorage に保存（将来 API へ差し替え可能）。UI は責務ごとに小さいコンポーネントへ分割。

**Tech Stack:** React 18, Vite, TypeScript, Vitest, @testing-library/react, jsdom。状態管理は React Context + useReducer。スタイルは素の CSS（オレンジ基調・レスポンシブ）。

> 各コミットメッセージの末尾には次の行を付ける:

---

## File Structure

```
shift-app/
├── index.html                      # Vite エントリ
├── package.json
├── vite.config.ts                  # Vite + Vitest 設定
├── tsconfig.json / tsconfig.node.json
├── src/
│   ├── main.tsx                    # React マウント
│   ├── App.tsx                     # 役割/月の UI 状態 + 画面切替
│   ├── types.ts                    # ドメイン型（Store/Staff/Slot/...）
│   ├── constants.ts                # 時間帯ラベル・充足しきい値
│   ├── lib/
│   │   ├── date.ts                 # 月・日付ユーティリティ（純粋関数）
│   │   └── date.test.ts
│   ├── store/
│   │   ├── storage.ts              # localStorage 読み書き（API差し替え窓口）
│   │   ├── storage.test.ts
│   │   ├── requests.ts             # 希望の取得/変換ヘルパー（純粋関数）
│   │   ├── requests.test.ts
│   │   ├── assignments.ts          # 割り当て・充足判定（純粋関数）
│   │   ├── assignments.test.ts
│   │   ├── reducer.ts              # AppData の状態遷移
│   │   ├── reducer.test.ts
│   │   ├── seed.ts                 # サンプルデータ生成
│   │   ├── seed.test.ts
│   │   └── AppContext.tsx          # Provider + useApp フック
│   ├── components/
│   │   ├── Header.tsx              # ロゴ/店舗選択/役割切替
│   │   ├── MonthCalendar.tsx       # 月カレンダー描画（再利用）
│   │   ├── RequestEditor.tsx       # 機能1
│   │   ├── ManagerMatrix.tsx       # 機能2
│   │   ├── ManagerMatrix.test.tsx
│   │   └── SharedView.tsx          # 機能3
│   └── styles.css
└── docs/…                          # 既存（要件・設計・計画）
```

---

## Task 1: Vite + React + TypeScript + Vitest のセットアップ

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vitest.setup.ts`
- (Vite テンプレートが生成するファイルを土台に調整)

- [ ] **Step 1: Vite プロジェクトを生成（既存ファイルは保持）**

Run（プロジェクト直下で実行。既存の `docs/` `要件定義/` `.git/` は残す）:

```bash
npm create vite@latest . -- --template react-ts
```

対話で「現在のディレクトリにファイルがある」と聞かれたら **"Ignore files and continue"** を選ぶ（既存ファイルは消えない）。

- [ ] **Step 2: 依存をインストール + テスト関連を追加**

```bash
npm install
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Vitest 設定を `vite.config.ts` に追記**

`vite.config.ts` を以下にする:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/vitest.setup.ts',
  },
});
```

- [ ] **Step 4: テストセットアップ + npm script**

Create `src/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom';
```

`package.json` の `scripts` に追加:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: スモークテストで配線を確認**

Create `src/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS（1 passed）

- [ ] **Step 6: 開発サーバ起動確認 → 停止**

Run: `npm run dev`（起動して localhost が表示されることを確認したら Ctrl+C で停止）

- [ ] **Step 7: スモークテスト削除してコミット**

```bash
rm src/smoke.test.ts
git add -A
git commit -m "chore: scaffold Vite + React + TS + Vitest

```

---

## Task 2: ドメイン型と定数

**Files:**
- Create: `src/types.ts`, `src/constants.ts`

- [ ] **Step 1: 型を定義**

Create `src/types.ts`:

```ts
export type EmploymentType = '正社員' | 'パート';

/** 勤務できる時間帯 */
export type WorkSlot = 'early' | 'late'; // 早番 / 遅番

/** 希望の値（none = 未提出, both = 早番+遅番, off = 休み希望） */
export type DayRequestValue = 'none' | 'early' | 'late' | 'both' | 'off';

/** 1レコードの希望スロット（off を含む） */
export type RequestSlot = WorkSlot | 'off';

export interface Store {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  name: string;
  storeId: string;
  employmentType: EmploymentType;
}

export interface ShiftRequest {
  staffId: string;
  date: string; // 'YYYY-MM-DD'
  slot: RequestSlot;
}

export interface Assignment {
  date: string; // 'YYYY-MM-DD'
  slot: WorkSlot;
  staffIds: string[];
}

export interface AppData {
  stores: Store[];
  staff: Staff[];
  requests: ShiftRequest[];
  assignments: Assignment[];
}
```

- [ ] **Step 2: 定数を定義**

Create `src/constants.ts`:

```ts
import type { WorkSlot } from './types';

export const STORAGE_KEY = 'akiyume-shift-app-v1';

export const SLOT_LABELS: Record<WorkSlot, string> = {
  early: '早番',
  late: '遅番',
};

export const SLOT_TIMES: Record<WorkSlot, string> = {
  early: '7:00-16:00',
  late: '15:00-24:00',
};

export const WORK_SLOTS: WorkSlot[] = ['early', 'late'];

/** 各時間帯の必要人数の目安（充足判定に使用。デモ用の仮値） */
export const MIN_STAFF_PER_SLOT = 2;
export const MAX_STAFF_PER_SLOT = 4;
```

- [ ] **Step 3: 型チェック + コミット**

Run: `npx tsc --noEmit`
Expected: エラーなし

```bash
git add src/types.ts src/constants.ts
git commit -m "feat: add domain types and constants

```

---

## Task 3: 日付ユーティリティ（TDD）

**Files:**
- Create: `src/lib/date.ts`, `src/lib/date.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

Create `src/lib/date.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatDate, daysInMonth, getMonthDates, firstWeekdayOfMonth, shiftMonth } from './date';

describe('formatDate', () => {
  it('zero-pads month and day', () => {
    expect(formatDate(2026, 6, 9)).toBe('2026-06-09');
    expect(formatDate(2026, 12, 25)).toBe('2026-12-25');
  });
});

describe('daysInMonth', () => {
  it('returns days for normal months', () => {
    expect(daysInMonth(2026, 6)).toBe(30);
    expect(daysInMonth(2026, 7)).toBe(31);
  });
  it('handles February leap years', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
  });
});

describe('getMonthDates', () => {
  it('returns every date string in the month', () => {
    const dates = getMonthDates(2026, 6);
    expect(dates).toHaveLength(30);
    expect(dates[0]).toBe('2026-06-01');
    expect(dates[29]).toBe('2026-06-30');
  });
});

describe('firstWeekdayOfMonth', () => {
  it('returns 0-6 (Sun-Sat) for the 1st', () => {
    // 2026-06-01 is a Monday => 1
    expect(firstWeekdayOfMonth(2026, 6)).toBe(1);
  });
});

describe('shiftMonth', () => {
  it('moves forward across year boundary', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
  it('moves backward across year boundary', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/lib/date.test.ts`
Expected: FAIL（`date` モジュールが存在しない / 関数未定義）

- [ ] **Step 3: 実装を書く**

Create `src/lib/date.ts`:

```ts
export function formatDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function daysInMonth(year: number, month: number): number {
  // month は 1-12。Date の day=0 は前月末日を返す
  return new Date(year, month, 0).getDate();
}

export function getMonthDates(year: number, month: number): string[] {
  const total = daysInMonth(year, month);
  const dates: string[] = [];
  for (let day = 1; day <= total; day++) {
    dates.push(formatDate(year, month, day));
  }
  return dates;
}

export function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay(); // 0=Sun ... 6=Sat
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const zeroBased = month - 1 + delta;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = ((zeroBased % 12) + 12) % 12 + 1;
  return { year: newYear, month: newMonth };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/lib/date.test.ts`
Expected: PASS（全テスト緑）

- [ ] **Step 5: コミット**

```bash
git add src/lib/date.ts src/lib/date.test.ts
git commit -m "feat: add month/date utilities

```

---

## Task 4: localStorage ストレージ層（TDD）

**Files:**
- Create: `src/store/storage.ts`, `src/store/storage.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

Create `src/store/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadData, saveData } from './storage';
import type { AppData } from '../types';

const sample: AppData = {
  stores: [{ id: 's1', name: '中島店' }],
  staff: [{ id: 'p1', name: '田中', storeId: 's1', employmentType: 'パート' }],
  requests: [{ staffId: 'p1', date: '2026-06-01', slot: 'early' }],
  assignments: [{ date: '2026-06-01', slot: 'early', staffIds: ['p1'] }],
};

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing saved', () => {
    expect(loadData()).toBeNull();
  });

  it('round-trips saved data', () => {
    saveData(sample);
    expect(loadData()).toEqual(sample);
  });

  it('returns null for corrupt JSON', () => {
    localStorage.setItem('akiyume-shift-app-v1', '{not json');
    expect(loadData()).toBeNull();
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run src/store/storage.test.ts`
Expected: FAIL（`storage` 未実装）

- [ ] **Step 3: 実装を書く**

Create `src/store/storage.ts`:

```ts
import type { AppData } from '../types';
import { STORAGE_KEY } from '../constants';

/** localStorage から読み込む。無ければ null、壊れていても null（デモを止めない）。 */
export function loadData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

/** localStorage へ保存。localStorage が使えない環境でも例外で落とさない。 */
export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // デモ継続を優先し、保存失敗は無視（メモリ上の状態は維持される）
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/store/storage.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/store/storage.ts src/store/storage.test.ts
git commit -m "feat: add localStorage persistence layer

```

---

## Task 5: 希望ヘルパー（TDD）

希望は `ShiftRequest[]` で保持するが、UI は「1日の希望値（DayRequestValue）」で扱う。両者を変換する純粋関数を作る。

**Files:**
- Create: `src/store/requests.ts`, `src/store/requests.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

Create `src/store/requests.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getDayRequest, setDayRequest } from './requests';
import type { ShiftRequest } from '../types';

describe('getDayRequest', () => {
  it('returns none when no record exists', () => {
    expect(getDayRequest([], 'p1', '2026-06-01')).toBe('none');
  });
  it('returns early/late for single slot', () => {
    const reqs: ShiftRequest[] = [{ staffId: 'p1', date: '2026-06-01', slot: 'early' }];
    expect(getDayRequest(reqs, 'p1', '2026-06-01')).toBe('early');
  });
  it('returns both when early and late exist', () => {
    const reqs: ShiftRequest[] = [
      { staffId: 'p1', date: '2026-06-01', slot: 'early' },
      { staffId: 'p1', date: '2026-06-01', slot: 'late' },
    ];
    expect(getDayRequest(reqs, 'p1', '2026-06-01')).toBe('both');
  });
  it('returns off for a holiday request', () => {
    const reqs: ShiftRequest[] = [{ staffId: 'p1', date: '2026-06-01', slot: 'off' }];
    expect(getDayRequest(reqs, 'p1', '2026-06-01')).toBe('off');
  });
});

describe('setDayRequest', () => {
  it('replaces existing records for that staff+date only', () => {
    const reqs: ShiftRequest[] = [
      { staffId: 'p1', date: '2026-06-01', slot: 'early' },
      { staffId: 'p2', date: '2026-06-01', slot: 'late' },
    ];
    const next = setDayRequest(reqs, 'p1', '2026-06-01', 'both');
    expect(getDayRequest(next, 'p1', '2026-06-01')).toBe('both');
    // p2 は影響を受けない
    expect(getDayRequest(next, 'p2', '2026-06-01')).toBe('late');
  });
  it('none removes all records for that staff+date', () => {
    const reqs: ShiftRequest[] = [{ staffId: 'p1', date: '2026-06-01', slot: 'early' }];
    const next = setDayRequest(reqs, 'p1', '2026-06-01', 'none');
    expect(next).toHaveLength(0);
  });
  it('off stores a single off record', () => {
    const next = setDayRequest([], 'p1', '2026-06-01', 'off');
    expect(next).toEqual([{ staffId: 'p1', date: '2026-06-01', slot: 'off' }]);
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run src/store/requests.test.ts`
Expected: FAIL（未実装）

- [ ] **Step 3: 実装を書く**

Create `src/store/requests.ts`:

```ts
import type { ShiftRequest, DayRequestValue } from '../types';

export function getDayRequest(
  requests: ShiftRequest[],
  staffId: string,
  date: string
): DayRequestValue {
  const slots = requests
    .filter((r) => r.staffId === staffId && r.date === date)
    .map((r) => r.slot);
  if (slots.includes('off')) return 'off';
  const hasEarly = slots.includes('early');
  const hasLate = slots.includes('late');
  if (hasEarly && hasLate) return 'both';
  if (hasEarly) return 'early';
  if (hasLate) return 'late';
  return 'none';
}

export function setDayRequest(
  requests: ShiftRequest[],
  staffId: string,
  date: string,
  value: DayRequestValue
): ShiftRequest[] {
  // 対象 staff+date の既存レコードを除去してから付け直す（冪等）
  const others = requests.filter((r) => !(r.staffId === staffId && r.date === date));
  const added: ShiftRequest[] = [];
  if (value === 'early' || value === 'both') added.push({ staffId, date, slot: 'early' });
  if (value === 'late' || value === 'both') added.push({ staffId, date, slot: 'late' });
  if (value === 'off') added.push({ staffId, date, slot: 'off' });
  return [...others, ...added];
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/store/requests.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/store/requests.ts src/store/requests.test.ts
git commit -m "feat: add shift-request helpers

```

---

## Task 6: 割り当て・充足判定ヘルパー（TDD）

**Files:**
- Create: `src/store/assignments.ts`, `src/store/assignments.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

Create `src/store/assignments.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  isAssigned,
  toggleAssignment,
  countAssigned,
  fulfillmentLevel,
} from './assignments';
import type { Assignment } from '../types';

describe('toggleAssignment / isAssigned', () => {
  it('adds a staff to an empty slot', () => {
    const next = toggleAssignment([], '2026-06-01', 'early', 'p1');
    expect(isAssigned(next, '2026-06-01', 'early', 'p1')).toBe(true);
  });
  it('removes a staff already assigned', () => {
    const start: Assignment[] = [{ date: '2026-06-01', slot: 'early', staffIds: ['p1'] }];
    const next = toggleAssignment(start, '2026-06-01', 'early', 'p1');
    expect(isAssigned(next, '2026-06-01', 'early', 'p1')).toBe(false);
  });
  it('keeps other staff in the same slot', () => {
    const start: Assignment[] = [{ date: '2026-06-01', slot: 'early', staffIds: ['p1', 'p2'] }];
    const next = toggleAssignment(start, '2026-06-01', 'early', 'p1');
    expect(isAssigned(next, '2026-06-01', 'early', 'p2')).toBe(true);
  });
});

describe('countAssigned', () => {
  it('counts staff in a date+slot', () => {
    const a: Assignment[] = [{ date: '2026-06-01', slot: 'early', staffIds: ['p1', 'p2'] }];
    expect(countAssigned(a, '2026-06-01', 'early')).toBe(2);
    expect(countAssigned(a, '2026-06-01', 'late')).toBe(0);
  });
});

describe('fulfillmentLevel', () => {
  it('flags low when below minimum', () => {
    expect(fulfillmentLevel(1)).toBe('low'); // MIN=2
  });
  it('flags ok within range', () => {
    expect(fulfillmentLevel(3)).toBe('ok');
  });
  it('flags over above maximum', () => {
    expect(fulfillmentLevel(5)).toBe('over'); // MAX=4
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run src/store/assignments.test.ts`
Expected: FAIL（未実装）

- [ ] **Step 3: 実装を書く**

Create `src/store/assignments.ts`:

```ts
import type { Assignment, WorkSlot } from '../types';
import { MIN_STAFF_PER_SLOT, MAX_STAFF_PER_SLOT } from '../constants';

export type FulfillmentLevel = 'low' | 'ok' | 'over';

function find(assignments: Assignment[], date: string, slot: WorkSlot): Assignment | undefined {
  return assignments.find((a) => a.date === date && a.slot === slot);
}

export function isAssigned(
  assignments: Assignment[],
  date: string,
  slot: WorkSlot,
  staffId: string
): boolean {
  return find(assignments, date, slot)?.staffIds.includes(staffId) ?? false;
}

export function toggleAssignment(
  assignments: Assignment[],
  date: string,
  slot: WorkSlot,
  staffId: string
): Assignment[] {
  const existing = find(assignments, date, slot);
  if (!existing) {
    return [...assignments, { date, slot, staffIds: [staffId] }];
  }
  const has = existing.staffIds.includes(staffId);
  const nextIds = has
    ? existing.staffIds.filter((id) => id !== staffId)
    : [...existing.staffIds, staffId];
  return assignments.map((a) =>
    a === existing ? { ...a, staffIds: nextIds } : a
  );
}

export function countAssigned(
  assignments: Assignment[],
  date: string,
  slot: WorkSlot
): number {
  return find(assignments, date, slot)?.staffIds.length ?? 0;
}

export function fulfillmentLevel(count: number): FulfillmentLevel {
  if (count < MIN_STAFF_PER_SLOT) return 'low';
  if (count > MAX_STAFF_PER_SLOT) return 'over';
  return 'ok';
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/store/assignments.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/store/assignments.ts src/store/assignments.test.ts
git commit -m "feat: add assignment and fulfillment helpers

```

---

## Task 7: reducer（TDD）

データ全体（AppData）の状態遷移を1つの reducer に集約。Task 5/6 の純粋関数を使う。

**Files:**
- Create: `src/store/reducer.ts`, `src/store/reducer.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

Create `src/store/reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { appReducer, type Action } from './reducer';
import type { AppData } from '../types';
import { getDayRequest } from './requests';
import { isAssigned } from './assignments';

const base: AppData = {
  stores: [{ id: 's1', name: '中島店' }],
  staff: [{ id: 'p1', name: '田中', storeId: 's1', employmentType: 'パート' }],
  requests: [],
  assignments: [],
};

describe('appReducer', () => {
  it('SET_DAY_REQUEST updates a staff request', () => {
    const action: Action = {
      type: 'SET_DAY_REQUEST',
      staffId: 'p1',
      date: '2026-06-01',
      value: 'both',
    };
    const next = appReducer(base, action);
    expect(getDayRequest(next.requests, 'p1', '2026-06-01')).toBe('both');
  });

  it('TOGGLE_ASSIGNMENT adds and removes', () => {
    const add: Action = { type: 'TOGGLE_ASSIGNMENT', date: '2026-06-01', slot: 'early', staffId: 'p1' };
    const afterAdd = appReducer(base, add);
    expect(isAssigned(afterAdd.assignments, '2026-06-01', 'early', 'p1')).toBe(true);
    const afterRemove = appReducer(afterAdd, add);
    expect(isAssigned(afterRemove.assignments, '2026-06-01', 'early', 'p1')).toBe(false);
  });

  it('REPLACE_ALL swaps the whole dataset', () => {
    const replacement: AppData = { ...base, stores: [{ id: 's9', name: '早島店' }] };
    const next = appReducer(base, { type: 'REPLACE_ALL', data: replacement });
    expect(next.stores[0].name).toBe('早島店');
  });

  it('does not mutate the previous state', () => {
    appReducer(base, { type: 'SET_DAY_REQUEST', staffId: 'p1', date: '2026-06-01', value: 'early' });
    expect(base.requests).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run src/store/reducer.test.ts`
Expected: FAIL（未実装）

- [ ] **Step 3: 実装を書く**

Create `src/store/reducer.ts`:

```ts
import type { AppData, DayRequestValue, WorkSlot } from '../types';
import { setDayRequest } from './requests';
import { toggleAssignment } from './assignments';

export type Action =
  | { type: 'SET_DAY_REQUEST'; staffId: string; date: string; value: DayRequestValue }
  | { type: 'TOGGLE_ASSIGNMENT'; date: string; slot: WorkSlot; staffId: string }
  | { type: 'REPLACE_ALL'; data: AppData };

export function appReducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'SET_DAY_REQUEST':
      return {
        ...state,
        requests: setDayRequest(state.requests, action.staffId, action.date, action.value),
      };
    case 'TOGGLE_ASSIGNMENT':
      return {
        ...state,
        assignments: toggleAssignment(state.assignments, action.date, action.slot, action.staffId),
      };
    case 'REPLACE_ALL':
      return action.data;
    default:
      return state;
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/store/reducer.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/store/reducer.ts src/store/reducer.test.ts
git commit -m "feat: add app reducer

```

---

## Task 8: サンプルデータ（TDD）

**Files:**
- Create: `src/store/seed.ts`, `src/store/seed.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

Create `src/store/seed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSeedData } from './seed';

describe('createSeedData', () => {
  it('creates the three Akiyume stores', () => {
    const data = createSeedData();
    const names = data.stores.map((s) => s.name);
    expect(names).toEqual(['中島店', '新田店', '早島店']);
  });

  it('assigns several staff to every store', () => {
    const data = createSeedData();
    for (const store of data.stores) {
      const count = data.staff.filter((s) => s.storeId === store.id).length;
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });

  it('gives every staff a unique id', () => {
    const data = createSeedData();
    const ids = data.staff.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts with no requests or assignments', () => {
    const data = createSeedData();
    expect(data.requests).toEqual([]);
    expect(data.assignments).toEqual([]);
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run src/store/seed.test.ts`
Expected: FAIL（未実装）

- [ ] **Step 3: 実装を書く**

Create `src/store/seed.ts`:

```ts
import type { AppData, Staff, Store, EmploymentType } from '../types';

const STORES: Store[] = [
  { id: 's-nakashima', name: '中島店' },
  { id: 's-nitta', name: '新田店' },
  { id: 's-hayashima', name: '早島店' },
];

// 各店のサンプル要員（正社員1〜2 + パート数名）。デモが見やすい最小構成。
const STAFF_BY_STORE: Record<string, Array<{ name: string; type: EmploymentType }>> = {
  's-nakashima': [
    { name: '山田（店長）', type: '正社員' },
    { name: '佐藤', type: '正社員' },
    { name: '鈴木', type: 'パート' },
    { name: '高橋', type: 'パート' },
    { name: '田中', type: 'パート' },
  ],
  's-nitta': [
    { name: '伊藤（店長）', type: '正社員' },
    { name: '渡辺', type: '正社員' },
    { name: '中村', type: 'パート' },
    { name: '小林', type: 'パート' },
    { name: '加藤', type: 'パート' },
  ],
  's-hayashima': [
    { name: '吉田（店長）', type: '正社員' },
    { name: '山本', type: '正社員' },
    { name: '松本', type: 'パート' },
    { name: '井上', type: 'パート' },
    { name: '木村', type: 'パート' },
  ],
};

export function createSeedData(): AppData {
  const staff: Staff[] = [];
  for (const store of STORES) {
    STAFF_BY_STORE[store.id].forEach((person, index) => {
      staff.push({
        id: `${store.id}-p${index + 1}`,
        name: person.name,
        storeId: store.id,
        employmentType: person.type,
      });
    });
  }
  return { stores: STORES, staff, requests: [], assignments: [] };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/store/seed.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/store/seed.ts src/store/seed.test.ts
git commit -m "feat: add seed data for three stores

```

---

## Task 9: AppContext（Provider + フック）

reducer・ストレージ・seed を束ね、UI へ供給する。localStorage に空なら seed を投入し、変更のたび保存する。

**Files:**
- Create: `src/store/AppContext.tsx`

- [ ] **Step 1: 実装を書く**

Create `src/store/AppContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { AppData } from '../types';
import { appReducer, type Action } from './reducer';
import { loadData, saveData } from './storage';
import { createSeedData } from './seed';

interface AppContextValue {
  data: AppData;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

function init(): AppData {
  return loadData() ?? createSeedData();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(appReducer, undefined, init);

  // 変更のたび localStorage に保存
  useEffect(() => {
    saveData(data);
  }, [data]);

  return <AppContext.Provider value={{ data, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
```

- [ ] **Step 2: 型チェック + コミット**

Run: `npx tsc --noEmit`
Expected: エラーなし

```bash
git add src/store/AppContext.tsx
git commit -m "feat: add AppContext provider and useApp hook

```

---

## Task 10: グローバルスタイル

オレンジ基調・レスポンシブの土台。各コンポーネントは以降このクラスを使う。

**Files:**
- Create: `src/styles.css`
- Modify: `src/main.tsx`（`import './styles.css'`）

- [ ] **Step 1: スタイルを書く**

Create `src/styles.css`:

```css
:root {
  --orange: #f57c00;
  --orange-dark: #e65100;
  --early: #ffb74d;     /* 早番 */
  --late: #4a6fa5;      /* 遅番 */
  --off: #bdbdbd;       /* 休み */
  --low: #ef5350;       /* 不足 */
  --ok: #66bb6a;        /* 適正 */
  --over: #ffa726;      /* 過多 */
  --line: #e0e0e0;
  --bg: #fafafa;
  --text: #333;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); }

.app { max-width: 1000px; margin: 0 auto; padding: 0 12px 48px; }

/* Header */
.header {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 12px 4px; position: sticky; top: 0; background: var(--bg); z-index: 10;
}
.logo { font-size: 20px; font-weight: 800; color: var(--orange); }
.header select {
  padding: 8px 10px; font-size: 16px; border: 1px solid var(--line); border-radius: 8px;
}
.role-toggle { margin-left: auto; display: flex; gap: 4px; }
.role-toggle button {
  padding: 8px 14px; font-size: 15px; border: 1px solid var(--orange);
  background: #fff; color: var(--orange); border-radius: 999px; cursor: pointer;
}
.role-toggle button.active { background: var(--orange); color: #fff; }

/* Month nav */
.month-nav { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 8px 0 16px; }
.month-nav button { font-size: 18px; padding: 4px 14px; border: 1px solid var(--line); background: #fff; border-radius: 8px; cursor: pointer; }
.month-title { font-size: 18px; font-weight: 700; min-width: 140px; text-align: center; }

/* Tabs */
.tabs { display: flex; gap: 8px; margin-bottom: 12px; }
.tabs button { flex: 1; padding: 10px; font-size: 15px; border: 1px solid var(--line); background: #fff; border-radius: 8px; cursor: pointer; }
.tabs button.active { background: var(--orange); color: #fff; border-color: var(--orange); }

/* Calendar grid */
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-head { text-align: center; font-size: 12px; color: #888; padding: 4px 0; }
.cal-cell { min-height: 64px; border: 1px solid var(--line); border-radius: 8px; padding: 4px; background: #fff; cursor: pointer; }
.cal-cell .day-num { font-size: 12px; color: #888; }
.cal-cell.empty { border: none; background: transparent; cursor: default; }

/* Slot chips */
.chip { display: inline-block; font-size: 11px; padding: 2px 6px; border-radius: 6px; color: #fff; margin: 1px; }
.chip.early { background: var(--early); color: #663c00; }
.chip.late { background: var(--late); }
.chip.off { background: var(--off); }

/* Request picker */
.picker { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
.picker button { padding: 10px 16px; font-size: 16px; border-radius: 10px; border: 2px solid var(--line); background: #fff; cursor: pointer; }
.picker button.sel-early { border-color: var(--early); background: var(--early); color: #663c00; }
.picker button.sel-late { border-color: var(--late); background: var(--late); color: #fff; }
.picker button.sel-off { border-color: var(--off); background: var(--off); color: #fff; }

/* Manager matrix */
.matrix-wrap { overflow-x: auto; }
.matrix { border-collapse: collapse; font-size: 13px; }
.matrix th, .matrix td { border: 1px solid var(--line); padding: 4px 6px; text-align: center; min-width: 34px; }
.matrix th.staff-name, .matrix td.staff-name { text-align: left; white-space: nowrap; position: sticky; left: 0; background: #fff; }
.matrix .count.low { background: var(--low); color: #fff; }
.matrix .count.ok { background: var(--ok); color: #fff; }
.matrix .count.over { background: var(--over); color: #fff; }
.cell-btn { cursor: pointer; user-select: none; }
.cell-btn.assigned { outline: 2px solid var(--orange); outline-offset: -2px; font-weight: 700; }

@media (max-width: 600px) {
  .logo { font-size: 18px; }
  .cal-cell { min-height: 52px; }
}
```

- [ ] **Step 2: main.tsx でスタイルを読み込む**

`src/main.tsx` を確認し、先頭付近に追加（既存の `import './index.css'` があれば置き換え、無ければ追加）:

```tsx
import './styles.css';
```

- [ ] **Step 3: コミット**

```bash
git add src/styles.css src/main.tsx
git commit -m "feat: add global orange-themed responsive styles

```

---

## Task 11: Header コンポーネント

**Files:**
- Create: `src/components/Header.tsx`

- [ ] **Step 1: 実装を書く**

Create `src/components/Header.tsx`:

```tsx
import type { Store } from '../types';

export type Role = 'staff' | 'manager';

interface HeaderProps {
  stores: Store[];
  storeId: string;
  onStoreChange: (id: string) => void;
  role: Role;
  onRoleChange: (role: Role) => void;
}

export function Header({ stores, storeId, onStoreChange, role, onRoleChange }: HeaderProps) {
  return (
    <header className="header">
      <span className="logo">暁夢シフト</span>
      <select value={storeId} onChange={(e) => onStoreChange(e.target.value)} aria-label="店舗選択">
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="role-toggle">
        <button
          className={role === 'staff' ? 'active' : ''}
          onClick={() => onRoleChange('staff')}
        >
          スタッフ用
        </button>
        <button
          className={role === 'manager' ? 'active' : ''}
          onClick={() => onRoleChange('manager')}
        >
          店長用
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 型チェック + コミット**

Run: `npx tsc --noEmit`
Expected: エラーなし

```bash
git add src/components/Header.tsx
git commit -m "feat: add Header with store and role switch

```

---

## Task 12: MonthCalendar コンポーネント（再利用）

月の日付グリッドを描画し、各日の「中身」を呼び出し側が `renderCell` で差し込む。希望提出と共有表示の両方で使う。

**Files:**
- Create: `src/components/MonthCalendar.tsx`

- [ ] **Step 1: 実装を書く**

Create `src/components/MonthCalendar.tsx`:

```tsx
import type { ReactNode } from 'react';
import { getMonthDates, firstWeekdayOfMonth } from '../lib/date';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface MonthCalendarProps {
  year: number;
  month: number; // 1-12
  renderCell: (date: string, day: number) => ReactNode;
  onCellClick?: (date: string) => void;
}

export function MonthCalendar({ year, month, renderCell, onCellClick }: MonthCalendarProps) {
  const dates = getMonthDates(year, month);
  const leading = firstWeekdayOfMonth(year, month); // 1日の前に入れる空セル数

  return (
    <div className="cal-grid">
      {WEEKDAYS.map((w) => (
        <div key={w} className="cal-head">{w}</div>
      ))}
      {Array.from({ length: leading }).map((_, i) => (
        <div key={`empty-${i}`} className="cal-cell empty" />
      ))}
      {dates.map((date, idx) => {
        const day = idx + 1;
        return (
          <div
            key={date}
            className="cal-cell"
            onClick={onCellClick ? () => onCellClick(date) : undefined}
          >
            <div className="day-num">{day}</div>
            {renderCell(date, day)}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 型チェック + コミット**

Run: `npx tsc --noEmit`
Expected: エラーなし

```bash
git add src/components/MonthCalendar.tsx
git commit -m "feat: add reusable MonthCalendar grid

```

---

## Task 13: RequestEditor（機能1：希望提出）

**Files:**
- Create: `src/components/RequestEditor.tsx`

- [ ] **Step 1: 実装を書く**

Create `src/components/RequestEditor.tsx`:

```tsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { getDayRequest } from '../store/requests';
import { MonthCalendar } from './MonthCalendar';
import type { DayRequestValue } from '../types';

interface RequestEditorProps {
  storeId: string;
  year: number;
  month: number;
}

const VALUE_CHIP: Record<Exclude<DayRequestValue, 'none'>, { label: string; cls: string }> = {
  early: { label: '早', cls: 'early' },
  late: { label: '遅', cls: 'late' },
  both: { label: '早遅', cls: 'early' },
  off: { label: '休', cls: 'off' },
};

export function RequestEditor({ storeId, year, month }: RequestEditorProps) {
  const { data, dispatch } = useApp();
  const storeStaff = data.staff.filter((s) => s.storeId === storeId);
  const [staffId, setStaffId] = useState(storeStaff[0]?.id ?? '');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 店舗を切り替えたときに staffId が他店のものなら先頭へ寄せる
  const validStaffId = storeStaff.some((s) => s.id === staffId) ? staffId : storeStaff[0]?.id ?? '';

  function setValue(value: DayRequestValue) {
    if (!selectedDate || !validStaffId) return;
    dispatch({ type: 'SET_DAY_REQUEST', staffId: validStaffId, date: selectedDate, value });
  }

  const current = selectedDate && validStaffId
    ? getDayRequest(data.requests, validStaffId, selectedDate)
    : 'none';

  return (
    <section>
      <label>
        あなたの名前：{' '}
        <select value={validStaffId} onChange={(e) => setStaffId(e.target.value)}>
          {storeStaff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>

      <p style={{ color: '#666', fontSize: 14 }}>
        日付をタップして、希望を選んでください（早番 7:00-16:00 / 遅番 15:00-24:00）。
      </p>

      <MonthCalendar
        year={year}
        month={month}
        onCellClick={(date) => setSelectedDate(date)}
        renderCell={(date) => {
          const v = getDayRequest(data.requests, validStaffId, date);
          if (v === 'none') return null;
          const chip = VALUE_CHIP[v];
          return <span className={`chip ${chip.cls}`}>{chip.label}</span>;
        }}
      />

      {selectedDate && (
        <div className="picker">
          <strong style={{ alignSelf: 'center' }}>{selectedDate}：</strong>
          <button className={current === 'early' ? 'sel-early' : ''} onClick={() => setValue('early')}>早番</button>
          <button className={current === 'late' ? 'sel-late' : ''} onClick={() => setValue('late')}>遅番</button>
          <button className={current === 'both' ? 'sel-early' : ''} onClick={() => setValue('both')}>早番+遅番</button>
          <button className={current === 'off' ? 'sel-off' : ''} onClick={() => setValue('off')}>休み希望</button>
          <button onClick={() => setValue('none')}>クリア</button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: 型チェック + コミット**

Run: `npx tsc --noEmit`
Expected: エラーなし

```bash
git add src/components/RequestEditor.tsx
git commit -m "feat: add RequestEditor (feature 1: shift requests)

```

---

## Task 14: ManagerMatrix（機能2：確認・割り当て）＋コンポーネントテスト

**Files:**
- Create: `src/components/ManagerMatrix.tsx`, `src/components/ManagerMatrix.test.tsx`

- [ ] **Step 1: 実装を書く**

Create `src/components/ManagerMatrix.tsx`:

```tsx
import { useApp } from '../store/AppContext';
import { getMonthDates } from '../lib/date';
import { getDayRequest } from '../store/requests';
import { isAssigned, countAssigned, fulfillmentLevel } from '../store/assignments';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';
import type { DayRequestValue, WorkSlot } from '../types';

interface ManagerMatrixProps {
  storeId: string;
  year: number;
  month: number;
}

// その日のスタッフ希望が、対象スロットに入れられるか
function wants(value: DayRequestValue, slot: WorkSlot): boolean {
  if (value === 'off' || value === 'none') return false;
  if (value === 'both') return true;
  return value === slot;
}

const REQUEST_MARK: Record<DayRequestValue, string> = {
  none: '', early: '早', late: '遅', both: '早遅', off: '休',
};

export function ManagerMatrix({ storeId, year, month }: ManagerMatrixProps) {
  const { data, dispatch } = useApp();
  const staff = data.staff.filter((s) => s.storeId === storeId);
  const dates = getMonthDates(year, month);
  const days = dates.map((d) => Number(d.slice(8, 10)));

  return (
    <section className="matrix-wrap">
      <p style={{ color: '#666', fontSize: 14 }}>
        希望（早/遅/休）が色で見えます。希望セルをタップで割り当て・解除できます。
      </p>
      <table className="matrix">
        <thead>
          <tr>
            <th className="staff-name">スタッフ</th>
            {days.map((d) => <th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {staff.map((person) => (
            <tr key={person.id}>
              <td className="staff-name">{person.name}</td>
              {dates.map((date) => {
                const req = getDayRequest(data.requests, person.id, date);
                // 割り当て可能なスロット（両方希望なら早→遅の順でトグル対象）
                const targetSlot: WorkSlot | null =
                  req === 'off' || req === 'none' ? null : req === 'late' ? 'late' : 'early';
                const assigned = targetSlot
                  ? isAssigned(data.assignments, date, targetSlot, person.id)
                  : false;
                return (
                  <td
                    key={date}
                    className={`cell-btn ${assigned ? 'assigned' : ''}`}
                    onClick={() => {
                      if (!targetSlot) return;
                      dispatch({ type: 'TOGGLE_ASSIGNMENT', date, slot: targetSlot, staffId: person.id });
                      // 「早遅」希望は早→遅も割り当てたい場合に備え、遅番もトグル可能にする簡易対応
                      if (req === 'both') {
                        dispatch({ type: 'TOGGLE_ASSIGNMENT', date, slot: 'late', staffId: person.id });
                      }
                    }}
                  >
                    {REQUEST_MARK[req]}
                  </td>
                );
              })}
            </tr>
          ))}
          {WORK_SLOTS.map((slot) => (
            <tr key={slot}>
              <td className="staff-name">{SLOT_LABELS[slot]}人数</td>
              {dates.map((date) => {
                const count = countAssigned(data.assignments, date, slot);
                const level = fulfillmentLevel(count);
                return <td key={date} className={`count ${level}`}>{count}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

> 注: `wants` ヘルパーは将来 UI 拡張で使う想定だが、本タスクでは未使用なら削除して未使用エラーを避ける。`tsc` がエラーを出す場合は `wants` を削除すること。

- [ ] **Step 2: コンポーネントテストを書く**

Create `src/components/ManagerMatrix.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../store/AppContext';
import { ManagerMatrix } from './ManagerMatrix';

function renderMatrix() {
  return render(
    <AppProvider>
      <ManagerMatrix storeId="s-nakashima" year={2026} month={6} />
    </AppProvider>
  );
}

describe('ManagerMatrix', () => {
  beforeEach(() => localStorage.clear());

  it('renders a row per staff and shift-count rows', () => {
    renderMatrix();
    expect(screen.getByText('山田（店長）')).toBeInTheDocument();
    expect(screen.getByText('早番人数')).toBeInTheDocument();
    expect(screen.getByText('遅番人数')).toBeInTheDocument();
  });

  it('shows day-of-month headers', () => {
    renderMatrix();
    // 6月は30日まで
    expect(screen.getByRole('columnheader', { name: '30' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: テスト実行**

Run: `npx vitest run src/components/ManagerMatrix.test.tsx`
Expected: PASS（必要に応じて Step 1 の `wants` 未使用を削除して再実行）

- [ ] **Step 4: コミット**

```bash
git add src/components/ManagerMatrix.tsx src/components/ManagerMatrix.test.tsx
git commit -m "feat: add ManagerMatrix (feature 2: confirm and assign)

```

---

## Task 15: SharedView（機能3：共有表示）

**Files:**
- Create: `src/components/SharedView.tsx`

- [ ] **Step 1: 実装を書く**

Create `src/components/SharedView.tsx`:

```tsx
import { useApp } from '../store/AppContext';
import { MonthCalendar } from './MonthCalendar';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';

interface SharedViewProps {
  storeId: string;
  year: number;
  month: number;
}

export function SharedView({ storeId, year, month }: SharedViewProps) {
  const { data } = useApp();
  const nameOf = (id: string) => data.staff.find((s) => s.id === id)?.name ?? '';

  return (
    <section>
      <p style={{ color: '#666', fontSize: 14 }}>確定したシフトです。各日の出勤者を確認できます。</p>
      <MonthCalendar
        year={year}
        month={month}
        renderCell={(date) => (
          <>
            {WORK_SLOTS.map((slot) => {
              const a = data.assignments.find(
                (x) => x.date === date && x.slot === slot
              );
              // 当該店舗のスタッフのみ表示
              const names = (a?.staffIds ?? [])
                .filter((id) => data.staff.find((s) => s.id === id)?.storeId === storeId)
                .map(nameOf);
              if (names.length === 0) return null;
              return (
                <div key={slot} style={{ fontSize: 11, marginTop: 2 }}>
                  <span className={`chip ${slot}`}>{SLOT_LABELS[slot]}</span>{' '}
                  {names.join('、')}
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

- [ ] **Step 2: 型チェック + コミット**

Run: `npx tsc --noEmit`
Expected: エラーなし

```bash
git add src/components/SharedView.tsx
git commit -m "feat: add SharedView (feature 3: share finished shift)

```

---

## Task 16: App 配線（役割・月・タブ）

全コンポーネントを束ね、役割・対象月・画面タブを管理。

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: App.tsx を実装**

Replace `src/App.tsx` with:

```tsx
import { useState } from 'react';
import { useApp } from './store/AppContext';
import { Header, type Role } from './components/Header';
import { RequestEditor } from './components/RequestEditor';
import { ManagerMatrix } from './components/ManagerMatrix';
import { SharedView } from './components/SharedView';
import { shiftMonth } from './lib/date';

type StaffTab = 'request' | 'shared';
type ManagerTab = 'matrix' | 'shared';

export function App() {
  const { data } = useApp();
  const [storeId, setStoreId] = useState(data.stores[0]?.id ?? '');
  const [role, setRole] = useState<Role>('staff');
  const [{ year, month }, setYm] = useState({ year: 2026, month: 6 });
  const [staffTab, setStaffTab] = useState<StaffTab>('request');
  const [managerTab, setManagerTab] = useState<ManagerTab>('matrix');

  return (
    <div className="app">
      <Header
        stores={data.stores}
        storeId={storeId}
        onStoreChange={setStoreId}
        role={role}
        onRoleChange={setRole}
      />

      <div className="month-nav">
        <button onClick={() => setYm(shiftMonth(year, month, -1))} aria-label="前の月">‹</button>
        <span className="month-title">{year}年 {month}月</span>
        <button onClick={() => setYm(shiftMonth(year, month, 1))} aria-label="次の月">›</button>
      </div>

      {role === 'staff' ? (
        <>
          <div className="tabs">
            <button className={staffTab === 'request' ? 'active' : ''} onClick={() => setStaffTab('request')}>希望を出す</button>
            <button className={staffTab === 'shared' ? 'active' : ''} onClick={() => setStaffTab('shared')}>確定シフト</button>
          </div>
          {staffTab === 'request'
            ? <RequestEditor storeId={storeId} year={year} month={month} />
            : <SharedView storeId={storeId} year={year} month={month} />}
        </>
      ) : (
        <>
          <div className="tabs">
            <button className={managerTab === 'matrix' ? 'active' : ''} onClick={() => setManagerTab('matrix')}>希望確認・割り当て</button>
            <button className={managerTab === 'shared' ? 'active' : ''} onClick={() => setManagerTab('shared')}>確定シフト</button>
          </div>
          {managerTab === 'matrix'
            ? <ManagerMatrix storeId={storeId} year={year} month={month} />
            : <SharedView storeId={storeId} year={year} month={month} />}
        </>
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 2: main.tsx で Provider を巻く**

Replace `src/main.tsx` with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { AppProvider } from './store/AppContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);
```

- [ ] **Step 3: 型チェック + 全テスト**

Run: `npx tsc --noEmit && npm test`
Expected: tsc エラーなし、全テスト PASS

- [ ] **Step 4: コミット**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire App with role, month nav, and tabs

```

---

## Task 17: 手動E2E確認 + クリーンアップ + push

**Files:** なし（不要ファイルがあれば削除）

- [ ] **Step 1: 不要テンプレートの掃除**

Vite テンプレート由来で未使用なら削除: `src/App.css`, `src/assets/react.svg`, `src/index.css`（styles.css に統合済み）。`App.tsx`/`main.tsx` 内に残った参照があれば消す。

Run: `npx tsc --noEmit && npm test`
Expected: 緑のまま

- [ ] **Step 2: 開発サーバで手動シナリオ確認**

Run: `npm run dev`

ブラウザで以下を確認:
1. **スタッフ用**（中島店）→「希望を出す」：名前を選び、複数日をタップして 早番/遅番/早番+遅番/休み を設定。チップが色付きで表示される。
2. リロードしても希望が残っている（localStorage 保存）。
3. **店長用** →「希望確認・割り当て」：マトリクスに各スタッフの希望が表示。希望セルをタップで割り当て（枠が付く）。下段の早番/遅番人数が増減し、色（赤/緑/橙）が変わる。
4. **確定シフト**タブ（スタッフ用・店長用どちらでも）：割り当てた人がカレンダーに「早番 ◯◯」「遅番 △△」で表示。
5. 店舗を切り替えると、その店舗のスタッフ・希望・割り当てに切り替わる。
6. スマホ幅（DevToolsのレスポンシブ）で崩れないか確認。

確認後 Ctrl+C で停止。

- [ ] **Step 3: README を追加（起動方法）**

Create `README.md`:

```markdown
# 暁夢シフト管理アプリ（デモ）

ラーメン店「株式会社暁夢」向けシフト管理デモ。ブラウザだけで動作（サーバー不要）。

## 起動
\`\`\`bash
npm install
npm run dev
\`\`\`

## テスト
\`\`\`bash
npm test
\`\`\`

## 機能
1. スタッフの希望提出（早番/遅番/休み）
2. 店長の希望確認・割り当て（充足の色表示）
3. 確定シフトの共有表示

データはブラウザの localStorage に保存されます。
```

- [ ] **Step 4: 最終コミット + push**

```bash
git add -A
git commit -m "chore: cleanup template files and add README

git push
```

Expected: `origin/main` へ反映。

---

## Self-Review メモ

- **機能1**（希望提出）→ Task 5, 13。早番/遅番/両方/休み + クリア、色チップ、localStorage 保存。✓
- **機能2**（確認・割り当て）→ Task 6, 14。一覧マトリクス・希望表示・タップ割り当て・人数と充足色。✓
- **機能3**（共有）→ Task 15。確定シフトのカレンダー表示。✓
- **店舗3つ・役割切替・サンプル投入** → Task 8, 9, 11, 16。✓
- **レスポンシブ・オレンジ基調** → Task 10。✓
- **型整合**: `DayRequestValue` / `WorkSlot` / `Action` 名は全タスクで統一。`SET_DAY_REQUEST`・`TOGGLE_ASSIGNMENT`・`REPLACE_ALL` の3アクションで一貫。✓
- **既知の簡略化**: 「早番+遅番」希望の割り当ては早・遅を同時トグルする簡易実装（Task 14 注記）。機能4（人件費）はスコープ外。
