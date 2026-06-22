# 暁夢シフト UI 全面刷新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存の3機能（希望提出・割り当て・確定シフト共有）を保ったまま、見た目と操作感を商用 SaaS 品質（清潔＆プロ／インディゴ基調／レスポンシブ）へ全面刷新する。

**Architecture:** 依存追加なしの手書きモダンCSS。`styles.css` をデザイントークン（CSS変数）で全面リライトし、React 構造は概ね維持。再利用 UI 部品（Toast/Badge/Skeleton/Legend/SummaryBar）を `src/components/ui/` に追加。API 連携（`AppContext`/`api/client`）とドメインロジック（`lib/date`・`store/requests`・`store/assignments`）は変更しない。

**Tech Stack:** React 18 + Vite + TypeScript、Vitest + @testing-library/react（既存）。スタイルは素の CSS。

## Global Constraints

- コミットメッセージは Claude 帰属トレーラーを付けないプレーンなメッセージにする。
- frontend のコマンドは `frontend/` ディレクトリで実行する。
- Tailwind CSS や UI ライブラリなど、新しいランタイム依存は追加しない。
- API 連携（`AppContext` / `api/client`）とドメインロジック（`lib/date`・`store/requests`・`store/assignments`）は変更しない。
- 既存のテキストラベル（「早番人数」「遅番人数」「山田（店長）」等）は維持し、既存テストを壊さない。
- キーボードフォーカスを視認可能にし、モーダルは `Escape` キーと背景クリックで閉じられるようにする。
- `prefers-reduced-motion: reduce` を尊重し、アニメーションを無効化できるようにする。

---

## File Structure

```
frontend/src/
├── styles.css                       # 改修: トークン + 全画面スタイルを全面リライト
├── main.tsx                         # 改修: ToastProvider を巻く
├── App.tsx                          # 改修: ローディングスケルトン・今月ボタン・セグメントタブ
├── components/
│   ├── Header.tsx                   # 改修: トップバー + ユーザーチップ
│   ├── Login.tsx                    # 改修: カード型 + デモチップ
│   ├── RequestEditor.tsx            # 改修: サマリー + ボトムシート + トースト
│   ├── ManagerMatrix.tsx            # 改修: sticky + 充足バー + 凡例
│   ├── ManagerMatrix.test.tsx       # 維持（必要なら微修正）
│   ├── SharedView.tsx               # 改修: チップ + 空状態
│   ├── MonthCalendar.tsx            # 改修: 操作セルを button 化
│   ├── MonthCalendar.test.tsx       # 新規: キーボード操作可能な意味構造
│   └── ui/                          # 新規ディレクトリ
│       ├── Badge.tsx                # 新規
│       ├── Skeleton.tsx             # 新規
│       ├── Toast.tsx                # 新規（Provider + useToast）
│       ├── Toast.test.tsx           # 新規
│       ├── BottomSheet.tsx          # 新規（希望選択ダイアログ）
│       ├── BottomSheet.test.tsx     # 新規
│       ├── Legend.tsx               # 新規
│       ├── summary.ts               # 新規（集計の純粋関数）
│       ├── summary.test.ts          # 新規
│       └── SummaryBar.tsx           # 新規
```

---

## Task 1: デザイントークン + スタイル全面リライト

**Files:**
- Modify: `frontend/src/styles.css`（全置換）

**Interfaces:**
- Consumes: 既存コンポーネントのクラス名と、Task 2〜11 で追加する `.btn` / `.card` / `.badge` / `.sheet` / `.toast` / `.summary` / `.legend` / `.skeleton`。
- Produces: 全画面で共有する CSS トークンとレスポンシブ・アクセシビリティ規則。

- [ ] **Step 1: styles.css を全置換**

`frontend/src/styles.css` を以下で完全に置き換える:

```css
:root {
  /* palette */
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
  /* radius / shadow / motion */
  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 16px;
  --sh-sm: 0 1px 2px rgba(15, 23, 42, .06), 0 1px 3px rgba(15, 23, 42, .08);
  --sh-md: 0 4px 12px rgba(15, 23, 42, .08), 0 2px 4px rgba(15, 23, 42, .04);
  --t: 160ms cubic-bezier(.2, .7, .3, 1);
  font-family: system-ui, -apple-system, 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif;
  color: var(--text);
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }
button { font-family: inherit; }
button:focus-visible, select:focus-visible, input:focus-visible, [tabindex]:focus-visible {
  outline: 3px solid rgba(79, 70, 229, .28);
  outline-offset: 2px;
}

.app { max-width: 1040px; margin: 0 auto; padding: 0 14px 96px; }
.screen { margin-top: 12px; }
.hint { color: var(--muted); font-size: 13px; margin: 10px 2px; }

/* ---- buttons ---- */
.btn {
  border: 1px solid transparent; border-radius: var(--r-sm); padding: 9px 14px;
  font-size: 15px; cursor: pointer; transition: transform var(--t), background var(--t), box-shadow var(--t);
  background: #fff; color: var(--text);
}
.btn:active { transform: translateY(1px) scale(.99); }
.btn-sm { padding: 6px 10px; font-size: 13px; }
.btn-block { width: 100%; }
.btn-primary { background: var(--primary); color: #fff; box-shadow: var(--sh-sm); }
.btn-primary:hover { background: var(--primary-dark); }
.btn-primary:disabled { opacity: .6; cursor: default; }
.btn-soft { background: var(--primary-soft); color: var(--primary-dark); }
.btn-ghost { background: transparent; border-color: var(--line); color: var(--text); }
.btn-ghost:hover { background: #f1f5f9; }

/* ---- card ---- */
.card { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh-sm); }

/* ---- badge ---- */
.badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.badge-manager { background: var(--primary-soft); color: var(--primary-dark); }
.badge-staff { background: var(--off-soft); color: var(--muted); }

/* ---- topbar ---- */
.topbar {
  position: sticky; top: 0; z-index: 20; background: rgba(248, 250, 252, .9); backdrop-filter: blur(8px);
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 2px; border-bottom: 1px solid var(--line);
}
.logo { font-size: 19px; font-weight: 800; color: var(--primary); letter-spacing: .01em; }
.store-select { padding: 8px 12px; font-size: 15px; border: 1px solid var(--line); border-radius: var(--r-sm); background: #fff; }
.user-chip { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.user-name { font-size: 14px; color: var(--muted); }

/* ---- month nav ---- */
.month-nav { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 16px 0 8px; }
.month-title { font-size: 18px; font-weight: 700; min-width: 150px; text-align: center; }
.today-btn { margin-left: 6px; }

/* ---- segmented tabs ---- */
.segment { display: flex; gap: 6px; background: #eef1f6; padding: 4px; border-radius: var(--r-md); }
.segment button {
  flex: 1; padding: 10px; font-size: 14px; font-weight: 600; border: none; background: transparent;
  color: var(--muted); border-radius: var(--r-sm); cursor: pointer; transition: all var(--t);
}
.segment button.active { background: #fff; color: var(--primary-dark); box-shadow: var(--sh-sm); }

/* ---- calendar ---- */
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.cal-head { text-align: center; font-size: 12px; color: var(--muted); padding: 4px 0; font-weight: 600; }
.cal-cell {
  min-height: 70px; border: 1px solid var(--line); border-radius: var(--r-md); padding: 6px; background: #fff;
  color: inherit; font: inherit; text-align: left; width: 100%; cursor: pointer;
  transition: border-color var(--t), box-shadow var(--t), transform var(--t);
}
.cal-cell:hover { border-color: var(--primary); box-shadow: var(--sh-sm); }
.cal-cell:active { transform: scale(.98); }
.cal-cell .day-num { font-size: 12px; color: var(--muted); font-weight: 600; }
.cal-cell.empty { border: none; background: transparent; cursor: default; }

/* ---- chips ---- */
.chip { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; margin: 1px 2px 1px 0; }
.chip.early { background: var(--early-soft); color: #92400e; }
.chip.late { background: var(--late-soft); color: #3730a3; }
.chip.off { background: var(--off-soft); color: var(--muted); }

/* ---- summary bar ---- */
.summary { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: var(--r-lg); background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; box-shadow: var(--sh-md); }
.summary-main { display: flex; align-items: baseline; gap: 6px; }
.summary-num { font-size: 28px; font-weight: 800; line-height: 1; }
.summary-unit { font-size: 13px; opacity: .9; }
.summary-tags { margin-left: auto; display: flex; gap: 6px; }
.summary-tags .chip { background: rgba(255, 255, 255, .22); color: #fff; }

/* ---- request picker (bottom sheet) ---- */
.sheet-backdrop { position: fixed; inset: 0; border: 0; padding: 0; background: rgba(15, 23, 42, .35); z-index: 40; animation: fade var(--t); }
.sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; background: #fff; border-radius: var(--r-lg) var(--r-lg) 0 0;
  padding: 12px 16px 24px; box-shadow: 0 -8px 30px rgba(15, 23, 42, .18); animation: rise var(--t);
  max-width: 540px; margin: 0 auto;
}
.sheet-handle { width: 40px; height: 4px; border-radius: 999px; background: var(--line); margin: 0 auto 12px; }
.sheet-title { font-weight: 700; margin-bottom: 12px; text-align: center; }
.sheet-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pick { padding: 14px; font-size: 15px; font-weight: 600; border: 2px solid var(--line); background: #fff; border-radius: var(--r-md); cursor: pointer; transition: all var(--t); }
.pick:active { transform: scale(.98); }
.pick.sel-early { border-color: var(--early); background: var(--early-soft); color: #92400e; }
.pick.sel-late { border-color: var(--late); background: var(--late-soft); color: #3730a3; }
.pick.sel-off { border-color: var(--off); background: var(--off-soft); color: var(--muted); }
.pick.clear { grid-column: 1 / -1; border-style: dashed; color: var(--muted); }

/* ---- manager matrix ---- */
.matrix-section { margin-top: 4px; }
.legend { display: flex; flex-wrap: wrap; gap: 14px; margin: 8px 2px 12px; font-size: 12px; color: var(--muted); }
.legend-item { display: inline-flex; align-items: center; gap: 5px; }
.dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
.dot.low { background: var(--low); }
.dot.ok { background: var(--ok); }
.dot.over { background: var(--over); }

.matrix-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--r-lg); background: #fff; box-shadow: var(--sh-sm); }
.matrix { border-collapse: separate; border-spacing: 0; font-size: 13px; font-variant-numeric: tabular-nums; width: 100%; }
.matrix th, .matrix td { border-bottom: 1px solid var(--line); border-right: 1px solid var(--line); padding: 6px 8px; text-align: center; min-width: 38px; }
.matrix thead th { position: sticky; top: 0; background: #f8fafc; z-index: 2; font-weight: 700; color: var(--muted); }
.matrix th.staff-name, .matrix td.staff-name { text-align: left; white-space: nowrap; position: sticky; left: 0; background: #fff; z-index: 1; font-weight: 600; box-shadow: 1px 0 0 var(--line); }
.matrix thead th.staff-name { z-index: 3; background: #f8fafc; }
.cell-btn { cursor: pointer; user-select: none; transition: background var(--t); }
.cell-btn.req-early { background: var(--early-soft); color: #92400e; font-weight: 700; }
.cell-btn.req-late { background: var(--late-soft); color: #3730a3; font-weight: 700; }
.cell-btn.req-off { background: var(--off-soft); color: var(--muted); }
.cell-btn.assigned { outline: 2px solid var(--primary); outline-offset: -2px; }
.count-row td { background: #fbfcfe; }
.count { vertical-align: middle; }
.count-num { font-weight: 700; }
.count.low .count-num { color: var(--low); }
.count.ok .count-num { color: var(--ok); }
.count.over .count-num { color: var(--over); }
.fill-bar { display: block; height: 4px; border-radius: 999px; background: var(--line); margin-top: 3px; overflow: hidden; }
.fill { display: block; height: 100%; border-radius: 999px; }
.fill.low { background: var(--low); }
.fill.ok { background: var(--ok); }
.fill.over { background: var(--over); }

/* ---- shared view ---- */
.shared-slot { display: flex; flex-direction: column; gap: 1px; margin-top: 3px; font-size: 11px; }
.shared-names { color: var(--text); line-height: 1.3; }
.empty, .empty-inline { color: var(--muted); text-align: center; padding: 24px; }
.empty-inline { background: #fff; border: 1px dashed var(--line); border-radius: var(--r-md); margin-bottom: 12px; }

/* ---- login ---- */
.login { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 16px; }
.login-card { width: 100%; max-width: 380px; padding: 28px 24px; }
.login-brand { text-align: center; margin-bottom: 20px; }
.login-logo { font-size: 24px; font-weight: 800; color: var(--primary); }
.login-tagline { color: var(--muted); font-size: 14px; margin: 6px 0 0; }
.login-form { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; font-size: 13px; color: var(--muted); font-weight: 600; }
.field input { padding: 11px 12px; font-size: 16px; border: 1px solid var(--line); border-radius: var(--r-sm); background: #fff; }
.field input:focus { outline: 2px solid var(--primary-soft); border-color: var(--primary); }
.form-error { color: var(--low); font-size: 13px; margin: 0; }
.login-demo { margin-top: 20px; border-top: 1px solid var(--line); padding-top: 16px; }
.login-demo-title { font-size: 12px; color: var(--muted); margin: 0 0 8px; }
.login-demo-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip-btn { padding: 7px 12px; font-size: 13px; border: 1px solid var(--line); background: #fff; border-radius: 999px; cursor: pointer; transition: all var(--t); }
.chip-btn:hover { border-color: var(--primary); color: var(--primary-dark); background: var(--primary-soft); }

/* ---- toast ---- */
.toast {
  position: fixed; left: 50%; bottom: 88px; transform: translateX(-50%); z-index: 60;
  background: var(--text); color: #fff; padding: 11px 18px; border-radius: 999px; font-size: 14px;
  box-shadow: var(--sh-md); animation: rise var(--t);
}

/* ---- skeleton / loading ---- */
.skeleton { display: block; background: linear-gradient(90deg, #eef1f6 25%, #e2e8f0 37%, #eef1f6 63%); background-size: 400% 100%; animation: shimmer 1.4s ease infinite; }
.loading-screen { display: flex; flex-direction: column; gap: 14px; padding-top: 20px; }

@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
@keyframes rise { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes modal-rise { from { transform: translate(-50%, calc(-50% + 12px)); opacity: 0; } to { transform: translate(-50%, -50%); opacity: 1; } }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }

/* ---- responsive ---- */
@media (max-width: 640px) {
  .app { padding: 0 10px 96px; }
  .logo { font-size: 17px; }
  .cal-cell { min-height: 58px; }
  .summary-num { font-size: 24px; }
  /* segmented tabs を下部固定に */
  .segment {
    position: fixed; left: 10px; right: 10px; bottom: 12px; z-index: 30;
    box-shadow: var(--sh-md); background: #fff; border: 1px solid var(--line);
  }
}
@media (min-width: 641px) {
  /* PC では sheet を中央モーダル風に */
  .sheet { left: 50%; right: auto; bottom: auto; top: 50%; transform: translate(-50%, -50%); border-radius: var(--r-lg); width: 460px; animation-name: modal-rise; }
  .sheet-handle { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
```

- [ ] **Step 2: 型チェックと既存テストが壊れていないか確認**

Run: `cd frontend && npx tsc --noEmit && npm test`
Expected: tsc エラーなし、既存25テスト PASS（CSSのみの変更なので影響なし）

- [ ] **Step 3: コミット**

```bash
cd C:/Users/User/shift-app
git add frontend/src/styles.css
git commit -m "feat(frontend): rewrite styles with indigo design tokens"
```

---

## Task 2: UI プリミティブ（Badge, Skeleton）

**Files:**
- Create: `frontend/src/components/ui/Badge.tsx`, `frontend/src/components/ui/Skeleton.tsx`

**Interfaces:**
- Consumes: Task 1 の `.badge-*` と `.skeleton`。
- Produces: `Badge({ tone: 'manager' | 'staff', children })`、`Skeleton({ height?, width?, radius? })`。

- [ ] **Step 1: Badge を作成**

Create `frontend/src/components/ui/Badge.tsx`:

```tsx
import type { ReactNode } from 'react';

export type BadgeTone = 'manager' | 'staff';

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
```

- [ ] **Step 2: Skeleton を作成**

Create `frontend/src/components/ui/Skeleton.tsx`:

```tsx
interface SkeletonProps { height?: number; width?: number | string; radius?: number; }

export function Skeleton({ height = 16, width = '100%', radius = 8 }: SkeletonProps) {
  return <span className="skeleton" style={{ height, width, borderRadius: radius }} />;
}
```

- [ ] **Step 3: 型チェック + コミット**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

```bash
cd C:/Users/User/shift-app
git add frontend/src/components/ui/Badge.tsx frontend/src/components/ui/Skeleton.tsx
git commit -m "feat(frontend): add Badge and Skeleton primitives"
```

---

## Task 3: Toast（Provider + useToast）TDD

**Files:**
- Create: `frontend/src/components/ui/Toast.tsx`, `frontend/src/components/ui/Toast.test.tsx`

**Interfaces:**
- Consumes: Task 1 の `.toast`。
- Produces: `ToastProvider({ children })` と `useToast(): { showToast(message: string): void }`。

- [ ] **Step 1: 失敗するテストを書く**

Create `frontend/src/components/ui/Toast.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function Trigger() {
  const { showToast } = useToast();
  return <button onClick={() => showToast('保存しました ✓')}>save</button>;
}

afterEach(() => { vi.useRealTimers(); });

describe('Toast', () => {
  it('shows a message then auto-dismisses', () => {
    vi.useFakeTimers();
    render(<ToastProvider><Trigger /></ToastProvider>);
    act(() => { screen.getByText('save').click(); });
    expect(screen.getByText('保存しました ✓')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2600); });
    expect(screen.queryByText('保存しました ✓')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `cd frontend && npx vitest run src/components/ui/Toast.test.tsx`
Expected: FAIL（Toast 未実装）

- [ ] **Step 3: Toast を実装**

Create `frontend/src/components/ui/Toast.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastContextValue { showToast: (message: string) => void; }

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2500);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && <div className="toast" role="status">{message}</div>}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd frontend && npx vitest run src/components/ui/Toast.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd C:/Users/User/shift-app
git add frontend/src/components/ui/Toast.tsx frontend/src/components/ui/Toast.test.tsx
git commit -m "feat(frontend): add Toast provider with auto-dismiss"
```

---

## Task 4: 希望サマリー集計（summary.ts）TDD + SummaryBar

**Files:**
- Create: `frontend/src/components/ui/summary.ts`, `frontend/src/components/ui/summary.test.ts`, `frontend/src/components/ui/SummaryBar.tsx`

**Interfaces:**
- Consumes: `getDayRequest(requests, staffId, date)`、Task 1 の `.summary` / `.chip`。
- Produces: `summarizeRequests(requests, staffId, dates): RequestSummary` と `SummaryBar`。

- [ ] **Step 1: 失敗するテストを書く**

Create `frontend/src/components/ui/summary.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { summarizeRequests } from './summary';
import type { ShiftRequest } from '../../types';

const dates = ['2026-07-01', '2026-07-02', '2026-07-03'];

describe('summarizeRequests', () => {
  it('counts none/early/late/both/off across the month', () => {
    const reqs: ShiftRequest[] = [
      { staffId: 'p1', date: '2026-07-01', slot: 'early' },
      { staffId: 'p1', date: '2026-07-02', slot: 'early' },
      { staffId: 'p1', date: '2026-07-02', slot: 'late' }, // both
      { staffId: 'p2', date: '2026-07-01', slot: 'late' }, // 別スタッフは無視
    ];
    const s = summarizeRequests(reqs, 'p1', dates);
    expect(s.total).toBe(3);
    expect(s.submitted).toBe(2);
    expect(s.early).toBe(2); // 7/1 early + 7/2 both
    expect(s.late).toBe(1);  // 7/2 both
    expect(s.off).toBe(0);
  });

  it('counts off days', () => {
    const reqs: ShiftRequest[] = [{ staffId: 'p1', date: '2026-07-03', slot: 'off' }];
    const s = summarizeRequests(reqs, 'p1', dates);
    expect(s.submitted).toBe(1);
    expect(s.off).toBe(1);
    expect(s.early).toBe(0);
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `cd frontend && npx vitest run src/components/ui/summary.test.ts`
Expected: FAIL（summary 未実装）

- [ ] **Step 3: summary.ts を実装**

Create `frontend/src/components/ui/summary.ts`:

```ts
import type { ShiftRequest } from '../../types';
import { getDayRequest } from '../../store/requests';

export interface RequestSummary {
  total: number;
  submitted: number;
  early: number;
  late: number;
  off: number;
}

export function summarizeRequests(
  requests: ShiftRequest[],
  staffId: string,
  dates: string[]
): RequestSummary {
  let submitted = 0, early = 0, late = 0, off = 0;
  for (const date of dates) {
    const v = getDayRequest(requests, staffId, date);
    if (v === 'none') continue;
    submitted++;
    if (v === 'off') { off++; continue; }
    if (v === 'early' || v === 'both') early++;
    if (v === 'late' || v === 'both') late++;
  }
  return { total: dates.length, submitted, early, late, off };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd frontend && npx vitest run src/components/ui/summary.test.ts`
Expected: PASS

- [ ] **Step 5: SummaryBar を実装**

Create `frontend/src/components/ui/SummaryBar.tsx`:

```tsx
import { summarizeRequests } from './summary';
import type { ShiftRequest } from '../../types';

interface SummaryBarProps { requests: ShiftRequest[]; staffId: string; dates: string[]; }

export function SummaryBar({ requests, staffId, dates }: SummaryBarProps) {
  const s = summarizeRequests(requests, staffId, dates);
  return (
    <div className="summary">
      <div className="summary-main">
        <span className="summary-num">{s.submitted}</span>
        <span className="summary-unit">/ {s.total}日 提出</span>
      </div>
      <div className="summary-tags">
        <span className="chip early">早 {s.early}</span>
        <span className="chip late">遅 {s.late}</span>
        <span className="chip off">休 {s.off}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 型チェック + コミット**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

```bash
cd C:/Users/User/shift-app
git add frontend/src/components/ui/summary.ts frontend/src/components/ui/summary.test.ts frontend/src/components/ui/SummaryBar.tsx
git commit -m "feat(frontend): add request summary helper and SummaryBar"
```

---

## Task 5: BottomSheet と Legend

**Files:**
- Create: `frontend/src/components/ui/BottomSheet.tsx`
- Create: `frontend/src/components/ui/BottomSheet.test.tsx`
- Create: `frontend/src/components/ui/Legend.tsx`

**Interfaces:**
- Consumes: Task 1 の `.sheet-*` / `.legend-*` / `.chip` / `.dot`。
- Produces: `BottomSheet({ open, title, onClose, children })` と `Legend()`。

- [ ] **Step 1: 失敗する BottomSheet テストを書く**

Create `frontend/src/components/ui/BottomSheet.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';

describe('BottomSheet', () => {
  it('does not render while closed', () => {
    render(
      <BottomSheet open={false} title="希望を選択" onClose={() => undefined}>
        内容
      </BottomSheet>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with Escape and backdrop click', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open title="希望を選択" onClose={onClose}>
        内容
      </BottomSheet>
    );

    expect(screen.getByRole('dialog', { name: '希望を選択' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('希望選択を閉じる'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `cd frontend && npx vitest run src/components/ui/BottomSheet.test.tsx`
Expected: FAIL（`BottomSheet` が未実装）

- [ ] **Step 3: BottomSheet を実装**

Create `frontend/src/components/ui/BottomSheet.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="sheet-backdrop"
        aria-label="希望選択を閉じる"
        onClick={onClose}
      />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        <div className="sheet-title">{title}</div>
        {children}
      </div>
    </>
  );
}
```

- [ ] **Step 4: BottomSheet テストを通す**

Run: `cd frontend && npx vitest run src/components/ui/BottomSheet.test.tsx`
Expected: 2 tests PASS

- [ ] **Step 5: Legend を実装**

Create `frontend/src/components/ui/Legend.tsx`:

```tsx
export function Legend() {
  return (
    <div className="legend" aria-label="表示の凡例">
      <span className="legend-item"><span className="chip early">早</span>早番希望</span>
      <span className="legend-item"><span className="chip late">遅</span>遅番希望</span>
      <span className="legend-item"><span className="chip off">休</span>休み希望</span>
      <span className="legend-item"><span className="dot low" />不足</span>
      <span className="legend-item"><span className="dot ok" />適正</span>
      <span className="legend-item"><span className="dot over" />過多</span>
    </div>
  );
}
```

- [ ] **Step 6: 型チェック + コミット**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

```bash
cd C:/Users/User/shift-app
git add frontend/src/components/ui/BottomSheet.tsx frontend/src/components/ui/BottomSheet.test.tsx frontend/src/components/ui/Legend.tsx
git commit -m "feat(frontend): add BottomSheet and matrix Legend"
```

---

## Task 6: ToastProvider をアプリへ接続

**Files:**
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: Task 3 の `ToastProvider`。
- Produces: アプリ配下の全コンポーネントで `useToast()` を利用できる Provider 構成。

- [ ] **Step 1: main.tsx を更新**

Replace `frontend/src/main.tsx` with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { AppProvider } from './store/AppContext';
import { ToastProvider } from './components/ui/Toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </ToastProvider>
  </StrictMode>
);
```

- [ ] **Step 2: 型チェック + コミット**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

```bash
cd C:/Users/User/shift-app
git add frontend/src/main.tsx
git commit -m "feat(frontend): connect ToastProvider to app root"
```

---

## Task 7: App シェルと Header 刷新

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Header.tsx`

**Interfaces:**
- Consumes: `useApp()` の既存値、Task 2 の `Badge` / `Skeleton`、既存画面コンポーネント。
- Produces: sticky トップバー、今月ショートカット、セグメントタブ、初期ローディングスケルトン。

- [ ] **Step 1: Header を更新**

Replace `frontend/src/components/Header.tsx` with:

```tsx
import type { Store } from '../types';
import { Badge } from './ui/Badge';

interface HeaderProps {
  stores: Store[];
  storeId: string;
  onStoreChange: (id: string) => void;
  userName: string;
  isManager: boolean;
  onLogout: () => void;
}

export function Header({ stores, storeId, onStoreChange, userName, isManager, onLogout }: HeaderProps) {
  return (
    <header className="topbar">
      <span className="logo">🍜 暁夢シフト</span>
      <select className="store-select" value={storeId} onChange={(e) => onStoreChange(e.target.value)} aria-label="店舗選択">
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="user-chip">
        <span className="user-name">{userName}</span>
        <Badge tone={isManager ? 'manager' : 'staff'}>{isManager ? '店長' : 'スタッフ'}</Badge>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>ログアウト</button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: App.tsx を更新**

Replace `frontend/src/App.tsx` with:

```tsx
import { useState } from 'react';
import { useApp } from './store/AppContext';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { RequestEditor } from './components/RequestEditor';
import { ManagerMatrix } from './components/ManagerMatrix';
import { SharedView } from './components/SharedView';
import { Skeleton } from './components/ui/Skeleton';

type Tab = 'main' | 'shared';

export function App() {
  const { me, loading, stores, storeId, month, setStoreId, setMonth, logout } = useApp();
  const [tab, setTab] = useState<Tab>('main');

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen" aria-label="読み込み中">
          <Skeleton height={56} radius={12} />
          <Skeleton height={40} width={220} radius={10} />
          <Skeleton height={340} radius={16} />
        </div>
      </div>
    );
  }
  if (!me) return <Login />;

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);

  function shiftMonthStr(delta: number) {
    const zero = monthNum - 1 + delta;
    const y = year + Math.floor(zero / 12);
    const m = ((zero % 12) + 12) % 12 + 1;
    setMonth(`${y}-${String(m).padStart(2, '0')}`);
  }

  function goToday() {
    const now = new Date();
    setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }

  const isManager = me.role === 'MANAGER';

  return (
    <div className="app">
      <Header
        stores={stores}
        storeId={storeId ? String(storeId) : ''}
        onStoreChange={(id) => setStoreId(Number(id))}
        userName={me.name}
        isManager={isManager}
        onLogout={() => void logout()}
      />

      <div className="month-nav">
        <button type="button" className="btn btn-ghost" onClick={() => shiftMonthStr(-1)} aria-label="前の月">‹</button>
        <span className="month-title">{year}年 {monthNum}月</span>
        <button type="button" className="btn btn-ghost" onClick={() => shiftMonthStr(1)} aria-label="次の月">›</button>
        <button type="button" className="btn btn-soft btn-sm today-btn" onClick={goToday}>今月</button>
      </div>

      <nav className="segment" aria-label="画面切り替え">
        <button type="button" className={tab === 'main' ? 'active' : ''} onClick={() => setTab('main')}>
          {isManager ? '希望確認・割り当て' : '希望を出す'}
        </button>
        <button type="button" className={tab === 'shared' ? 'active' : ''} onClick={() => setTab('shared')}>確定シフト</button>
      </nav>

      <main className="screen">
        {tab === 'shared'
          ? <SharedView year={year} month={monthNum} />
          : isManager
            ? <ManagerMatrix year={year} month={monthNum} />
            : <RequestEditor year={year} month={monthNum} />}
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: 型チェック**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
cd C:/Users/User/shift-app
git add frontend/src/App.tsx frontend/src/components/Header.tsx
git commit -m "feat(frontend): redesign app shell and topbar"
```

---

## Task 8: Login 刷新（カード + デモチップ）

**Files:**
- Modify: `frontend/src/components/Login.tsx`

**Interfaces:**
- Consumes: 既存の `useApp().login(username, password)`、Task 1 のログイン用クラス。
- Produces: busy / error 状態を持つカード型ログイン画面とデモアカウント入力。

- [ ] **Step 1: Login を更新**

Replace `frontend/src/components/Login.tsx` with:

```tsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';

const DEMO_ACCOUNTS = [
  { label: '中島店 店長', username: 'nakashima-mgr' },
  { label: '中島店 佐藤', username: 'nakashima-1' },
  { label: '新田店 店長', username: 'nitta-mgr' },
  { label: '早島店 店長', username: 'hayashima-mgr' },
];

export function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card card">
        <div className="login-brand">
          <div className="login-logo">🍜 暁夢シフト</div>
          <p className="login-tagline">みんなのシフト、ひとつに。</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label className="field">
            <span>ユーザー名</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label className="field">
            <span>パスワード</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'ログイン中…' : 'ログイン →'}
          </button>
        </form>
        <div className="login-demo">
          <p className="login-demo-title">お試しログイン（パスワードは <code>password</code>）</p>
          <div className="login-demo-chips">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.username}
                type="button"
                className="chip-btn"
                onClick={() => {
                  setUsername(a.username);
                  setPassword('password');
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 型チェック + コミット**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

```bash
cd C:/Users/User/shift-app
git add frontend/src/components/Login.tsx
git commit -m "feat(frontend): redesign login with card and quick-login chips"
```

---

## Task 9: RequestEditor 刷新（サマリー + ボトムシート + トースト）

**Files:**
- Modify: `frontend/src/components/MonthCalendar.tsx`
- Create: `frontend/src/components/MonthCalendar.test.tsx`
- Modify: `frontend/src/components/RequestEditor.tsx`

**Interfaces:**
- Consumes: Task 3 の `useToast()`、Task 4 の `SummaryBar`、Task 5 の `BottomSheet`、既存 `getDayRequest()` / `setDayRequest()`。
- Produces: button セマンティクスを持つ再利用カレンダーと、サマリー・希望選択ダイアログ・保存通知を備えた希望提出画面。

- [ ] **Step 1: 失敗する MonthCalendar テストを書く**

Create `frontend/src/components/MonthCalendar.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MonthCalendar } from './MonthCalendar';

describe('MonthCalendar', () => {
  it('renders interactive dates as accessible buttons', () => {
    const onCellClick = vi.fn();
    render(
      <MonthCalendar
        year={2026}
        month={7}
        onCellClick={onCellClick}
        renderCell={() => null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-07-01を選択' }));
    expect(onCellClick).toHaveBeenCalledWith('2026-07-01');
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `cd frontend && npx vitest run src/components/MonthCalendar.test.tsx`
Expected: FAIL（現状の日付セルは `div` で button role を持たない）

- [ ] **Step 3: MonthCalendar の操作セルを button 化**

Replace `frontend/src/components/MonthCalendar.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { getMonthDates, firstWeekdayOfMonth } from '../lib/date';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

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
      {WEEKDAYS.map((weekday) => (
        <div key={weekday} className="cal-head">{weekday}</div>
      ))}
      {Array.from({ length: leading }).map((_, index) => (
        <div key={`empty-${index}`} className="cal-cell empty" />
      ))}
      {dates.map((date, index) => {
        const day = index + 1;
        const content = (
          <>
            <div className="day-num">{day}</div>
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

- [ ] **Step 4: MonthCalendar テストを通す**

Run: `cd frontend && npx vitest run src/components/MonthCalendar.test.tsx`
Expected: PASS

- [ ] **Step 5: RequestEditor を更新**

Replace `frontend/src/components/RequestEditor.tsx` with:

```tsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { getDayRequest } from '../store/requests';
import { getMonthDates } from '../lib/date';
import { MonthCalendar } from './MonthCalendar';
import { SummaryBar } from './ui/SummaryBar';
import { useToast } from './ui/Toast';
import { BottomSheet } from './ui/BottomSheet';
import type { DayRequestValue } from '../types';

const VALUE_CHIP: Record<Exclude<DayRequestValue, 'none'>, { label: string; cls: string }> = {
  early: { label: '早', cls: 'early' },
  late: { label: '遅', cls: 'late' },
  both: { label: '早遅', cls: 'early' },
  off: { label: '休', cls: 'off' },
};

interface RequestEditorProps { year: number; month: number; }

export function RequestEditor({ year, month }: RequestEditorProps) {
  const { me, requests, setDayRequest } = useApp();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const myStaffId = me ? String(me.id) : '';
  const dates = getMonthDates(year, month);

  async function setValue(value: DayRequestValue) {
    if (!selectedDate) return;
    await setDayRequest(selectedDate, value);
    showToast('保存しました ✓');
    setSelectedDate(null);
  }

  const current = selectedDate ? getDayRequest(requests, myStaffId, selectedDate) : 'none';

  return (
    <section className="request-editor">
      <SummaryBar requests={requests} staffId={myStaffId} dates={dates} />
      <p className="hint">日付をタップして希望を選んでください（早番 7:00-16:00 / 遅番 15:00-24:00）。</p>

      <MonthCalendar
        year={year}
        month={month}
        onCellClick={(date) => setSelectedDate(date)}
        renderCell={(date) => {
          const v = getDayRequest(requests, myStaffId, date);
          if (v === 'none') return null;
          const chip = VALUE_CHIP[v];
          return <span className={`chip ${chip.cls}`}>{chip.label}</span>;
        }}
      />

      <BottomSheet
        open={selectedDate !== null}
        title={selectedDate ? `${selectedDate} の希望` : '希望を選択'}
        onClose={() => setSelectedDate(null)}
      >
        <div className="sheet-actions">
          <button type="button" className={`pick ${current === 'early' ? 'sel-early' : ''}`} onClick={() => void setValue('early')}>🌅 早番</button>
          <button type="button" className={`pick ${current === 'late' ? 'sel-late' : ''}`} onClick={() => void setValue('late')}>🌙 遅番</button>
          <button type="button" className={`pick ${current === 'both' ? 'sel-early' : ''}`} onClick={() => void setValue('both')}>早番+遅番</button>
          <button type="button" className={`pick ${current === 'off' ? 'sel-off' : ''}`} onClick={() => void setValue('off')}>😴 休み</button>
          <button type="button" className="pick clear" onClick={() => void setValue('none')}>クリア</button>
        </div>
      </BottomSheet>
    </section>
  );
}
```

- [ ] **Step 6: 型チェック + コミット**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

```bash
cd C:/Users/User/shift-app
git add frontend/src/components/MonthCalendar.tsx frontend/src/components/MonthCalendar.test.tsx frontend/src/components/RequestEditor.tsx
git commit -m "feat(frontend): redesign RequestEditor with summary, sheet, toast"
```

---

## Task 10: ManagerMatrix 刷新（sticky + 充足バー + 凡例）

**Files:**
- Modify: `frontend/src/components/ManagerMatrix.tsx`

**Interfaces:**
- Consumes: Task 5 の `Legend`、既存の希望・割り当てヘルパーと `useApp().toggleAssignment()`。
- Produces: sticky 行列、希望色、キーボード操作可能な割り当てセル、人数と充足バー。

- [ ] **Step 1: ManagerMatrix を更新**

Replace `frontend/src/components/ManagerMatrix.tsx` with:

```tsx
import { useApp } from '../store/AppContext';
import { getMonthDates } from '../lib/date';
import { getDayRequest } from '../store/requests';
import { isAssigned, countAssigned, fulfillmentLevel } from '../store/assignments';
import { WORK_SLOTS, SLOT_LABELS, MAX_STAFF_PER_SLOT } from '../constants';
import { Legend } from './ui/Legend';
import type { DayRequestValue, WorkSlot } from '../types';

interface ManagerMatrixProps { year: number; month: number; }

const REQUEST_MARK: Record<DayRequestValue, string> = {
  none: '', early: '早', late: '遅', both: '早遅', off: '休',
};
const REQUEST_CLASS: Record<DayRequestValue, string> = {
  none: '', early: 'req-early', late: 'req-late', both: 'req-early', off: 'req-off',
};

export function ManagerMatrix({ year, month }: ManagerMatrixProps) {
  const { staff, requests, assignments, toggleAssignment } = useApp();
  const dates = getMonthDates(year, month);
  const days = dates.map((d) => Number(d.slice(8, 10)));

  if (staff.length === 0) {
    return <section className="empty"><p>この店舗のスタッフがいません。</p></section>;
  }

  return (
    <section className="matrix-section">
      <Legend />
      <div className="matrix-wrap">
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
                    <td
                      key={date}
                      className={`cell-btn ${REQUEST_CLASS[req]} ${assigned ? 'assigned' : ''}`}
                      role={targetSlot ? 'button' : undefined}
                      tabIndex={targetSlot ? 0 : undefined}
                      aria-label={targetSlot
                        ? `${person.name} ${date} ${assigned ? '割り当て解除' : '割り当て'}`
                        : undefined}
                      onClick={toggle}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggle();
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
              <tr key={slot} className="count-row">
                <td className="staff-name">{SLOT_LABELS[slot]}人数</td>
                {dates.map((date) => {
                  const count = countAssigned(assignments, date, slot);
                  const level = fulfillmentLevel(count);
                  const pct = Math.min(100, Math.round((count / MAX_STAFF_PER_SLOT) * 100));
                  return (
                    <td key={date} className={`count ${level}`}>
                      <span className="count-num">{count}</span>
                      <span className="fill-bar"><span className={`fill ${level}`} style={{ width: `${pct}%` }} /></span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 既存テストが通ることを確認（ラベル維持のため壊れない想定）**

Run: `cd frontend && npx vitest run src/components/ManagerMatrix.test.tsx`
Expected: PASS（'山田（店長）'・'早番人数'・'遅番人数' は維持）

- [ ] **Step 3: 型チェック + コミット**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

```bash
cd C:/Users/User/shift-app
git add frontend/src/components/ManagerMatrix.tsx
git commit -m "feat(frontend): redesign ManagerMatrix with sticky table and fill bars"
```

---

## Task 11: SharedView 刷新（チップ + 空状態）

**Files:**
- Modify: `frontend/src/components/SharedView.tsx`

**Interfaces:**
- Consumes: 既存の `staff` / `assignments` と `MonthCalendar`。
- Produces: 時間帯チップ、担当者名、割り当て無しの空状態を持つ共有画面。

- [ ] **Step 1: SharedView を更新**

Replace `frontend/src/components/SharedView.tsx` with:

```tsx
import { useApp } from '../store/AppContext';
import { MonthCalendar } from './MonthCalendar';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';

interface SharedViewProps { year: number; month: number; }

const SLOT_ICON: Record<string, string> = { early: '🌅', late: '🌙' };

export function SharedView({ year, month }: SharedViewProps) {
  const { staff, assignments } = useApp();
  const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? '';
  const hasAny = assignments.some((a) => a.staffIds.length > 0);

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
                  <span className={`chip ${slot}`}>{SLOT_ICON[slot]} {SLOT_LABELS[slot]}</span>
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

- [ ] **Step 2: 型チェック + コミット**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラーなし

```bash
cd C:/Users/User/shift-app
git add frontend/src/components/SharedView.tsx
git commit -m "feat(frontend): redesign SharedView with slot chips and empty state"
```

---

## Task 12: 最終検証 + push

**Files:** なし

**Interfaces:**
- Consumes: Task 1〜11 の完成状態。
- Produces: 型・自動テスト・PC/スマホE2Eの検証記録とリモートブランチ。

- [ ] **Step 1: 型チェック + 全テスト**

Run: `cd frontend && npx tsc --noEmit && npm test`
Expected: tsc エラーなし、全テスト PASS（既存25件 + summary 2件 + Toast 1件 + BottomSheet 2件 + MonthCalendar 1件 = 計31件程度）

- [ ] **Step 2: 開発サーバで PC 幅を確認（別ターミナルで backend 起動）**

```bash
cd backend && ./mvnw spring-boot:run    # 1つ目
cd frontend && npm run dev               # 2つ目 → http://localhost:5173
```

確認:
1. ログイン画面がカード型で表示、デモチップでユーザー名が入る。
2. スタッフ（nakashima-1）: サマリーバー、日付タップでシート、保存トースト。
3. 店長（nakashima-mgr）: マトリクスの見出し/名前が固定、希望色分け、充足バー、凡例。
4. 確定シフトタブ: チップ＋名前。割り当て無しのとき空状態メッセージ。

- [ ] **Step 3: ブラウザ幅を 390×844 相当にしてスマホ表示を確認**

確認:
1. セグメントタブが画面下部に固定され、本文を隠さない。
2. カレンダーが横にはみ出さず、日付セルをタップできる。
3. 希望選択シートが下から表示され、背景クリックと `Escape` で閉じる。
4. フォーカスリングが表示され、Tab / Enter で主要操作ができる。

確認後、backend / frontend をそれぞれ `Ctrl+C` で停止する。

- [ ] **Step 4: push**

```bash
cd C:/Users/User/shift-app
git push
```
Expected: `origin/feature/shift-app-1-3` に反映。

---

## Self-Review メモ

- **デザイントークン/配色（インディゴ）** → Task 1。✓
- **共通レイアウト（トップバー/月ナビ/今月/セグメントタブ）** → Task 7。✓
- **ログイン（カード+デモチップ）** → Task 8。✓
- **希望提出（サマリー/BottomSheet/トースト）** → Task 3, 4, 5, 9。✓
- **割り当てマトリクス（sticky/充足バー/凡例）** → Task 5, 10。✓
- **確定シフト（チップ/空状態）** → Task 11。✓
- **ローディング/スケルトン** → Task 2, 7。✓
- **レスポンシブ（スマホ下部タブ/ボトムシート）** → Task 1（メディアクエリ）。✓
- **アクセシビリティ**: フォーカス表示・reduced motion は Task 1、Escape/背景クリックは Task 5、日付セルの button 化は Task 9、割り当てセルの Enter/Space は Task 10。✓
- **既存テスト維持**: ラベル（早番人数 等）を保持し ManagerMatrix.test はそのまま通る。新規ロジック（summary/Toast/BottomSheet/MonthCalendar）は TDD。✓
- **API/ロジック不変**: `AppContext`/`api/client`/`lib`/`store/requests`/`store/assignments` は変更なし。✓
- **型整合**: Task 6 は Provider 接続だけで単独 green。Header の新 props（`isManager`/`userName`/`onLogout`）と App は Task 7 で同時に更新し、タスク境界で型エラーを残さない。✓
