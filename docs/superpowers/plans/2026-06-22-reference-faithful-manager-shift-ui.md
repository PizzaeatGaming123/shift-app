# Reference-Faithful Manager Shift UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the manager global navigation, shift toolbar, display controls, and day/week/half-month/month shift table so their structure, density, colors, borders, states, and interaction order match the reference images in `要件定義/`.

**Architecture:** Preserve the existing React context and backend APIs, but replace the oversized `TopNav.tsx` and `ManagerMatrix.tsx` presentation layer with small manager-screen components. Move date-window selection and table display derivation into pure functions, keep business mutations in `AppContext`, and use reference-prefixed CSS classes to prevent legacy CSS from leaking into the rebuilt screen.

**Tech Stack:** React 18, TypeScript 5.5, Vite 5, Vitest 2, Testing Library, existing Spring Boot APIs, plain CSS in `frontend/src/styles.css`.

## Global Constraints

- Visual authority order: `上のバー.png` → `シフト一覧.png` → `別パターン.png` → `大きさ.png` → other screenshots → `300.pdf` → `start_manual.pdf` → written requirements.
- Do not introduce visual structures that are absent from the reference material.
- Do not use emoji as UI icons.
- Do not add Tailwind CSS, component libraries, icon libraries, or new runtime dependencies.
- Use a white background, thin gray rules, the reference blue navigation, compact controls, and dense table geometry.
- Keep the default table density readable for a store manager; support small, standard, and large display settings.
- Do not create an inner vertical scrollbar for the shift table. Allow horizontal overflow only when date columns exceed the viewport.
- Preserve keyboard operation, visible focus, ARIA labels/states, and `prefers-reduced-motion`.
- Store business data in backend APIs. Use `localStorage` only for device-level display preferences.
- Repair any mojibake encountered in modified files; all source files and Japanese UI strings must remain UTF-8.
- Do not stage or modify local assistant configuration directories or the user's untracked reference files under `要件定義/`.
- Preserve every existing visual detail that already matches the reference. Replace only a verified mismatch.
- Capture the current manager screen before Task 2 and compare after every visual task. If a task reduces reference fidelity, revert only that task's commit before continuing.
- Do not add tool attribution notices or co-author trailers to branch names, commit messages, pull-request text, or GitHub-visible metadata.

---

## File Structure

### New files

- `frontend/src/components/manager/types.ts` — manager view, layer, density, and sorting types.
- `frontend/src/components/manager/shiftViewModel.ts` — pure date-window, staff-sort, shift-cell, and summary derivation.
- `frontend/src/components/manager/shiftViewModel.test.ts` — pure-function tests for every view and display mode.
- `frontend/src/components/manager/GlobalNav.tsx` — reference-blue top navigation and exclusive dropdown behavior.
- `frontend/src/components/manager/GlobalNav.test.tsx` — navigation structure, exclusivity, and home behavior.
- `frontend/src/components/manager/ShiftToolbar.tsx` — store/position/confirmation/print/view/date/deadline controls.
- `frontend/src/components/manager/ShiftToolbar.test.tsx` — toolbar state and callback tests.
- `frontend/src/components/manager/ShiftDisplayControls.tsx` — reference checkbox row and action buttons.
- `frontend/src/components/manager/ShiftDisplayControls.test.tsx` — checkbox, sorting, bulk action, and copy behavior tests.
- `frontend/src/components/manager/ShiftTableSummaryRows.tsx` — sales, labor, model-shift, rank, and memo rows.
- `frontend/src/components/manager/ShiftStaffRow.tsx` — one staff row and its date cells.
- `frontend/src/components/manager/ShiftTable.tsx` — table composition for month/half-month/week modes.
- `frontend/src/components/manager/ShiftTable.test.tsx` — DOM structure, labels, chips, and layer visibility tests.
- `frontend/src/components/manager/DayTimeline.tsx` — day-mode bar layout based on `300.pdf`.
- `frontend/src/components/manager/DayTimeline.test.tsx` — bar geometry and accessible adjustment tests.
- `frontend/src/components/manager/ManagerShiftScreen.tsx` — stateful composition of the rebuilt manager shift screen.
- `frontend/src/components/manager/ManagerShiftScreen.test.tsx` — integration test for view switching and reference control order.
- `frontend/src/test/mockShiftApi.ts` — shared API mock with UTF-8 Japanese fixtures.

### Modified files

- `frontend/src/App.tsx` — route manager users to `ManagerShiftScreen`; retain staff flow.
- `frontend/src/types.ts` — repair mojibake comments/labels only; keep domain shapes compatible.
- `frontend/src/constants.ts` — repair Japanese labels and align reference slot times.
- `frontend/src/lib/date.ts` — retain generic month helpers; remove manager-specific mojibake view slicing after migration.
- `frontend/src/styles.css` — add reference tokens and manager screen styles; remove or quarantine legacy selectors used by the old manager UI.
- `frontend/src/components/TopNav.tsx` — replace only its navigation markup with `GlobalNav`; retain its existing modal actions and destination behavior.
- `frontend/src/components/ManagerToolbar.tsx` — stop rendering it from `App`; remove after migration.
- `frontend/src/components/ManagerMatrix.tsx` — stop rendering it from `App`; remove after migration.
- `frontend/src/components/ManagerMatrix.test.tsx` — replace with the focused manager component tests listed above.

---

### Task 1: Establish UTF-8 Baseline and Manager View Types

**Files:**
- Create: `frontend/src/components/manager/types.ts`
- Create: `frontend/src/components/manager/shiftViewModel.ts`
- Create: `frontend/src/components/manager/shiftViewModel.test.ts`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/constants.ts`
- Modify: `frontend/src/lib/date.ts`

**Interfaces:**
- Produces:
  - `type ManagerView = 'day' | 'week' | 'half-month' | 'month'`
  - `type ShiftTableDensity = 'small' | 'standard' | 'large'`
  - `type StaffSortMode = 'default' | 'name' | 'hours' | 'rank'`
  - `interface ShiftLayerVisibility`
  - `getManagerDateWindow(input: ManagerDateWindowInput): string[]`
  - `sortShiftStaff(input: SortShiftStaffInput): Staff[]`
  - `formatDuration(hours: number): string`
- Consumes: existing `Staff`, `Assignment`, `WorkSlot`, `getMonthDates`, and labor helpers.

- [ ] **Step 1: Write failing pure-function tests**

Create `frontend/src/components/manager/shiftViewModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Assignment, Staff } from '../../types';
import {
  formatDuration,
  getManagerDateWindow,
  sortShiftStaff,
} from './shiftViewModel';

const monthDates = Array.from(
  { length: 31 },
  (_, index) => `2026-07-${String(index + 1).padStart(2, '0')}`,
);

const staff: Staff[] = [
  {
    id: '1',
    name: '田中太郎',
    storeId: '1',
    employmentType: '正社員',
    role: 'STAFF',
    rank: 3,
    skills: [],
  },
  {
    id: '2',
    name: '山田花子',
    storeId: '1',
    employmentType: 'パート',
    role: 'STAFF',
    rank: 5,
    skills: [],
  },
];

const assignments: Assignment[] = [
  { date: '2026-07-01', slot: 'early', staffIds: ['1'] },
  { date: '2026-07-01', slot: 'late', staffIds: ['2'] },
  { date: '2026-07-02', slot: 'early', staffIds: ['2'] },
];

describe('getManagerDateWindow', () => {
  it('returns the selected day for day view', () => {
    expect(getManagerDateWindow({
      monthDates,
      view: 'day',
      anchorDate: '2026-07-18',
    })).toEqual(['2026-07-18']);
  });

  it('returns Monday through Sunday for week view', () => {
    expect(getManagerDateWindow({
      monthDates,
      view: 'week',
      anchorDate: '2026-07-29',
    })).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
    ]);
  });

  it('returns the first or second half based on the anchor date', () => {
    expect(getManagerDateWindow({
      monthDates,
      view: 'half-month',
      anchorDate: '2026-07-08',
    })).toHaveLength(15);
    expect(getManagerDateWindow({
      monthDates,
      view: 'half-month',
      anchorDate: '2026-07-20',
    })[0]).toBe('2026-07-16');
  });

  it('returns the full month for month view', () => {
    expect(getManagerDateWindow({
      monthDates,
      view: 'month',
      anchorDate: '2026-07-18',
    })).toEqual(monthDates);
  });
});

describe('sortShiftStaff', () => {
  it('sorts by monthly hours descending', () => {
    expect(sortShiftStaff({
      staff,
      assignments,
      dates: ['2026-07-01', '2026-07-02'],
      mode: 'hours',
    }).map((person) => person.id)).toEqual(['2', '1']);
  });

  it('sorts by rank descending', () => {
    expect(sortShiftStaff({
      staff,
      assignments,
      dates: monthDates,
      mode: 'rank',
    }).map((person) => person.id)).toEqual(['2', '1']);
  });
});

it('formats reference-style hour totals', () => {
  expect(formatDuration(45)).toBe('45:00');
  expect(formatDuration(7.5)).toBe('7:30');
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/shiftViewModel.test.ts
```

Expected: FAIL because `shiftViewModel.ts` does not exist.

- [ ] **Step 3: Create the manager type definitions**

Create `frontend/src/components/manager/types.ts`:

```ts
import type { RequestSlot } from '../../types';

export type ManagerView = 'day' | 'week' | 'half-month' | 'month';
export type ShiftTableDensity = 'small' | 'standard' | 'large';
export type StaffSortMode = 'default' | 'name' | 'hours' | 'rank';

export interface ShiftLayerVisibility {
  pinHeader: boolean;
  onlyAssigned: boolean;
  showPatterns: boolean;
  showRequests: boolean;
  showTasks: boolean;
  showNotes: boolean;
  showSummary: boolean;
  visibleSlots: Record<RequestSlot, boolean>;
}

export const DEFAULT_SHIFT_LAYERS: ShiftLayerVisibility = {
  pinHeader: false,
  onlyAssigned: false,
  showPatterns: true,
  showRequests: true,
  showTasks: true,
  showNotes: true,
  showSummary: true,
  visibleSlots: {
    early: true,
    mid: true,
    late: true,
    off: true,
  },
};
```

- [ ] **Step 4: Implement the pure view-model helpers**

Create `frontend/src/components/manager/shiftViewModel.ts`:

```ts
import type { Assignment, Staff } from '../../types';
import { staffMonthlyHours } from '../../store/labor';
import type { ManagerView, StaffSortMode } from './types';

export interface ManagerDateWindowInput {
  monthDates: string[];
  view: ManagerView;
  anchorDate: string;
}

export interface SortShiftStaffInput {
  staff: Staff[];
  assignments: Assignment[];
  dates: string[];
  mode: StaffSortMode;
}

function mondayIndex(date: string): number {
  const weekday = new Date(`${date}T00:00:00`).getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

export function getManagerDateWindow({
  monthDates,
  view,
  anchorDate,
}: ManagerDateWindowInput): string[] {
  if (view === 'month') return monthDates;
  if (view === 'day') {
    return monthDates.includes(anchorDate) ? [anchorDate] : monthDates.slice(0, 1);
  }

  const anchorIndex = Math.max(0, monthDates.indexOf(anchorDate));
  if (view === 'half-month') {
    return anchorIndex < 15 ? monthDates.slice(0, 15) : monthDates.slice(15);
  }

  const start = Math.max(0, anchorIndex - mondayIndex(anchorDate));
  return monthDates.slice(start, start + 7);
}

export function sortShiftStaff({
  staff,
  assignments,
  dates,
  mode,
}: SortShiftStaffInput): Staff[] {
  const next = [...staff];
  if (mode === 'default') return next;
  if (mode === 'name') {
    return next.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }
  if (mode === 'rank') {
    return next.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
  }
  return next.sort(
    (a, b) =>
      staffMonthlyHours(assignments, b.id, dates)
      - staffMonthlyHours(assignments, a.id, dates),
  );
}

export function formatDuration(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `${whole}:${String(minutes).padStart(2, '0')}`;
}
```

- [ ] **Step 5: Repair Japanese strings in the modified domain files**

Replace mojibake in `frontend/src/types.ts`, `frontend/src/constants.ts`, and `frontend/src/lib/date.ts` with UTF-8 Japanese. Keep exported type names unchanged. Use these exact slot values:

```ts
export const SLOT_LABELS: Record<WorkSlot, string> = {
  early: '早番',
  mid: '中番',
  late: '遅番',
};

export const SLOT_TIMES: Record<WorkSlot, string> = {
  early: '7:00-16:00',
  mid: '11:00-20:00',
  late: '15:00-24:00',
};
```

Delete the manager-specific `sliceByView` function from `frontend/src/lib/date.ts` after all imports are migrated in later tasks. At this task, mark it deprecated but leave it callable:

```ts
/** @deprecated 管理画面では getManagerDateWindow を使用する。 */
export function sliceByView(dates: string[], view: string): string[] {
  if (view === '日') return dates.slice(0, 1);
  if (view === '週') return dates.slice(0, 7);
  if (view === '半月') return dates.slice(0, 15);
  return dates;
}
```

- [ ] **Step 6: Run focused and existing pure-function tests**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/shiftViewModel.test.ts src/lib/date.test.ts src/store/labor.test.ts
```

Expected: PASS with no mojibake in test names or snapshots.

- [ ] **Step 7: Capture the rollback baseline before visual replacement**

Start the current backend and frontend, then use the in-app browser to save these local, untracked screenshots under `tmp/reference-comparison/`:

```text
manager-baseline-nav.png
manager-baseline-month.png
manager-baseline-week.png
manager-baseline-summary-hidden.png
```

Do not stage `tmp/reference-comparison/`. These images are the rollback authority when the existing UI is already closer to the source material than a proposed replacement.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/manager/types.ts frontend/src/components/manager/shiftViewModel.ts frontend/src/components/manager/shiftViewModel.test.ts frontend/src/types.ts frontend/src/constants.ts frontend/src/lib/date.ts
git commit -m "refactor(frontend): add reference shift view model"
```

---

### Task 2: Extract the Reference Global Navigation

**Files:**
- Create: `frontend/src/components/manager/GlobalNav.tsx`
- Create: `frontend/src/components/manager/GlobalNav.test.tsx`
- Modify: `frontend/src/components/TopNav.tsx`

**Interfaces:**
- Consumes:
  - `userName: string`
  - `onHome(): void`
  - `onOpenSection(section: ManagerSection): void`
  - `onLogout(): void`
- Produces:
  - `type ManagerSection`
  - `GlobalNav`
- The parent owns screen navigation; `GlobalNav` owns only the currently open dropdown.

- [ ] **Step 1: Write failing navigation tests**

Create `frontend/src/components/manager/GlobalNav.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GlobalNav, type ManagerSection } from './GlobalNav';

describe('GlobalNav', () => {
  it('renders the reference navigation labels in order', () => {
    render(
      <GlobalNav
        userName="西村健一"
        enabledSections={new Set<ManagerSection>(['shift-table', 'staff-list'])}
        onHome={() => {}}
        onOpenSection={() => {}}
        onLogout={() => {}}
      />,
    );

    const labels = screen.getAllByRole('button').map((button) => button.textContent);
    expect(labels.slice(0, 8)).toEqual([
      '暁夢シフト',
      'シフト',
      'スタッフ',
      '計画',
      '労務',
      '組織',
      'データ管理',
      '設定',
    ]);
  });

  it('opens only one dropdown at a time', async () => {
    const user = userEvent.setup();
    render(
      <GlobalNav
        userName="西村健一"
        enabledSections={new Set<ManagerSection>(['shift-table', 'staff-list'])}
        onHome={() => {}}
        onOpenSection={() => {}}
        onLogout={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'シフト' }));
    expect(screen.getByRole('menu', { name: 'シフトメニュー' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'スタッフ' }));
    expect(screen.queryByRole('menu', { name: 'シフトメニュー' })).not.toBeInTheDocument();
    expect(screen.getByRole('menu', { name: 'スタッフメニュー' })).toBeVisible();
  });

  it('returns home from the brand button', async () => {
    const user = userEvent.setup();
    const onHome = vi.fn();
    render(
      <GlobalNav
        userName="西村健一"
        enabledSections={new Set<ManagerSection>(['shift-table', 'staff-list'])}
        onHome={onHome}
        onOpenSection={() => {}}
        onLogout={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: '暁夢シフト' }));
    expect(onHome).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/GlobalNav.test.tsx
```

Expected: FAIL because `GlobalNav.tsx` does not exist.

- [ ] **Step 3: Implement the exclusive dropdown navigation**

Create `frontend/src/components/manager/GlobalNav.tsx` with these public types and menu data:

```tsx
import { useEffect, useRef, useState } from 'react';

export type ManagerSection =
  | 'shift-table'
  | 'shift-settings'
  | 'collection'
  | 'recruitment'
  | 'confirmed-shifts'
  | 'messages'
  | 'staff-list'
  | 'staff-registration'
  | 'manager-registration'
  | 'rank-settings'
  | 'skill-settings'
  | 'fixed-shifts'
  | 'sales-plan'
  | 'labor-cost'
  | 'sales-per-hour'
  | 'model-shift'
  | 'labor-status'
  | 'attendance'
  | 'labor-alerts'
  | 'store-management'
  | 'departments'
  | 'positions'
  | 'permissions'
  | 'store-help'
  | 'csv-export'
  | 'csv-import'
  | 'integrations'
  | 'display-settings'
  | 'business-hours'
  | 'collection-settings'
  | 'notification-settings'
  | 'shift-patterns'
  | 'color-settings';

interface GlobalNavProps {
  userName: string;
  enabledSections: ReadonlySet<ManagerSection>;
  onHome: () => void;
  onOpenSection: (section: ManagerSection) => void;
  onLogout: () => void;
}

const NAV_GROUPS: {
  label: string;
  items: { label: string; section: ManagerSection }[];
}[] = [
  {
    label: 'シフト',
    items: [
      { label: 'シフト表', section: 'shift-table' },
      { label: 'シフト設定', section: 'shift-settings' },
      { label: '回収状況', section: 'collection' },
      { label: '追加募集', section: 'recruitment' },
      { label: '確定シフト', section: 'confirmed-shifts' },
      { label: 'メッセージ', section: 'messages' },
    ],
  },
  {
    label: 'スタッフ',
    items: [
      { label: 'スタッフ一覧', section: 'staff-list' },
      { label: 'スタッフ登録', section: 'staff-registration' },
      { label: '管理者登録', section: 'manager-registration' },
      { label: 'ランク設定', section: 'rank-settings' },
      { label: 'スキル設定', section: 'skill-settings' },
      { label: '固定シフト', section: 'fixed-shifts' },
    ],
  },
  {
    label: '計画',
    items: [
      { label: '売上計画', section: 'sales-plan' },
      { label: '人件費', section: 'labor-cost' },
      { label: '人時売上高', section: 'sales-per-hour' },
      { label: 'モデルシフト', section: 'model-shift' },
    ],
  },
  {
    label: '労務',
    items: [
      { label: '労務状況', section: 'labor-status' },
      { label: '勤怠', section: 'attendance' },
      { label: '労働時間アラート', section: 'labor-alerts' },
    ],
  },
  {
    label: '組織',
    items: [
      { label: '店舗管理', section: 'store-management' },
      { label: '部門', section: 'departments' },
      { label: 'ポジション', section: 'positions' },
      { label: '権限設定', section: 'permissions' },
      { label: '他事業所ヘルプ', section: 'store-help' },
    ],
  },
  {
    label: 'データ管理',
    items: [
      { label: 'CSVエクスポート', section: 'csv-export' },
      { label: 'CSVインポート', section: 'csv-import' },
      { label: '連携設定', section: 'integrations' },
    ],
  },
  {
    label: '設定',
    items: [
      { label: '表示設定', section: 'display-settings' },
      { label: '営業時間', section: 'business-hours' },
      { label: 'シフト回収設定', section: 'collection-settings' },
      { label: '通知設定', section: 'notification-settings' },
      { label: 'シフトパターン', section: 'shift-patterns' },
      { label: '色設定', section: 'color-settings' },
    ],
  },
];

export function GlobalNav({
  userName,
  enabledSections,
  onHome,
  onOpenSection,
  onLogout,
}: GlobalNavProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  function choose(section: ManagerSection) {
    setOpenMenu(null);
    onOpenSection(section);
  }

  return (
    <nav ref={rootRef} className="rk-global-nav" aria-label="管理メニュー">
      <button type="button" className="rk-global-nav__brand" onClick={onHome}>
        暁夢シフト
      </button>
      {NAV_GROUPS.map((group) => {
        const open = openMenu === group.label;
        return (
          <div className="rk-global-nav__group" key={group.label}>
            <button
              type="button"
              className="rk-global-nav__trigger"
              aria-expanded={open}
              onClick={() => setOpenMenu(open ? null : group.label)}
            >
              {group.label}
            </button>
            {open && (
              <div role="menu" aria-label={`${group.label}メニュー`} className="rk-global-nav__menu">
                {group.items.map((item) => (
                  <button
                    type="button"
                    role="menuitem"
                    key={item.section}
                    disabled={!enabledSections.has(item.section)}
                    aria-disabled={!enabledSections.has(item.section)}
                    onClick={() => choose(item.section)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="rk-global-nav__spacer" />
      <button
        type="button"
        className="rk-global-nav__icon"
        aria-label="ヘルプ"
        onClick={() => choose('shift-table')}
      >
        ?
      </button>
      <div className="rk-global-nav__group rk-global-nav__account">
        <button
          type="button"
          className="rk-global-nav__trigger"
          aria-expanded={openMenu === 'account'}
          onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
        >
          {userName}さん
        </button>
        {openMenu === 'account' && (
          <div role="menu" aria-label="アカウントメニュー" className="rk-global-nav__menu">
            <button type="button" role="menuitem" onClick={onLogout}>ログアウト</button>
          </div>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run the focused test**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/GlobalNav.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Replace only the navigation markup in `TopNav.tsx`**

Keep the existing modal state, API actions, registration forms, CSV actions, and settings content. Replace the `<nav>` and `<details>` markup with:

```tsx
<GlobalNav
  userName={me?.name ?? ''}
  enabledSections={new Set<ManagerSection>([
    'shift-table',
    'csv-export',
    ...Object.keys(SECTION_TO_MODAL) as ManagerSection[],
  ])}
  onHome={onHome ?? (() => {})}
  onOpenSection={(section) => {
    if (section === 'shift-table') {
      onHome?.();
      return;
    }
    if (section === 'csv-export') {
      exportCsv();
      return;
    }
    const modalKind = SECTION_TO_MODAL[section];
    if (modalKind) setModal(modalKind);
  }}
  onLogout={() => void logout()}
/>
```

Add an exact mapping for destinations already implemented by `TopNav`:

```ts
const SECTION_TO_MODAL: Partial<Record<ManagerSection, Exclude<ModalKind, null>>> = {
  'staff-list': 'staff',
  'staff-registration': 'regStaff',
  'manager-registration': 'regAdmin',
  'rank-settings': 'rank',
  'skill-settings': 'skills',
  'sales-plan': 'sales',
  'labor-cost': 'cost',
  'sales-per-hour': 'sph',
  'labor-status': 'laborStatus',
  'attendance': 'attendance',
  'labor-alerts': 'hoursAlert',
  'store-management': 'stores',
  departments: 'dept',
  permissions: 'perm',
  'csv-import': 'import',
  integrations: 'integ',
  'display-settings': 'display',
  'business-hours': 'hours',
  'collection-settings': 'collect',
  'notification-settings': 'notify',
};
```

Menu items without an implementation in this phase render with `disabled` and `aria-disabled="true"` inside `GlobalNav`. Existing working destinations remain operational.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/manager/GlobalNav.tsx frontend/src/components/manager/GlobalNav.test.tsx frontend/src/components/TopNav.tsx
git commit -m "feat(frontend): add reference global navigation"
```

---

### Task 3: Build the Reference Shift Toolbar

**Files:**
- Create: `frontend/src/components/manager/ShiftToolbar.tsx`
- Create: `frontend/src/components/manager/ShiftToolbar.test.tsx`

**Interfaces:**
- Consumes:
  - store and position option arrays
  - `ManagerView`
  - active date range
  - confirmation state
  - callbacks for store, position, view, period, print, confirm, settings, recruitment
- Produces: `ShiftToolbar`

- [ ] **Step 1: Write failing toolbar tests**

Create `frontend/src/components/manager/ShiftToolbar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShiftToolbar } from './ShiftToolbar';

function renderToolbar(overrides = {}) {
  const props = {
    stores: [{ id: '1', name: '中島店' }],
    storeId: '1',
    positions: ['ホール', 'キッチン'],
    position: 'ホール',
    view: 'month' as const,
    periodLabel: '2026年7月',
    deadlineLabel: '〜前月末 23:59',
    unconfirmedCount: 3,
    recruitmentCount: 1,
    onStoreChange: vi.fn(),
    onPositionChange: vi.fn(),
    onViewChange: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onConfirm: vi.fn(),
    onPrint: vi.fn(),
    onOpenShiftTypes: vi.fn(),
    onOpenDisplayItems: vi.fn(),
    onOpenRecruitment: vi.fn(),
    ...overrides,
  };
  render(<ShiftToolbar {...props} />);
  return props;
}

it('renders controls in reference order', () => {
  renderToolbar();
  const controls = screen.getAllByRole('button').map((node) => node.textContent?.trim());
  expect(controls).toEqual([
    'シフト確定 未確定あり 3件',
    '印刷',
    'シフトの種類',
    '日',
    '週',
    '半月',
    '月',
    '前へ',
    '次へ',
    '今月',
    '表示項目設定',
    '追加募集中 1件',
  ]);
});

it('changes the selected view', async () => {
  const user = userEvent.setup();
  const props = renderToolbar();
  await user.click(screen.getByRole('button', { name: '半月' }));
  expect(props.onViewChange).toHaveBeenCalledWith('half-month');
});

it('fires confirm and print actions', async () => {
  const user = userEvent.setup();
  const props = renderToolbar();
  await user.click(screen.getByRole('button', { name: /シフト確定/ }));
  await user.click(screen.getByRole('button', { name: '印刷' }));
  expect(props.onConfirm).toHaveBeenCalledOnce();
  expect(props.onPrint).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ShiftToolbar.test.tsx
```

Expected: FAIL because `ShiftToolbar.tsx` does not exist.

- [ ] **Step 3: Implement the toolbar**

Create `frontend/src/components/manager/ShiftToolbar.tsx`. Use two rows and this public interface:

```tsx
import type { Store } from '../../types';
import type { ManagerView } from './types';

interface ShiftToolbarProps {
  stores: Store[];
  storeId: string;
  positions: string[];
  position: string;
  view: ManagerView;
  periodLabel: string;
  deadlineLabel: string;
  unconfirmedCount: number;
  recruitmentCount: number;
  onStoreChange: (storeId: string) => void;
  onPositionChange: (position: string) => void;
  onViewChange: (view: ManagerView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onConfirm: () => void;
  onPrint: () => void;
  onOpenShiftTypes: () => void;
  onOpenDisplayItems: () => void;
  onOpenRecruitment: () => void;
}

const VIEW_OPTIONS: { value: ManagerView; label: string }[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '週' },
  { value: 'half-month', label: '半月' },
  { value: 'month', label: '月' },
];
```

Render:

```tsx
export function ShiftToolbar(props: ShiftToolbarProps) {
  return (
    <section className="rk-shift-toolbar" aria-label="シフト操作">
      <div className="rk-shift-toolbar__primary">
        <select
          aria-label="店舗"
          value={props.storeId}
          onChange={(event) => props.onStoreChange(event.target.value)}
        >
          {props.stores.map((store) => (
            <option value={store.id} key={store.id}>{store.name}</option>
          ))}
        </select>
        <select
          aria-label="ポジション"
          value={props.position}
          onChange={(event) => props.onPositionChange(event.target.value)}
        >
          {props.positions.map((position) => (
            <option value={position} key={position}>{position}</option>
          ))}
        </select>
        <button type="button" onClick={props.onConfirm}>
          シフト確定
          {props.unconfirmedCount > 0 && (
            <span className="rk-shift-toolbar__warning">未確定あり {props.unconfirmedCount}件</span>
          )}
        </button>
        <button type="button" onClick={props.onPrint}>印刷</button>
        <button type="button" onClick={props.onOpenShiftTypes}>シフトの種類</button>
      </div>
      <div className="rk-shift-toolbar__secondary">
        <div className="rk-view-switch" aria-label="表示期間">
          {VIEW_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={props.view === option.value}
              onClick={() => props.onViewChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" aria-label="前へ" onClick={props.onPrevious}>‹</button>
        <button type="button" aria-label="次へ" onClick={props.onNext}>›</button>
        <span className="rk-shift-toolbar__period">{props.periodLabel}</span>
        <button type="button" onClick={props.onToday}>今月</button>
        <span className="rk-shift-toolbar__deadline">提出期限 {props.deadlineLabel}</span>
        <button type="button" onClick={props.onOpenDisplayItems}>表示項目設定</button>
        <button type="button" onClick={props.onOpenRecruitment}>
          追加募集中 {props.recruitmentCount}件
        </button>
      </div>
    </section>
  );
}
```

Use visually hidden text or `aria-label` so the previous/next buttons are named `前へ` and `次へ` in tests while displaying only arrows.

- [ ] **Step 4: Run the toolbar tests**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ShiftToolbar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/manager/ShiftToolbar.tsx frontend/src/components/manager/ShiftToolbar.test.tsx
git commit -m "feat(frontend): add reference shift toolbar"
```

---

### Task 4: Build the Reference Display-Control Row

**Files:**
- Create: `frontend/src/components/manager/ShiftDisplayControls.tsx`
- Create: `frontend/src/components/manager/ShiftDisplayControls.test.tsx`

**Interfaces:**
- Consumes:
  - position label
  - `ShiftLayerVisibility`
  - `ShiftTableDensity`
  - `StaffSortMode`
  - callbacks for each state and action
- Produces: `ShiftDisplayControls`

- [ ] **Step 1: Write failing interaction tests**

Create `frontend/src/components/manager/ShiftDisplayControls.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHIFT_LAYERS } from './types';
import { ShiftDisplayControls } from './ShiftDisplayControls';

it('matches the reference checkbox order', () => {
  render(
    <ShiftDisplayControls
      position="キッチン"
      layers={DEFAULT_SHIFT_LAYERS}
      density="standard"
      sortMode="default"
      onLayersChange={() => {}}
      onDensityChange={() => {}}
      onSortChange={() => {}}
      onBulkAction={() => {}}
      onCopyPast={() => {}}
    />,
  );

  expect(screen.getAllByRole('checkbox').map((input) => input.parentElement?.textContent?.trim()))
    .toEqual([
      '上部固定',
      '出勤者のみ',
      'シフトパターン',
      '希望シフト',
      'タスク',
      '勤務メモ',
      '集計',
    ]);
});

it('updates layers and cycles density', async () => {
  const user = userEvent.setup();
  const onLayersChange = vi.fn();
  const onDensityChange = vi.fn();
  render(
    <ShiftDisplayControls
      position="キッチン"
      layers={DEFAULT_SHIFT_LAYERS}
      density="standard"
      sortMode="default"
      onLayersChange={onLayersChange}
      onDensityChange={onDensityChange}
      onSortChange={() => {}}
      onBulkAction={() => {}}
      onCopyPast={() => {}}
    />,
  );

  await user.click(screen.getByRole('checkbox', { name: '希望シフト' }));
  expect(onLayersChange).toHaveBeenCalledWith({
    ...DEFAULT_SHIFT_LAYERS,
    showRequests: false,
  });

  await user.click(screen.getByRole('button', { name: '縮小/拡大 標準' }));
  expect(onDensityChange).toHaveBeenCalledWith('large');
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ShiftDisplayControls.test.tsx
```

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement the control row**

Create `frontend/src/components/manager/ShiftDisplayControls.tsx` with these mappings:

```tsx
import type {
  ShiftLayerVisibility,
  ShiftTableDensity,
  StaffSortMode,
} from './types';

interface ShiftDisplayControlsProps {
  position: string;
  layers: ShiftLayerVisibility;
  density: ShiftTableDensity;
  sortMode: StaffSortMode;
  onLayersChange: (layers: ShiftLayerVisibility) => void;
  onDensityChange: (density: ShiftTableDensity) => void;
  onSortChange: (mode: StaffSortMode) => void;
  onBulkAction: () => void;
  onCopyPast: () => void;
}

const DENSITY_ORDER: ShiftTableDensity[] = ['small', 'standard', 'large'];
const DENSITY_LABEL: Record<ShiftTableDensity, string> = {
  small: '小',
  standard: '標準',
  large: '大',
};
const SORT_ORDER: StaffSortMode[] = ['default', 'name', 'hours', 'rank'];
const SORT_LABEL: Record<StaffSortMode, string> = {
  default: '標準',
  name: '氏名順',
  hours: '労働時間順',
  rank: 'ランク順',
};
```

Use this checkbox definition:

```tsx
const CHECKBOXES = [
  ['pinHeader', '上部固定'],
  ['onlyAssigned', '出勤者のみ'],
  ['showPatterns', 'シフトパターン'],
  ['showRequests', '希望シフト'],
  ['showTasks', 'タスク'],
  ['showNotes', '勤務メモ'],
  ['showSummary', '集計'],
] as const;
```

Render the position label first, then checkboxes, then buttons in this order:

```tsx
<button type="button" onClick={cycleDensity}>
  縮小/拡大 {DENSITY_LABEL[density]}
</button>
<button type="button" onClick={onBulkAction}>一括操作</button>
<button type="button" onClick={onCopyPast}>過去コピー</button>
<button type="button" onClick={cycleSort}>
  スタッフ並び替え {SORT_LABEL[sortMode]}
</button>
```

- [ ] **Step 4: Run focused tests**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ShiftDisplayControls.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/manager/ShiftDisplayControls.tsx frontend/src/components/manager/ShiftDisplayControls.test.tsx
git commit -m "feat(frontend): add reference shift display controls"
```

---

### Task 5: Derive Reference Shift Cells and Summary Data

**Files:**
- Modify: `frontend/src/components/manager/shiftViewModel.ts`
- Modify: `frontend/src/components/manager/shiftViewModel.test.ts`

**Interfaces:**
- Produces:
  - `getShiftCellModel(input): ShiftCellModel`
  - `getDailySummary(input): DailySummary`
  - `getModelShiftCoverage(input): ModelShiftCoverage[]`
- Consumes: requests, assignments, notes, staff rank, visible slot settings, sales target.

- [ ] **Step 1: Add failing cell and summary tests**

Append to `shiftViewModel.test.ts`:

```ts
import type { DayNote, ShiftRequest } from '../../types';
import {
  getDailySummary,
  getShiftCellModel,
} from './shiftViewModel';

const requests: ShiftRequest[] = [
  { staffId: '1', date: '2026-07-01', slot: 'early' },
];
const notes: DayNote[] = [
  { staffId: '1', date: '2026-07-01', text: '早番大丈夫です！' },
];

it('separates requested and assigned shift state', () => {
  expect(getShiftCellModel({
    staffId: '1',
    date: '2026-07-01',
    requests,
    assignments,
    notes,
  })).toEqual({
    request: { slot: 'early', label: '早番', time: '7:00-16:00' },
    assignment: { slot: 'early', label: '早番', time: '7:00-16:00' },
    note: '早番大丈夫です！',
  });
});

it('derives daily sales, hours, labor cost, and rank total', () => {
  expect(getDailySummary({
    date: '2026-07-01',
    assignments,
    staff,
    salesTarget: 90000,
  })).toEqual({
    sales: 90000,
    workHours: 18,
    laborCost: 19800,
    laborCostRate: 22,
    salesPerHour: 5000,
    rankTotal: 8,
  });
});
```

- [ ] **Step 2: Run the tests and verify missing exports**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/shiftViewModel.test.ts
```

Expected: FAIL because `getShiftCellModel` and `getDailySummary` are not exported.

- [ ] **Step 3: Implement the derivation functions**

Append to `shiftViewModel.ts`:

```ts
import type {
  DayNote,
  ShiftRequest,
  WorkSlot,
} from '../../types';
import {
  SLOT_HOURS,
  SLOT_LABELS,
  SLOT_TIMES,
  WORK_SLOTS,
} from '../../constants';
import {
  dailyLaborCost,
  dailyRankTotal,
  dailyWorkHours,
} from '../../store/labor';

interface ShiftDescriptor {
  slot: WorkSlot | 'off';
  label: string;
  time: string | null;
}

export interface ShiftCellModel {
  request: ShiftDescriptor | null;
  assignment: ShiftDescriptor | null;
  note: string | null;
}

export function getShiftCellModel({
  staffId,
  date,
  requests,
  assignments,
  notes,
}: {
  staffId: string;
  date: string;
  requests: ShiftRequest[];
  assignments: Assignment[];
  notes: DayNote[];
}): ShiftCellModel {
  const request = requests.find(
    (item) => item.staffId === staffId && item.date === date,
  );
  const assignment = WORK_SLOTS.find((slot) =>
    assignments.some(
      (item) =>
        item.date === date
        && item.slot === slot
        && item.staffIds.includes(staffId),
    ),
  );
  const note = notes.find(
    (item) => item.staffId === staffId && item.date === date,
  )?.text ?? null;

  return {
    request: request
      ? {
          slot: request.slot,
          label: request.slot === 'off' ? '休み' : SLOT_LABELS[request.slot],
          time: request.slot === 'off' ? null : SLOT_TIMES[request.slot],
        }
      : null,
    assignment: assignment
      ? {
          slot: assignment,
          label: SLOT_LABELS[assignment],
          time: SLOT_TIMES[assignment],
        }
      : null,
    note,
  };
}

export interface DailySummary {
  sales: number;
  workHours: number;
  laborCost: number;
  laborCostRate: number;
  salesPerHour: number;
  rankTotal: number;
}

export function getDailySummary({
  date,
  assignments,
  staff,
  salesTarget,
}: {
  date: string;
  assignments: Assignment[];
  staff: Staff[];
  salesTarget: number;
}): DailySummary {
  const workHours = dailyWorkHours(assignments, date);
  const laborCost = dailyLaborCost(assignments, date);
  return {
    sales: salesTarget,
    workHours,
    laborCost,
    laborCostRate: salesTarget > 0
      ? Math.round((laborCost / salesTarget) * 100)
      : 0,
    salesPerHour: workHours > 0 ? Math.round(salesTarget / workHours) : 0,
    rankTotal: dailyRankTotal(assignments, staff, date),
  };
}
```

Remove unused imports after implementation.

- [ ] **Step 4: Run the view-model test**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/shiftViewModel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/manager/shiftViewModel.ts frontend/src/components/manager/shiftViewModel.test.ts
git commit -m "feat(frontend): derive reference shift table data"
```

---

### Task 6: Build Reference Summary Rows

**Files:**
- Create: `frontend/src/components/manager/ShiftTableSummaryRows.tsx`
- Create: `frontend/src/components/manager/ShiftTableSummaryRows.test.tsx`

**Interfaces:**
- Consumes:
  - dates
  - assignments
  - staff
  - sales target
  - store notes
  - position notes
  - visible summary item keys
- Produces: table rows only; parent owns persistence callbacks.

- [ ] **Step 1: Write failing summary-row tests**

Create `frontend/src/components/manager/ShiftTableSummaryRows.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShiftTableSummaryRows } from './ShiftTableSummaryRows';

it('renders reference summary rows in order', () => {
  render(
    <table>
      <tbody>
        <ShiftTableSummaryRows
          dates={['2026-07-01']}
          assignments={[]}
          staff={[]}
          salesTarget={90000}
          storeNotes={[]}
          positionNotes={{}}
          visibleItems={[
            'sales',
            'salesPerHour',
            'workHours',
            'laborCost',
            'modelShift',
            'rankTotal',
            'storeNote',
            'positionNote',
          ]}
          requiredByBand={{ morning: 2, afternoon: 2, night: 2 }}
          onStoreNoteChange={() => {}}
          onPositionNoteChange={() => {}}
        />
      </tbody>
    </table>,
  );

  expect(screen.getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
    '売上計画',
    '人時売上高',
    '総労働時間',
    '人件費',
    '全体モデルシフト',
    '09:00 - 14:00',
    '14:00 - 19:00',
    '19:00 - 23:00',
    'ランク計',
    '店舗メモ',
    'ポジションメモ',
  ]);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ShiftTableSummaryRows.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the summary rows**

Create `frontend/src/components/manager/ShiftTableSummaryRows.tsx` with:

```ts
export type SummaryItemKey =
  | 'sales'
  | 'salesPerHour'
  | 'workHours'
  | 'laborCost'
  | 'modelShift'
  | 'rankTotal'
  | 'storeNote'
  | 'positionNote';
```

Use `getDailySummary` for each date. Render:

- `売上計画`: `¥90,000`
- `人時売上高`: `¥5,000`
- `総労働時間`: `18.00 h`
- `人件費`: first line amount, second line percentage
- `全体モデルシフト`: section row
- model bands: `actual/required`
- `ランク計`: integer
- memo rows: compact text buttons that invoke the provided callbacks.

Use `role="rowheader"` on every left label cell.

- [ ] **Step 4: Run focused tests**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ShiftTableSummaryRows.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/manager/ShiftTableSummaryRows.tsx frontend/src/components/manager/ShiftTableSummaryRows.test.tsx
git commit -m "feat(frontend): add reference shift summary rows"
```

---

### Task 7: Build Staff Rows and Shift Chips

**Files:**
- Create: `frontend/src/components/manager/ShiftStaffRow.tsx`
- Create: `frontend/src/components/manager/ShiftStaffRow.test.tsx`

**Interfaces:**
- Consumes:
  - one `Staff`
  - visible dates
  - requests, assignments, notes
  - layer visibility
  - display density
  - assignment callback
- Produces: one `<tr>` with reference-style staff identity and date cells.

- [ ] **Step 1: Write failing chip-state tests**

Create `frontend/src/components/manager/ShiftStaffRow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SHIFT_LAYERS } from './types';
import { ShiftStaffRow } from './ShiftStaffRow';

const person = {
  id: '1',
  name: '田中太郎',
  storeId: '1',
  employmentType: '正社員' as const,
  role: 'STAFF' as const,
  rank: 3,
  skills: [],
};

it('renders staff name, duration, request, assignment, and note', () => {
  render(
    <table>
      <tbody>
        <ShiftStaffRow
          person={person}
          dates={['2026-07-01']}
          requests={[{ staffId: '1', date: '2026-07-01', slot: 'early' }]}
          assignments={[{ date: '2026-07-01', slot: 'early', staffIds: ['1'] }]}
          notes={[{ staffId: '1', date: '2026-07-01', text: '早番大丈夫です！' }]}
          layers={DEFAULT_SHIFT_LAYERS}
          density="standard"
          onToggleAssignment={() => {}}
        />
      </tbody>
    </table>,
  );

  expect(screen.getByText('田中太郎')).toBeInTheDocument();
  expect(screen.getByText('9:00')).toBeInTheDocument();
  expect(screen.getByText('早番大丈夫です！')).toBeInTheDocument();
  expect(screen.getByText('早番', { selector: '.rk-shift-chip--request' })).toBeInTheDocument();
  expect(screen.getByText('早番', { selector: '.rk-shift-chip--assigned' })).toBeInTheDocument();
});

it('hides request and note layers independently', () => {
  render(
    <table>
      <tbody>
        <ShiftStaffRow
          person={person}
          dates={['2026-07-01']}
          requests={[{ staffId: '1', date: '2026-07-01', slot: 'early' }]}
          assignments={[]}
          notes={[{ staffId: '1', date: '2026-07-01', text: '早番大丈夫です！' }]}
          layers={{
            ...DEFAULT_SHIFT_LAYERS,
            showRequests: false,
            showNotes: false,
          }}
          density="standard"
          onToggleAssignment={() => {}}
        />
      </tbody>
    </table>,
  );

  expect(screen.queryByText('早番大丈夫です！')).not.toBeInTheDocument();
  expect(screen.queryByText('早番')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ShiftStaffRow.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the staff row**

Create `frontend/src/components/manager/ShiftStaffRow.tsx`.

Required DOM:

```tsx
<tr className="rk-shift-staff-row">
  <th scope="row" className="rk-shift-staff">
    <span className="rk-shift-staff__name">{person.name}</span>
    <span className="rk-shift-staff__hours">{formatDuration(totalHours)}</span>
    {warnings > 0 && <span className="rk-shift-staff__warning" aria-label={`${warnings}件の労務警告`}>!</span>}
  </th>
  {dates.map((date) => (
    <td className="rk-shift-cell" key={date}>
      {/* request, assignment, note in this order */}
    </td>
  ))}
</tr>
```

Chip rules:

- Request chip: dotted border, transparent/pale background, `rk-shift-chip--request`.
- Assignment chip: solid border, pale background, `rk-shift-chip--assigned`.
- Slot class: `rk-shift-chip--early`, `--mid`, `--late`, `--off`.
- Pattern mode uses time; normal mode uses labels.
- Notes use plain text below the chips, not a speech-bubble decoration.
- Assignment interaction is a real `<button>` with an accessible label containing staff, date, and action.

- [ ] **Step 4: Run the staff-row tests**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ShiftStaffRow.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/manager/ShiftStaffRow.tsx frontend/src/components/manager/ShiftStaffRow.test.tsx
git commit -m "feat(frontend): add reference shift staff rows"
```

---

### Task 8: Compose the Month, Half-Month, and Week Shift Table

**Files:**
- Create: `frontend/src/components/manager/ShiftTable.tsx`
- Create: `frontend/src/components/manager/ShiftTable.test.tsx`

**Interfaces:**
- Consumes summary-row and staff-row components plus manager display state.
- Produces the table for week, half-month, and month views.

- [ ] **Step 1: Write failing composition tests**

Create `frontend/src/components/manager/ShiftTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SHIFT_LAYERS } from './types';
import { ShiftTable } from './ShiftTable';

const baseProps = {
  dates: ['2026-07-01', '2026-07-02'],
  staff: [],
  requests: [],
  assignments: [],
  notes: [],
  storeNotes: [],
  positionNotes: {},
  layers: DEFAULT_SHIFT_LAYERS,
  density: 'standard' as const,
  sortMode: 'default' as const,
  salesTarget: 90000,
  requiredByBand: { morning: 2, afternoon: 2, night: 2 },
  onToggleAssignment: () => {},
  onStoreNoteChange: () => {},
  onPositionNoteChange: () => {},
};

it('renders date and weekday headers', () => {
  render(<ShiftTable {...baseProps} />);
  expect(screen.getByRole('columnheader', { name: '1(水)' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '2(木)' })).toBeInTheDocument();
});

it('removes summary rows when summary is hidden', () => {
  render(
    <ShiftTable
      {...baseProps}
      layers={{ ...DEFAULT_SHIFT_LAYERS, showSummary: false }}
    />,
  );
  expect(screen.queryByText('売上計画')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ShiftTable.test.tsx
```

Expected: FAIL because `ShiftTable.tsx` is missing.

- [ ] **Step 3: Implement the table composition**

Create `frontend/src/components/manager/ShiftTable.tsx`:

- Render `<div className="rk-shift-table-scroll">`.
- Render `<table className={`rk-shift-table rk-shift-table--${density}`}>`.
- Header first cell contains a real staff sort button.
- Date headers use `日付(曜日)` accessible names.
- Apply Saturday and Sunday classes based on weekday.
- Render `ShiftTableSummaryRows` only when `layers.showSummary`.
- Filter staff when `layers.onlyAssigned`.
- Sort staff with `sortShiftStaff`.
- Render `ShiftStaffRow` for every visible staff member.
- When no staff remain, render one table row containing `表示対象のスタッフがいません`.

- [ ] **Step 4: Run focused tests**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ShiftTable.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/manager/ShiftTable.tsx frontend/src/components/manager/ShiftTable.test.tsx
git commit -m "feat(frontend): compose reference shift table"
```

---

### Task 9: Build the Day Timeline

**Files:**
- Create: `frontend/src/components/manager/DayTimeline.tsx`
- Create: `frontend/src/components/manager/DayTimeline.test.tsx`

**Interfaces:**
- Consumes one date, business-hour bounds, staff, assignments, and adjustment callback.
- Produces the day bar view shown in `300.pdf`.

- [ ] **Step 1: Write failing geometry tests**

Create `frontend/src/components/manager/DayTimeline.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DayTimeline } from './DayTimeline';

it('positions an early shift between 7:00 and 16:00', () => {
  render(
    <DayTimeline
      date="2026-07-01"
      startHour={7}
      endHour={24}
      staff={[{
        id: '1',
        name: '田中太郎',
        storeId: '1',
        employmentType: '正社員',
        role: 'STAFF',
        rank: 3,
        skills: [],
      }]}
      assignments={[{
        date: '2026-07-01',
        slot: 'early',
        staffIds: ['1'],
      }]}
      onAdjust={() => {}}
    />,
  );

  const bar = screen.getByRole('button', { name: '田中太郎 7:00-16:00を編集' });
  expect(bar).toHaveStyle({
    left: `${(0 / 17) * 100}%`,
    width: `${(9 / 17) * 100}%`,
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/DayTimeline.test.tsx
```

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement the day timeline**

Create `frontend/src/components/manager/DayTimeline.tsx`.

Use a CSS grid:

```tsx
<section className="rk-day-timeline" aria-label={`${date}の日別シフト`}>
  <div className="rk-day-timeline__hours">
    {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
      <span key={index}>{String(startHour + index).padStart(2, '0')}:00</span>
    ))}
  </div>
  {staff.map((person) => (
    <div className="rk-day-timeline__row" key={person.id}>
      <span className="rk-day-timeline__staff">{person.name}</span>
      <div className="rk-day-timeline__track">
        {/* one button per assignment */}
      </div>
    </div>
  ))}
</section>
```

Map slots to times:

```ts
const SLOT_RANGE = {
  early: { start: 7, end: 16 },
  mid: { start: 11, end: 20 },
  late: { start: 15, end: 24 },
} as const;
```

Position:

```ts
const total = endHour - startHour;
const left = ((range.start - startHour) / total) * 100;
const width = ((range.end - range.start) / total) * 100;
```

- [ ] **Step 4: Run focused tests**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/DayTimeline.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/manager/DayTimeline.tsx frontend/src/components/manager/DayTimeline.test.tsx
git commit -m "feat(frontend): add reference day timeline"
```

---

### Task 10: Compose the Manager Shift Screen

**Files:**
- Create: `frontend/src/components/manager/ManagerShiftScreen.tsx`
- Create: `frontend/src/components/manager/ManagerShiftScreen.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes all manager components and `useApp`.
- Owns manager-only UI state:
  - selected view
  - anchor date
  - selected position
  - layer visibility
  - density
  - sort mode
- Produces the complete manager shift screen.

- [ ] **Step 1: Write the failing integration test**

Create `frontend/src/components/manager/ManagerShiftScreen.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../../store/AppContext';
import { ToastProvider } from '../ui/Toast';
import { mockManagerShiftApi } from '../../test/mockShiftApi';
import { ManagerShiftScreen } from './ManagerShiftScreen';

it('switches from month table to week table using the reference toolbar', async () => {
  mockManagerShiftApi(vi);
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <AppProvider>
        <ManagerShiftScreen />
      </AppProvider>
    </ToastProvider>,
  );

  await waitFor(() => expect(screen.getByText('田中太郎')).toBeInTheDocument());
  expect(screen.getAllByRole('columnheader')).toHaveLength(32);

  await user.click(screen.getByRole('button', { name: '週' }));
  expect(screen.getAllByRole('columnheader')).toHaveLength(8);
});
```

- [ ] **Step 2: Create the shared API mock**

Create `frontend/src/test/mockShiftApi.ts`:

```ts
type SpyApi = {
  spyOn: typeof import('vitest').vi.spyOn;
};

export function mockManagerShiftApi(vi: SpyApi) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    const response = (data: unknown) => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => data,
    } as Response);

    if (url.includes('/api/auth/me')) {
      return response({ id: 1, name: '西村健一', role: 'MANAGER', storeId: 1 });
    }
    if (url.endsWith('/api/stores')) {
      return response([{ id: 1, name: '中島店' }]);
    }
    if (url.includes('/staff')) {
      return response([
        {
          id: 2,
          name: '田中太郎',
          employmentType: '正社員',
          role: 'STAFF',
          rank: 3,
          skills: 'キッチン',
        },
      ]);
    }
    if (url.includes('/requests')) return response([]);
    if (url.includes('/assignments')) return response([]);
    if (url.includes('/day-notes')) return response([]);
    if (url.includes('/store-notes')) return response([]);
    if (url.includes('/recruitments')) return response([]);
    return response([]);
  });
}
```

- [ ] **Step 3: Run the integration test and verify failure**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ManagerShiftScreen.test.tsx
```

Expected: FAIL because `ManagerShiftScreen.tsx` does not exist.

- [ ] **Step 4: Implement manager-screen composition**

Create `frontend/src/components/manager/ManagerShiftScreen.tsx`.

State:

```ts
const [view, setView] = useState<ManagerView>('month');
const [anchorDate, setAnchorDate] = useState(`${month}-01`);
const [position, setPosition] = useState('ホール');
const [layers, setLayers] = useState(DEFAULT_SHIFT_LAYERS);
const [density, setDensity] = useSetting<ShiftTableDensity>(
  'akiyume-display-density',
  'standard',
);
const [sortMode, setSortMode] = useState<StaffSortMode>('default');
```

Composition order:

```tsx
const {
  stores,
  storeId,
  setStoreId,
  month,
  setMonth,
  staff,
  requests,
  assignments,
  dayNotes,
  storeNotes,
  toggleAssignment,
  setStoreNote,
  bulkAssignRequested,
} = useApp();
const monthDates = getMonthDates(
  Number(month.slice(0, 4)),
  Number(month.slice(5, 7)),
);
const dates = getManagerDateWindow({ monthDates, view, anchorDate });
const [positionNotes, setPositionNotes] = useSetting<Record<string, string>>(
  `akiyume-position-notes:${storeId}:${position}`,
  {},
);
const [requiredByBand] = useSetting(
  `akiyume-required:${storeId}:${position}`,
  { morning: 2, afternoon: 2, night: 2 },
);
const [salesTarget] = useSetting(
  `akiyume-sales:${storeId}`,
  DAILY_SALES_TARGET,
);

<main className="rk-manager">
  <ShiftToolbar
    stores={stores}
    storeId={String(storeId ?? '')}
    positions={['ホール', 'キッチン']}
    position={position}
    view={view}
    periodLabel={formatManagerPeriodLabel(view, dates)}
    deadlineLabel="〜前月末 23:59"
    unconfirmedCount={countUnconfirmedAssignments(requests, assignments, dates)}
    recruitmentCount={countActiveRecruitments(recruitments, dates)}
    onStoreChange={(id) => setStoreId(Number(id))}
    onPositionChange={setPosition}
    onViewChange={setView}
    onPrevious={() => moveManagerPeriod(-1)}
    onNext={() => moveManagerPeriod(1)}
    onToday={goToCurrentMonth}
    onConfirm={openConfirmationDialog}
    onPrint={() => window.print()}
    onOpenShiftTypes={openShiftTypeDialog}
    onOpenDisplayItems={openDisplayItemsDialog}
    onOpenRecruitment={openRecruitmentScreen}
  />
  <ShiftDisplayControls
    position={position}
    layers={layers}
    density={density}
    sortMode={sortMode}
    onLayersChange={setLayers}
    onDensityChange={setDensity}
    onSortChange={setSortMode}
    onBulkAction={() => void bulkAssignRequested(dates)}
    onCopyPast={copyPreviousPeriod}
  />
  {view === 'day'
    ? (
        <DayTimeline
          date={dates[0]}
          startHour={7}
          endHour={24}
          staff={staff}
          assignments={assignments}
          onAdjust={openAssignmentEditor}
        />
      )
    : (
        <ShiftTable
          dates={dates}
          staff={staff}
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
          onToggleAssignment={(date, slot, staffId, assigned) =>
            void toggleAssignment(date, slot, staffId, assigned)}
          onStoreNoteChange={(date, text) => void setStoreNote(date, text)}
          onPositionNoteChange={(date, text) =>
            setPositionNotes({ ...positionNotes, [date]: text })}
        />
      )}
</main>
```

Implement these local helpers in the same file with exact signatures:

```ts
function formatManagerPeriodLabel(view: ManagerView, dates: string[]): string;
function countUnconfirmedAssignments(
  requests: ShiftRequest[],
  assignments: Assignment[],
  dates: string[],
): number;
function countActiveRecruitments(
  recruitments: Recruitment[],
  dates: string[],
): number;
function moveManagerPeriod(direction: -1 | 1): void;
function goToCurrentMonth(): void;
function openConfirmationDialog(): void;
function openShiftTypeDialog(): void;
function openDisplayItemsDialog(): void;
function openRecruitmentScreen(): void;
function copyPreviousPeriod(): void;
function openAssignmentEditor(
  staffId: string,
  date: string,
  slot: WorkSlot,
): void;
```

In this phase, the four `open*` dialog functions call the existing manager actions already exposed by `TopNav` or `ManagerMatrix`; do not invent a new dialog appearance. Task 12 removes the old shift components only after these handlers are connected.

`TopNav` continues to render the extracted `GlobalNav` above `ManagerShiftScreen`, so all currently implemented menu destinations remain operational.

Navigation:

- Previous/next day: ±1 day.
- Previous/next week: ±7 days.
- Previous/next half-month: first half ↔ second half; crossing month updates `month`.
- Previous/next month: existing `setMonth`.

Persistence:

- Save density in localStorage through `useSetting`.
- Keep layers and sort mode in component state for this phase.

- [ ] **Step 5: Modify `App.tsx`**

Repair all mojibake and render:

```tsx
if (!me) return <Login />;

return me.role === 'MANAGER'
  ? (
      <>
        <TopNav onHome={() => setManagerHomeSignal((value) => value + 1)} />
        <ManagerShiftScreen homeSignal={managerHomeSignal} />
      </>
    )
  : <StaffApp />;
```

Add:

```ts
const [managerHomeSignal, setManagerHomeSignal] = useState(0);
```

`ManagerShiftScreen` resets to month/current month when `homeSignal` changes. Extract the existing staff branch into a local `StaffApp` function in `App.tsx` without changing staff behavior. Remove imports of `ManagerToolbar` and `ManagerMatrix`; retain the `TopNav` import.

- [ ] **Step 6: Run the integration and app tests**

Run:

```cmd
cd frontend
npx vitest run src/components/manager/ManagerShiftScreen.test.tsx src/components/manager
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/manager/ManagerShiftScreen.tsx frontend/src/components/manager/ManagerShiftScreen.test.tsx frontend/src/test/mockShiftApi.ts frontend/src/App.tsx
git commit -m "feat(frontend): compose reference manager shift screen"
```

---

### Task 11: Apply Reference-Faithful CSS and Remove Legacy Visual Leakage

**Files:**
- Modify: `frontend/src/styles.css`
- Test: all manager component tests

**Interfaces:**
- Consumes: `rk-*` class names from Tasks 2–10.
- Produces: the final visual system for phase 1.

- [ ] **Step 1: Add the reference design tokens**

At the end of the token section in `frontend/src/styles.css`, add:

```css
:root {
  --rk-blue: #1689dd;
  --rk-blue-dark: #1177c5;
  --rk-blue-pale: #eef7fd;
  --rk-text: #4c4c4c;
  --rk-muted: #8a8f95;
  --rk-rule: #dde2e6;
  --rk-header: #f2f4f5;
  --rk-saturday: #2d8ecf;
  --rk-sunday: #e46868;
  --rk-early: #d97777;
  --rk-early-bg: #fff4f4;
  --rk-mid: #89a83e;
  --rk-mid-bg: #f8fbe9;
  --rk-late: #4d8ebf;
  --rk-late-bg: #f0f8fd;
  --rk-off: #969696;
  --rk-off-bg: #f7f7f7;
  --rk-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN",
    "Yu Gothic", Meiryo, sans-serif;
}
```

- [ ] **Step 2: Style the global navigation from `上のバー.png`**

Add:

```css
.rk-global-nav {
  min-height: 40px;
  display: flex;
  align-items: stretch;
  background: var(--rk-blue);
  color: #fff;
  font-family: var(--rk-font);
  border-bottom: 1px solid var(--rk-blue-dark);
  position: relative;
  z-index: 100;
}

.rk-global-nav button {
  border: 0;
  border-right: 1px solid rgba(255, 255, 255, .58);
  border-radius: 0;
  background: transparent;
  color: inherit;
  min-height: 40px;
  padding: 0 15px;
  font-size: 13px;
  font-weight: 600;
}

.rk-global-nav button:hover,
.rk-global-nav button:focus-visible {
  background: rgba(255, 255, 255, .12);
  transform: none;
  box-shadow: none;
}

.rk-global-nav__spacer {
  flex: 1;
  border-right: 1px solid rgba(255, 255, 255, .58);
}

.rk-global-nav__group {
  position: relative;
}

.rk-global-nav__menu {
  position: absolute;
  top: 100%;
  left: 0;
  width: 190px;
  padding: 4px 0;
  background: #fff;
  border: 1px solid #cfd7dd;
  box-shadow: 0 5px 12px rgba(0, 0, 0, .15);
  color: var(--rk-text);
}

.rk-global-nav__menu button {
  width: 100%;
  display: block;
  min-height: 34px;
  padding: 0 14px;
  text-align: left;
  border: 0;
  color: var(--rk-text);
  font-weight: 400;
}

.rk-global-nav__menu button:hover,
.rk-global-nav__menu button:focus-visible {
  background: #edf6fc;
}

.rk-global-nav__account .rk-global-nav__menu {
  left: auto;
  right: 0;
}
```

- [ ] **Step 3: Style the toolbar and display controls from the reference images**

Add square, compact controls:

```css
.rk-manager {
  width: 100%;
  padding: 10px 16px 48px;
  background: #fff;
  color: var(--rk-text);
  font-family: var(--rk-font);
}

.rk-shift-toolbar {
  border-bottom: 1px solid var(--rk-rule);
}

.rk-shift-toolbar__primary,
.rk-shift-toolbar__secondary,
.rk-shift-display-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 42px;
}

.rk-shift-toolbar button,
.rk-shift-toolbar select,
.rk-shift-display-controls button {
  min-height: 30px;
  padding: 4px 11px;
  border: 1px solid #cfd6db;
  border-radius: 2px;
  background: #fff;
  color: var(--rk-text);
  font-size: 12px;
}

.rk-view-switch {
  display: inline-flex;
}

.rk-view-switch button {
  margin-left: -1px;
  border-radius: 0;
}

.rk-view-switch button[aria-pressed="true"] {
  background: var(--rk-blue);
  border-color: var(--rk-blue);
  color: #fff;
}

.rk-shift-display-controls {
  padding: 8px 0;
  border-bottom: 1px solid var(--rk-rule);
  font-size: 12px;
}

.rk-shift-display-controls__position {
  padding-left: 8px;
  border-left: 3px solid var(--rk-text);
  font-size: 14px;
  font-weight: 600;
  margin-right: 10px;
}
```

- [ ] **Step 4: Style the shift table from `シフト一覧.png` and `大きさ.png`**

Add:

```css
.rk-shift-table-scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
}

.rk-shift-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 11px;
}

.rk-shift-table th,
.rk-shift-table td {
  border: 1px solid var(--rk-rule);
  padding: 3px 4px;
  vertical-align: top;
}

.rk-shift-table thead th {
  height: 38px;
  background: var(--rk-header);
  text-align: center;
  font-weight: 500;
}

.rk-shift-table__staff-head,
.rk-shift-staff {
  width: 150px;
  min-width: 150px;
  position: sticky;
  left: 0;
  z-index: 2;
  background: #fff;
  text-align: left;
}

.rk-shift-table thead .rk-shift-table__staff-head {
  z-index: 4;
  background: var(--rk-header);
}

.rk-shift-cell {
  width: 94px;
  min-width: 94px;
  height: 64px;
  background: #fff;
}

.rk-shift-table--small {
  font-size: 10px;
}

.rk-shift-table--small .rk-shift-cell {
  width: 78px;
  min-width: 78px;
  height: 52px;
}

.rk-shift-table--large {
  font-size: 13px;
}

.rk-shift-table--large .rk-shift-cell {
  width: 112px;
  min-width: 112px;
  height: 76px;
}
```

- [ ] **Step 5: Style shift chips using reference line types**

Add:

```css
.rk-shift-chip {
  width: 100%;
  min-height: 20px;
  display: block;
  padding: 2px 5px;
  border-radius: 7px;
  font-size: 10px;
  line-height: 1.35;
  text-align: center;
  background: #fff;
}

.rk-shift-chip--request {
  border-style: dashed;
}

.rk-shift-chip--assigned {
  border-style: solid;
}

.rk-shift-chip--early {
  border-color: var(--rk-early);
  background: var(--rk-early-bg);
  color: #9f4d4d;
}

.rk-shift-chip--mid {
  border-color: var(--rk-mid);
  background: var(--rk-mid-bg);
  color: #647d26;
}

.rk-shift-chip--late {
  border-color: var(--rk-late);
  background: var(--rk-late-bg);
  color: #356e98;
}

.rk-shift-chip--off {
  border-color: var(--rk-off);
  background: var(--rk-off-bg);
  color: #666;
}

.rk-shift-cell__note {
  display: block;
  margin-top: 3px;
  color: #777;
  font-size: 9px;
  line-height: 1.25;
  white-space: normal;
}
```

- [ ] **Step 6: Add accessibility and motion rules**

Add:

```css
.rk-global-nav button:focus-visible,
.rk-shift-toolbar button:focus-visible,
.rk-shift-toolbar select:focus-visible,
.rk-shift-display-controls button:focus-visible,
.rk-shift-chip:focus-visible {
  outline: 2px solid #0b64a4;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .rk-global-nav button,
  .rk-shift-toolbar button,
  .rk-shift-display-controls button,
  .rk-shift-chip {
    transition: none;
  }
}
```

- [ ] **Step 7: Run all manager tests and build**

Run:

```cmd
cd frontend
npx tsc --noEmit
npm test
npm run build
```

Expected:

- Type check exits 0.
- All tests pass.
- Vite build succeeds.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style(frontend): match reference manager shift UI"
```

---

### Task 12: Remove Replaced Legacy Shift Components

**Files:**
- Delete: `frontend/src/components/ManagerMatrix.tsx`
- Delete: `frontend/src/components/ManagerToolbar.tsx`
- Delete: `frontend/src/components/ManagerMatrix.test.tsx`
- Modify: `frontend/src/components/TopNav.tsx`
- Modify: `frontend/src/lib/date.ts`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: new manager components are already active.
- Produces: no duplicate manager implementation remains.

- [ ] **Step 1: Confirm no active imports remain**

Run:

```cmd
cd frontend
rg "ManagerMatrix|ManagerToolbar|sliceByView" src
```

Expected:

- Only definitions in the legacy files and deprecated helper remain.
- `App.tsx` and new manager components do not import them.

- [ ] **Step 2: Delete the replaced files**

Delete:

```text
frontend/src/components/ManagerMatrix.tsx
frontend/src/components/ManagerToolbar.tsx
frontend/src/components/ManagerMatrix.test.tsx
```

- [ ] **Step 3: Remove deprecated date helper**

Delete `sliceByView` from `frontend/src/lib/date.ts` and remove any related tests.

- [ ] **Step 4: Retain `TopNav.tsx` as follow-up migration source**

Do not delete or rewrite its destination modal implementations in this phase. Confirm that `App.tsx` still imports it and no longer imports the replaced shift components:

```cmd
cd frontend
rg "TopNav|ManagerToolbar|ManagerMatrix" src/App.tsx
```

Expected:

```text
TopNav import and render are present.
ManagerToolbar and ManagerMatrix have no matches.
```

- [ ] **Step 5: Remove unused legacy CSS**

Run:

```cmd
cd frontend
rg "mgr-toolbar|matrix-section|cat-row|matrix-wrap|staff-cell" src
```

Remove only unreferenced legacy shift-table selectors. Keep `topnav` selectors because `TopNav.tsx` is retained for the follow-up destination-screen migration. Do not remove staff-screen or shared-view selectors.

- [ ] **Step 6: Run the full frontend verification**

Run:

```cmd
cd frontend
npx tsc --noEmit
npm test
npm run build
```

Expected: all commands pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "refactor(frontend): remove legacy manager shift UI"
```

---

### Task 13: Visual Reference Verification

**Files:**
- Modify only files with verified visual differences from Task 11.
- Do not add production screenshot files.

**Interfaces:**
- Consumes: running frontend and backend.
- Produces: visually verified phase-1 manager shift screen.

- [ ] **Step 1: Start the backend**

Run in one terminal:

```cmd
cd backend
mvnw.cmd spring-boot:run
```

Expected: Spring Boot starts on `http://localhost:8080`.

- [ ] **Step 2: Start the frontend**

Run in another terminal:

```cmd
cd frontend
npm run dev
```

Expected: Vite starts on `http://localhost:5173`.

- [ ] **Step 3: Capture required states**

Use the in-app browser and capture:

1. Global navigation with one dropdown open.
2. Month view with summary rows visible.
3. Half-month view matching `大きさ.png`.
4. Week view matching `別パターン.png`.
5. Week view with `シフトパターン`, `希望シフト`, `タスク`, and `勤務メモ` enabled.
6. Day timeline matching the bar display in `300.pdf`.
7. Small, standard, and large density.
8. Summary hidden.

- [ ] **Step 4: Compare against the reference checklist**

For every capture, verify:

```text
[ ] navigation blue and white dividers
[ ] control order
[ ] control height
[ ] table line color and thickness
[ ] staff column width
[ ] date column width
[ ] row height
[ ] Saturday/Sunday color
[ ] request dotted line
[ ] assignment solid line
[ ] chip radius
[ ] note placement
[ ] summary row order
[ ] no inner vertical scrollbar
[ ] no emoji
[ ] no unreferenced card UI
[ ] no regression from a baseline detail that was already closer to the reference
```

- [ ] **Step 5: Fix only observed differences**

Adjust `frontend/src/styles.css` or the smallest responsible manager component. Do not introduce new UI behavior during this step.

- [ ] **Step 6: Re-run full verification**

Run:

```cmd
cd frontend
npx tsc --noEmit
npm test
npm run build
```

Then:

```cmd
cd ..\backend
mvnw.cmd test
```

Expected:

- Frontend type check passes.
- Frontend tests pass.
- Frontend build succeeds.
- Backend tests pass.

- [ ] **Step 7: Review the final diff**

Run:

```cmd
git diff --check
git status --short
git diff --stat
```

Confirm:

- No temporary screenshots or rendered PDF pages are tracked.
- No reference files under `要件定義/` were changed.
- No local assistant configuration files were staged.
- No mojibake remains in modified files.

- [ ] **Step 8: Commit**

```bash
git add frontend/src
git commit -m "fix(frontend): align manager shift UI with references"
```

---

## Follow-Up Plans

This plan intentionally completes the manager shell and shift-table subproject only. Execute these later as separate plans so each remains reviewable and testable:

1. **Reference Shift Collection and Settings**
   - `300.pdf` recovery/settings pages
   - collection preview, deadlines, reminders, business hours
2. **Reference Shift Patterns and Planning**
   - shift pattern CRUD, fixed shifts, 16 colors, model shift editor
3. **Reference Adjustment and Confirmation**
   - recruitment, chat, other-store help, confirmation target selection, notifications
4. **Reference Registration and Staff Flow**
   - staff/admin registration, invitation URL, status, staff shift submission and confirmation

Do not begin a follow-up plan until phase 1 passes the visual reference checklist.
