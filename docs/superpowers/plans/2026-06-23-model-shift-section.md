# モデルシフト（model-shift）セクション 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** プルダウン「計画 → モデルシフト」を点灯させ、時間帯バンドごとの必要人数を事前設定できるモーダルを実装。設定値をシフト表「全体モデルシフト」の x/y へ即時反映する。

**Architecture:** 既存 `TopNav.tsx` のモーダル群に `model` を追加。必要人数はポジション別に `useSetting('akiyume-required:${storeId}:${position}')` へ保存（`ManagerShiftScreen` / `ShiftTableSummaryRows` が既に同キーを購読しているため、同一タブ同期で x/y が自動更新される）。新規バックエンド・新規型なし。

**Tech Stack:** React + TypeScript, Vite, Vitest + Testing Library, localStorage 永続（`lib/settings.ts` の `useSetting`/`setSetting`）。

---

## ファイル構成

- 変更: `frontend/src/components/TopNav.tsx`
  - `ModalKind` に `'model'` 追加
  - `TITLES` に `model: 'モデルシフト'` 追加
  - `ENABLED_SECTIONS` に `'model-shift'` 追加
  - `openSection` の `modalBySection` に `'model-shift': 'model'` 追加
  - コンポーネント内に選択ポジション state と必要人数 `useSetting` を追加
  - `model` モーダル本文を追加
- 新規: `frontend/src/components/TopNav.test.tsx`（メニュー有効化・モーダル表示・保存の検証）
- 変更: `frontend/src/components/manager/ManagerShiftScreen.test.tsx`（x/y 反映の統合テストを1件追記）

---

### Task 1: モデルシフトのモーダルを実装し点灯させる

**Files:**
- Create: `frontend/src/components/TopNav.test.tsx`
- Modify: `frontend/src/components/TopNav.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/TopNav.test.tsx` を新規作成:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppProvider } from '../store/AppContext';
import { mockManagerShiftApi } from '../test/mockShiftApi';
import { ToastProvider } from './ui/Toast';
import { TopNav } from './TopNav';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  mockManagerShiftApi(vi);
});

function renderTopNav() {
  render(
    <ToastProvider>
      <AppProvider>
        <TopNav />
      </AppProvider>
    </ToastProvider>,
  );
}

it('モデルシフトのメニューが有効で、押すと必要人数の入力が開く', async () => {
  const user = userEvent.setup();
  renderTopNav();
  // me(アカウント名)のロード完了を待つ
  await screen.findByText(/西村健一/);

  await user.click(screen.getByRole('button', { name: '計画' }));
  const item = screen.getByRole('menuitem', { name: 'モデルシフト' });
  expect(item).not.toBeDisabled();

  await user.click(item);
  expect(screen.getByLabelText('09:00 - 14:00')).toBeInTheDocument();
  expect(screen.getByLabelText('14:00 - 19:00')).toBeInTheDocument();
  expect(screen.getByLabelText('19:00 - 23:00')).toBeInTheDocument();
});

it('必要人数を変更すると akiyume-required に保存される', async () => {
  const user = userEvent.setup();
  renderTopNav();
  await screen.findByText(/西村健一/);

  await user.click(screen.getByRole('button', { name: '計画' }));
  await user.click(screen.getByRole('menuitem', { name: 'モデルシフト' }));

  const morning = screen.getByLabelText('09:00 - 14:00');
  await user.clear(morning);
  await user.type(morning, '5');

  const saved = JSON.parse(localStorage.getItem('akiyume-required:1:ホール')!);
  expect(saved.morning).toBe(5);
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd frontend && npm test -- TopNav`
Expected: FAIL（「モデルシフト」メニュー項目が disabled、またはモーダル入力が見つからない）

- [ ] **Step 3: 最小実装を書く**

`frontend/src/components/TopNav.tsx` を以下のとおり変更する。

(a) `ModalKind` に `'model'` を追加:

```tsx
type ModalKind =
  | null | 'staff' | 'regStaff' | 'regAdmin' | 'rank' | 'skills' | 'sales' | 'cost' | 'sph'
  | 'laborStatus' | 'attendance' | 'hoursAlert' | 'stores' | 'dept' | 'perm'
  | 'import' | 'integ' | 'hours' | 'collect' | 'notify' | 'display' | 'help' | 'account' | 'model';
```

(b) `TITLES` に `model` を追加（既存オブジェクトの末尾に追記）:

```tsx
  notify: '通知設定', display: '表示設定', help: '使い方', account: 'アカウント設定',
  model: 'モデルシフト',
```

(c) `ENABLED_SECTIONS` の Set に `'model-shift'` を追加（既存配列の末尾付近に1行追記）:

```tsx
  'notification-settings',
  'model-shift',
]);
```

(d) コンポーネント内、既存の `positions` useSetting 行の直後に選択ポジションと必要人数の状態を追加:

```tsx
  const [modelPos, setModelPos] = useState<string>(positions[0] ?? 'ホール');
  const [modelRequired, setModelRequired] = useSetting(
    `akiyume-required:${storeId}:${modelPos}`,
    { morning: 2, afternoon: 2, night: 2 },
  );
```

（`positions` は既存の `const [positions, setPositions] = useSetting<string[]>(...)` 行。その直後に置くこと。）

(e) `openSection` 内の `modalBySection` に1行追加:

```tsx
      'notification-settings': 'notify',
      'model-shift': 'model',
    };
```

(f) `model` モーダル本文を、`Modal` 内の既存ブロック群の末尾（`{modal === 'account' && (...)}` の直後）に追加:

```tsx
        {modal === 'model' && (
          <div className="settings-form">
            <p className="muted-sm">
              時間帯ごとの必要人数を設定します。シフト表の「全体モデルシフト」に必要数として反映されます。
            </p>
            <label className="settings-row">
              <span>ポジション</span>
              <select value={modelPos} onChange={(e) => setModelPos(e.target.value)}>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            {([
              ['morning', '09:00 - 14:00'],
              ['afternoon', '14:00 - 19:00'],
              ['night', '19:00 - 23:00'],
            ] as const).map(([key, label]) => (
              <label key={key} className="settings-row">
                <span>{label}</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={modelRequired[key]}
                  onChange={(e) => setModelRequired({
                    ...modelRequired,
                    [key]: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
                  })}
                />
              </label>
            ))}
          </div>
        )}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `cd frontend && npm test -- TopNav`
Expected: PASS（2件）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/TopNav.tsx frontend/src/components/TopNav.test.tsx
git commit -m "feat(frontend): add model shift required-headcount section"
```

---

### Task 2: モデルシフト設定がシフト表 x/y に反映されることを検証

**Files:**
- Modify: `frontend/src/components/manager/ManagerShiftScreen.test.tsx`

- [ ] **Step 1: 失敗（→成功）するテストを追記**

`ManagerShiftScreen.test.tsx` の import に `act, within` と `setSetting` を加える。
既存 import 行:

```tsx
import { render, screen } from '@testing-library/react';
```

を次に置き換える:

```tsx
import { render, screen, act, within } from '@testing-library/react';
import { setSetting } from '../../lib/settings';
```

ファイル末尾に新しいテストを追記:

```tsx
it('モデルシフトの必要人数設定がシフト表のx/yに反映される', async () => {
  render(
    <ToastProvider>
      <AppProvider>
        <ManagerShiftScreen />
      </AppProvider>
    </ToastProvider>,
  );

  const header = await screen.findByRole('rowheader', { name: '09:00 - 14:00' });
  const row = header.closest('tr')!;
  // 既定の必要人数は2、割り当て0なので 0/2
  expect(within(row).getAllByText('0/2').length).toBeGreaterThan(0);

  // モデルシフト設定（ホール/朝バンド=7）を保存
  act(() => {
    setSetting('akiyume-required:1:ホール', { morning: 7, afternoon: 2, night: 2 });
  });

  expect(within(row).getAllByText('0/7').length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: テストを実行**

Run: `cd frontend && npm test -- ManagerShiftScreen`
Expected: PASS（既存テスト＋新規テスト）。
※ `setSetting` は `useSetting` 購読側を即時更新するため、storeId=1・position='ホール' の
`ManagerShiftScreen` の `requiredByBand` が `{morning:7,...}` に切り替わり、行セルが `0/7` になる。

- [ ] **Step 3: コミット**

```bash
git add frontend/src/components/manager/ManagerShiftScreen.test.tsx
git commit -m "test(frontend): verify model shift reflects in shift table"
```

---

### Task 3: 全体検証

- [ ] **Step 1: フロント全テスト**

Run: `cd frontend && npm test`
Expected: 全 PASS（既存 GlobalNav.test.tsx 等を含め回帰なし）

- [ ] **Step 2: ビルド**

Run: `cd frontend && npm run build`
Expected: 型エラー・ビルドエラーなし

- [ ] **Step 3: 実機確認（demo-run-procedure 参照）**

backend (`./mvnw.cmd spring-boot:run`) ＋ frontend (`npm run dev`) を起動し、
店長 `nakashima-mgr` / `password` でログイン →「計画 → モデルシフト」を開く →
朝バンドの必要人数を変更 → モーダルを閉じてシフト表「全体モデルシフト」の朝行分母が
変更値になっていることを確認。

---

## Self-Review メモ

- **Spec coverage:** 受け入れ基準1（点灯・モーダル）=Task1、基準2（ポジション別保存）=Task1、
  基準3（x/y 反映）=Task2、基準4（永続）=localStorage により担保、基準5（test/build）=Task3。網羅。
- **型整合:** `modelRequired` は `{morning,afternoon,night}` で `RequiredByBand` と一致。
  `modelBySection` のキー `'model-shift'` は `ManagerSection` に存在。値 `'model'` は `ModalKind` に追加済み。
- **Placeholder:** なし（全ステップにコード/コマンド明記）。
