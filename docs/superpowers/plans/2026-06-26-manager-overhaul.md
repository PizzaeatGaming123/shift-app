# 店長UI整理 + パート時間メイン化 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 店長UIから会計/ランク/スキルを削除し、パートの任意時間割当を可能にし、扶養警告・先月コピー・大文字レイアウトを追加する。

**Architecture:** バックエンド: Assignment に startTime/endTime 追加、Staff から rank/skills を削除して monthlyHourLimit を追加。フロント: 不要画面・サマリー行・型を削除し、ShiftStaffRow を時間入力対応に拡張、SharedView から希望表示削除、CSSデフォルト変更。

**Tech Stack:** Spring Boot 3 / JPA / H2、React 18 + TypeScript + Vite、Vitest、JUnit 5 + Spring Test

**Spec:** `docs/superpowers/specs/2026-06-26-manager-overhaul-design.md`

---

## Phase 0: 準備

### Task 0.1: ブランチ作成と現状テストの確認

**Files:**
- なし（環境確認のみ）

- [ ] **Step 1: 既存テストが緑であることを確認**

Run: `cd /c/Users/User/shift-app/backend && ./mvnw.cmd test -q`
Expected: BUILD SUCCESS

Run: `cd /c/Users/User/shift-app/frontend && npm test -- --run`
Expected: 全テストpass

- [ ] **Step 2: 作業ブランチを確認**

Run: `git status && git branch --show-current`
Expected: `feature/shift-app-1-3` または別ブランチに既にいる

---

## Phase 1: 不要画面・型・サマリー行を削除（リスク低）

### Task 1.1: ナビから「計画」グループ削除 + モデルシフトを「設定」グループへ移動

**Files:**
- Modify: `frontend/src/components/manager/GlobalNav.tsx`
- Modify: `frontend/src/components/manager/GlobalNav.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`GlobalNav.test.tsx` に追加：

```ts
it('「計画」グループは存在しない', async () => {
  const user = userEvent.setup();
  renderNav();
  expect(screen.queryByRole('button', { name: /^計画/ })).toBeNull();
});

it('モデルシフトは「設定」グループから開ける', async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  renderNav({ onOpenSection: onOpen });
  await user.click(screen.getByRole('button', { name: /^設定/ }));
  await user.click(screen.getByRole('menuitem', { name: 'モデルシフト' }));
  expect(onOpen).toHaveBeenCalledWith('model-shift');
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd frontend && npm test -- --run GlobalNav`
Expected: 2件 FAIL

- [ ] **Step 3: `GlobalNav.tsx` の NAV_GROUPS を編集**

`{ label: '計画', items: [...] }` のエントリを丸ごと削除。「設定」グループの items 配列の先頭に `{ label: 'モデルシフト', section: 'model-shift' }` を追加：

```ts
{
  label: '設定',
  items: [
    { label: 'モデルシフト', section: 'model-shift' },
    { label: '表示設定', section: 'display-settings' },
    // 以下既存
  ],
},
```

`ManagerSection` 型から `'sales-plan' | 'labor-cost' | 'sales-per-hour'` を削除。

- [ ] **Step 4: テストpassを確認**

Run: `cd frontend && npm test -- --run GlobalNav`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/manager/GlobalNav.tsx frontend/src/components/manager/GlobalNav.test.tsx
git commit -m "feat(manager): 計画グループ削除・モデルシフトを設定グループへ移動"
```

---

### Task 1.2: ナビから「ランク設定」「スキル設定」削除

**Files:**
- Modify: `frontend/src/components/manager/GlobalNav.tsx`
- Modify: `frontend/src/components/manager/GlobalNav.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

```ts
it('スタッフグループにランク設定・スキル設定は出ない', async () => {
  const user = userEvent.setup();
  renderNav();
  await user.click(screen.getByRole('button', { name: /^スタッフ/ }));
  expect(screen.queryByRole('menuitem', { name: 'ランク設定' })).toBeNull();
  expect(screen.queryByRole('menuitem', { name: 'スキル設定' })).toBeNull();
});
```

- [ ] **Step 2: テスト失敗を確認**

Run: `cd frontend && npm test -- --run GlobalNav`
Expected: FAIL

- [ ] **Step 3: NAV_GROUPS の「スタッフ」items から `rank-settings` と `skill-settings` の2行を削除**

`ManagerSection` 型から `'rank-settings' | 'skill-settings'` を削除。

- [ ] **Step 4: テストpass確認**

Run: `cd frontend && npm test -- --run GlobalNav`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/manager/GlobalNav.tsx frontend/src/components/manager/GlobalNav.test.tsx
git commit -m "feat(manager): ナビからランク設定・スキル設定を削除"
```

---

### Task 1.3: SectionBody から削除画面の case を取り除く

**Files:**
- Modify: `frontend/src/components/manager/SectionBody.tsx`
- Delete: `frontend/src/components/manager/RankSkillScreen.tsx`
- Modify: `frontend/src/components/manager/SectionBody.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`SectionBody.test.tsx` に追加（既存テスト構造に合わせて）：

```ts
it('sales-plan セクションは何も描画しない', () => {
  renderSection('sales-plan');
  expect(screen.queryByText('売上計画')).toBeNull();
});
it('rank-settings セクションは何も描画しない', () => {
  renderSection('rank-settings');
  expect(screen.queryByText('ランク・スキル一覧')).toBeNull();
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `cd frontend && npm test -- --run SectionBody`
Expected: FAIL

- [ ] **Step 3: SectionBody.tsx を編集**

以下の case ブロックを丸ごと削除：
- `case 'sales-plan':`
- `case 'labor-cost':`
- `case 'sales-per-hour':`
- `case 'rank-settings':`
- `case 'skill-settings':`

`SECTION_TITLES` から同じキー5つを削除。`RankSkillScreen` の import を削除。

- [ ] **Step 4: RankSkillScreen.tsx ファイル削除**

Run: `rm /c/Users/User/shift-app/frontend/src/components/manager/RankSkillScreen.tsx`

- [ ] **Step 5: テストpass確認**

Run: `cd frontend && npm test -- --run SectionBody`
Expected: PASS

Run: `cd frontend && npm test -- --run` (全テスト)
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add -u
git commit -m "feat(manager): 削除対象セクションのケース削除とRankSkillScreen削除"
```

---

### Task 1.4: シフト表サマリー行の不要項目を削除

**Files:**
- Modify: `frontend/src/components/manager/ShiftTableSummaryRows.tsx`
- Modify: `frontend/src/components/manager/ShiftTable.tsx`
- Modify: `frontend/src/components/manager/ShiftTableSummaryRows.test.tsx`
- Modify: `frontend/src/components/manager/ShiftTable.test.tsx`

- [ ] **Step 1: 失敗テストを書く**

`ShiftTableSummaryRows.test.tsx` のテストを修正/追加：

```ts
it('visibleItems に sales/salesPerHour/laborCost/rankTotal を含めても描画されない', () => {
  render(<ShiftTableSummaryRows {...baseProps} visibleItems={['sales','salesPerHour','laborCost','rankTotal']} />);
  expect(screen.queryByText('売上計画')).toBeNull();
  expect(screen.queryByText('人時売上高')).toBeNull();
  expect(screen.queryByText('人件費')).toBeNull();
  expect(screen.queryByText('ランク計')).toBeNull();
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `cd frontend && npm test -- --run ShiftTableSummaryRows`
Expected: FAIL

- [ ] **Step 3: `SummaryItemKey` から 'sales' | 'salesPerHour' | 'laborCost' | 'rankTotal' を削除**

`ShiftTableSummaryRows.tsx` の `SummaryItemKey` 型と該当 `{visible.has(...) && (...)}` ブロック4箇所を削除。

`ShiftTable.tsx` の `DEFAULT_SUMMARY_ITEMS` から同4キーを削除：

```ts
const DEFAULT_SUMMARY_ITEMS: SummaryItemKey[] = [
  'workHours',
  'modelShift',
  'storeNote',
  'positionNote',
];
```

- [ ] **Step 4: 他参照箇所を更新**

Run: `cd frontend && grep -rn "'sales'\|'salesPerHour'\|'laborCost'\|'rankTotal'" src/components/manager/`

ヒットした参照（特に `SectionBody.tsx` の `visibleSummaryItems` 引数）を整合させる。具体的には `ManagerShiftScreen.tsx` や `ShiftDisplayControls.tsx` 内の選択UIから4項目を消す。

- [ ] **Step 5: テストpass確認**

Run: `cd frontend && npm test -- --run`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add -u
git commit -m "feat(shift-table): サマリー行から売上・人件費・ランク計を削除"
```

---

### Task 1.5: スタッフ側タブ「確定シフト」→「シフト確定」リネーム

**スコープ修正**: 当初は店長ナビをリネームする案だったが、ユーザー指摘でスタッフ画面のタブ名を変えるべきと判明。店長ナビは「シフト」のまま据え置く。

**Files:**
- Modify: `frontend/src/components/StaffApp.tsx`
- Modify: `frontend/src/components/StaffApp.test.tsx`

- [ ] **Step 1: 失敗テスト**

`StaffApp.test.tsx` に：

```ts
it('スタッフナビの2つめのタブは「シフト確定」', () => {
  renderStaffApp();
  expect(screen.getByRole('button', { name: 'シフト確定' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '確定シフト' })).toBeNull();
});

it('シフト確定タブを開くとヘッダーも「シフト確定」', async () => {
  const user = userEvent.setup();
  renderStaffApp();
  await user.click(screen.getByRole('button', { name: 'シフト確定' }));
  // ヘッダタイトル
  expect(screen.getByText('シフト確定', { selector: '.line-head__title' })).toBeInTheDocument();
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `cd frontend && npm test -- --run StaffApp`

- [ ] **Step 3: StaffApp.tsx の "確定シフト" 2箇所を "シフト確定" へ**

- ヘッダタイトル分岐 (line 41 付近): `tab === 'shared' ? '確定シフト'` → `'シフト確定'`
- ナビボタンラベル (line 68 付近): `<button ...>確定シフト</button>` → `<button ...>シフト確定</button>`

`Tab` 型の `'shared'` は識別子なので変更不要。

- [ ] **Step 4: テストpass確認**

Run: `cd frontend && npm test -- --run StaffApp`

- [ ] **Step 5: コミット**

```bash
git add -u
git commit -m "feat(staff): タブ名「確定シフト」を「シフト確定」へリネーム"
```

---

### Task 1.6: シフト周期から「半月」を削除

**Files:**
- Modify: `frontend/src/components/manager/SectionBody.tsx`
- Modify: `frontend/src/lib/collectionSettings.ts`
- Modify: `frontend/src/components/manager/ShiftToolbar.tsx`
- Modify: `frontend/src/components/manager/ManagerShiftScreen.tsx`
- Modify: `frontend/src/components/manager/SectionBody.test.tsx`
- Modify: `frontend/src/components/manager/ShiftToolbar.test.tsx`

- [ ] **Step 1: 失敗テスト**

`SectionBody.test.tsx` に：

```ts
it('シフト周期セレクトに「半月」は無い', async () => {
  renderSection('shift-settings');
  const select = await screen.findByLabelText('シフト周期');
  expect(within(select).queryByText('半月')).toBeNull();
});
```

- [ ] **Step 2: テスト失敗確認**

- [ ] **Step 3: SectionBody.tsx の `<select aria-label="シフト周期">` から `<option value="half-month">半月</option>` を削除**

- [ ] **Step 4: collectionSettings.ts の `cycle` 型から `'half-month'` を削除**

```ts
export type CollectionCycle = 'month';
```

`createDefaultCollectionSettings` のデフォルトを `cycle: 'month'` に固定。

- [ ] **Step 5: マイグレーション処理を追加**

`collectionSettings.ts` に：

```ts
export function migrateCollectionSettings(raw: unknown): Partial<CollectionSettings> {
  if (typeof raw !== 'object' || raw === null) return {};
  const settings = raw as Record<string, unknown>;
  if (settings.cycle === 'half-month') {
    return { ...settings, cycle: 'month' } as Partial<CollectionSettings>;
  }
  return settings as Partial<CollectionSettings>;
}
```

SectionBody.tsx の `useSetting` 呼び出し直後にこのマイグレーションを噛ませる：

```ts
const [storedCollect, setCollect] = useSetting(collectionSettingKey(storeId), collectionDefaults);
const migratedCollect = migrateCollectionSettings(storedCollect);
const collect = { ...collectionDefaults, ...migratedCollect };
```

- [ ] **Step 6: 表示設定の `displayDefaults.initialView` から 'half-month' を削除**

SectionBody.tsx の `DEFAULT_DISPLAY_DEFAULTS.initialView` を `'half-month'` → `'month'`。
`<select>` の `<option value="half-month">` を削除。

ShiftToolbar.tsx / ManagerShiftScreen.tsx 内で 'half-month' を扱うロジックがあれば 'month' にfallback：

```ts
const safeView = view === 'half-month' ? 'month' : view;
```

- [ ] **Step 7: テストpass確認**

Run: `cd frontend && npm test -- --run`
Expected: PASS

- [ ] **Step 8: コミット**

```bash
git add -u
git commit -m "feat: シフト周期と表示設定から半月を削除"
```

---

### Task 1.7: スタッフ確定シフト画面から希望（点線）表示を削除

**Files:**
- Modify: `frontend/src/components/SharedView.tsx`
- Modify: `frontend/src/components/SharedView.test.tsx`

- [ ] **Step 1: 失敗テスト**

`SharedView.test.tsx` に：

```ts
it('確定シフト画面で希望チップは表示されない', async () => {
  renderSharedViewWith({
    requests: [{ staffId: '1', date: '2026-09-01', slot: 'early' }],
    assignments: [{ date: '2026-09-01', slot: 'early', staffIds: [] }], // 自分は未割当
    ...,
  });
  // request chip クラス名で検出
  expect(document.querySelector('.rk-shift-chip--request')).toBeNull();
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `cd frontend && npm test -- --run SharedView`

- [ ] **Step 3: SharedView.tsx の layers 設定を修正**

```ts
layers={{
  showSummary: false,
  pinHeader: false,
  onlyAssigned: false,
  showPatterns: true,
  showRequests: false,  // ← true から false へ
  showTasks: true,
  showNotes: true,
  visibleSlots: { early: true, late: true, any: true, off: true },
}}
```

- [ ] **Step 4: テストpass確認**

- [ ] **Step 5: コミット**

```bash
git add -u
git commit -m "fix(shared): 確定シフト画面から希望表示を削除"
```

---

## Phase 2: スタッフ並び順（パート→アルバイト→正社員）

### Task 2.1: 雇用形態優先ソート関数を追加

**Files:**
- Modify: `frontend/src/components/manager/shiftViewModel.ts`
- Modify: `frontend/src/components/manager/shiftViewModel.test.ts`

- [ ] **Step 1: 失敗テスト**

`shiftViewModel.test.ts` に：

```ts
describe('sortShiftStaff default mode', () => {
  it('雇用形態を パート→アルバイト→正社員 の順で並べる', () => {
    const staff = [
      mkStaff('s1', '田中', '正社員'),
      mkStaff('s2', '佐藤', 'パート'),
      mkStaff('s3', '鈴木', 'アルバイト'),
    ];
    const sorted = sortShiftStaff({ staff, assignments: [], dates: [], mode: 'default' });
    expect(sorted.map(s => s.name)).toEqual(['佐藤', '鈴木', '田中']);
  });

  it('同区分内は氏名昇順', () => {
    const staff = [
      mkStaff('s1', '田中', 'パート'),
      mkStaff('s2', '佐藤', 'パート'),
    ];
    const sorted = sortShiftStaff({ staff, assignments: [], dates: [], mode: 'default' });
    expect(sorted.map(s => s.name)).toEqual(['佐藤', '田中']);
  });
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `cd frontend && npm test -- --run shiftViewModel`

- [ ] **Step 3: shiftViewModel.ts の `sortShiftStaff` を編集**

`default` ケースを以下に変更：

```ts
const employmentOrder: Record<string, number> = {
  'パート': 0, 'アルバイト': 1, '正社員': 2,
};
case 'default':
  return [...staff].sort((a, b) => {
    const orderA = employmentOrder[a.employmentType] ?? 99;
    const orderB = employmentOrder[b.employmentType] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, 'ja');
  });
```

`StaffSortMode` 型から `'rank'` を削除（ランク機能撤廃）。 `SORT_LABEL` / `SORT_ORDER` から `'rank'` 関連を削除。

- [ ] **Step 4: テストpass確認**

Run: `cd frontend && npm test -- --run`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add -u
git commit -m "feat(shift-table): スタッフ既定ソートを雇用形態優先に変更"
```

---

## Phase 3: 扶養（月時間警告）

### Task 3.1: バックエンドに `monthlyHourLimit` 追加

**Files:**
- Modify: `backend/src/main/java/jp/akiyume/shift/domain/Staff.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/dto/StaffDto.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/dto/UpdateStaffBody.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/StaffController.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/repo/service/StaffService.java`
- Modify: `backend/src/test/java/jp/akiyume/shift/web/StaffControllerTest.java` (存在しない場合は作成)

- [ ] **Step 1: 既存 StaffControllerTest を確認**

Run: `find backend/src/test -name "*StaffControllerTest*"`

- [ ] **Step 2: 失敗テストを書く**

既存テストに追加、なければ新規ファイル：

```java
@Test
void putStaff_updatesMonthlyHourLimit() throws Exception {
    // login as manager, PUT /api/staff/{id} with monthlyHourLimit
    var staff = staffRepository.findByUsername("nakashima-1").orElseThrow();
    mvc.perform(put("/api/staff/" + staff.getId())
        .with(csrf()).with(managerAuth())
        .contentType(APPLICATION_JSON)
        .content("{\"rank\":null,\"skills\":\"\",\"monthlyHourLimit\":87}"))
       .andExpect(status().isOk());
    var updated = staffRepository.findById(staff.getId()).orElseThrow();
    assertThat(updated.getMonthlyHourLimit()).isEqualTo(87);
}
```

- [ ] **Step 3: テスト失敗確認**

Run: `cd backend && ./mvnw.cmd test -Dtest=StaffControllerTest -q`
Expected: FAIL (フィールド未定義)

- [ ] **Step 4: `Staff.java` にフィールド・getter/setter追加**

```java
@Column(name = "monthly_hour_limit")
private Integer monthlyHourLimit;

public Integer getMonthlyHourLimit() { return monthlyHourLimit; }
public void setMonthlyHourLimit(Integer v) { this.monthlyHourLimit = v; }
```

- [ ] **Step 5: `StaffDto.java` 修正**

`monthlyHourLimit` を record に追加し `from(Staff)` で渡す：

```java
public record StaffDto(Long id, String name, String employmentType, String role,
                       Integer rank, String skills, Integer hourlyWage, Integer monthlyHourLimit) {
    public static StaffDto from(Staff s) {
        return new StaffDto(s.getId(), s.getName(), s.getEmploymentType().name(),
            s.getRole().name(), s.getRank(), s.getSkills(), s.getHourlyWage(), s.getMonthlyHourLimit());
    }
}
```

- [ ] **Step 6: `UpdateStaffBody.java` に追加**

```java
public record UpdateStaffBody(Integer rank, String skills, Integer hourlyWage, Integer monthlyHourLimit) {}
```

- [ ] **Step 7: `StaffController.java` と `StaffService.java` に反映**

PUT ハンドラで `body.monthlyHourLimit()` を staff.setMonthlyHourLimit に渡す。

- [ ] **Step 8: テストpass確認**

Run: `cd backend && ./mvnw.cmd test -q`
Expected: PASS

- [ ] **Step 9: コミット**

```bash
git add -u
git commit -m "feat(backend): Staffに月労働時間上限を追加"
```

---

### Task 3.2: フロント型と API クライアントに `monthlyHourLimit` 追加

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: types.ts の Staff に追加**

```ts
export interface Staff {
  id: string;
  name: string;
  storeId: string;
  employmentType: EmploymentType;
  role: 'STAFF' | 'MANAGER';
  rank: number | null;
  skills: string[];
  hourlyWage?: number | null;
  monthlyHourLimit?: number | null;
}
```

- [ ] **Step 2: client.ts の `ApiStaff` と `updateStaff` を更新**

```ts
export interface ApiStaff { id: number; name: string; employmentType: string; role: string; rank?: number | null; skills?: string | null; hourlyWage?: number | null; monthlyHourLimit?: number | null; }

async updateStaff(id: number, rank: number | null, skills: string, hourlyWage?: number | null, monthlyHourLimit?: number | null): Promise<void> {
  await mutate(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ rank, skills, hourlyWage, monthlyHourLimit }),
  });
}
```

- [ ] **Step 3: AppContext の `mapStaff` （store/AppContext.tsx）で monthlyHourLimit を渡す**

Run: `grep -n "rank: s.rank" /c/Users/User/shift-app/frontend/src/store/AppContext.tsx`

該当箇所を：

```ts
monthlyHourLimit: s.monthlyHourLimit ?? null,
```

を追加するように修正。

- [ ] **Step 4: テスト確認**

Run: `cd frontend && npm test -- --run`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add -u
git commit -m "feat(frontend): Staff型に月労働時間上限を追加"
```

---

### Task 3.3: 警告レベル計算ユーティリティ追加

**Files:**
- Create: `frontend/src/lib/hourLimit.ts`
- Create: `frontend/src/lib/hourLimit.test.ts`

- [ ] **Step 1: 失敗テスト**

`hourLimit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hourLimitLevel } from './hourLimit';

describe('hourLimitLevel', () => {
  it('limit が null なら none', () => {
    expect(hourLimitLevel(100, null)).toBe('none');
  });
  it('80% 未満は normal', () => {
    expect(hourLimitLevel(60, 100)).toBe('normal');
  });
  it('80-95% は soft', () => {
    expect(hourLimitLevel(85, 100)).toBe('soft');
    expect(hourLimitLevel(80, 100)).toBe('soft');
  });
  it('95-100% は medium', () => {
    expect(hourLimitLevel(96, 100)).toBe('medium');
  });
  it('100% 超は hard', () => {
    expect(hourLimitLevel(101, 100)).toBe('hard');
  });
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `cd frontend && npm test -- --run hourLimit`
Expected: FAIL (モジュール未存在)

- [ ] **Step 3: 実装**

`frontend/src/lib/hourLimit.ts`:

```ts
export type HourLimitLevel = 'none' | 'normal' | 'soft' | 'medium' | 'hard';

export function hourLimitLevel(hours: number, limit: number | null | undefined): HourLimitLevel {
  if (limit == null || limit <= 0) return 'none';
  const ratio = hours / limit;
  if (ratio > 1.0) return 'hard';
  if (ratio >= 0.95) return 'medium';
  if (ratio >= 0.80) return 'soft';
  return 'normal';
}
```

- [ ] **Step 4: テストpass確認**

Run: `cd frontend && npm test -- --run hourLimit`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add -u
git commit -m "feat(frontend): 月労働時間上限の警告レベル判定を追加"
```

---

### Task 3.4: ShiftStaffRow で時間表示に色を適用

**Files:**
- Modify: `frontend/src/components/manager/ShiftStaffRow.tsx`
- Modify: `frontend/src/components/manager/ShiftStaffRow.test.tsx`
- Modify: `frontend/src/styles/_shift-table.css` (or 該当CSSファイル)

- [ ] **Step 1: CSS ファイルを特定**

Run: `grep -rln "rk-shift-staff__hours" /c/Users/User/shift-app/frontend/src/styles`

- [ ] **Step 2: 失敗テスト**

`ShiftStaffRow.test.tsx`:

```ts
it('月時間が上限80%未満なら warning class なし', () => {
  // hours 50, limit 100 → 50%
  render(<ShiftStaffRow person={{...person, monthlyHourLimit: 100}} ... />);
  const hours = screen.getByText(/h/);
  expect(hours.className).not.toMatch(/rk-warn-/);
});
it('100%超で hard class', () => {
  // hours 105, limit 100
  render(<ShiftStaffRow person={{...}} ... />);
  expect(screen.getByText(/h/).className).toMatch(/rk-warn-hard/);
});
```

- [ ] **Step 3: テスト失敗確認**

- [ ] **Step 4: ShiftStaffRow.tsx を編集**

```tsx
import { hourLimitLevel } from '../../lib/hourLimit';

const level = hourLimitLevel(totalHours, person.monthlyHourLimit);
const hoursClass = `rk-shift-staff__hours rk-warn-${level}`;
```

そして既存の `<span className="rk-shift-staff__hours">` を `className={hoursClass}` に変更。

- [ ] **Step 5: CSS追加**

該当CSSに：

```css
.rk-warn-none, .rk-warn-normal { /* デフォルト */ }
.rk-warn-soft { background-color: #fff3a3; color: #5a4a00; }
.rk-warn-medium { background-color: #ffd49a; color: #5a3000; }
.rk-warn-hard { background-color: #ffb3b3; color: #6a0000; font-weight: bold; }
```

- [ ] **Step 6: テストpass確認**

Run: `cd frontend && npm test -- --run ShiftStaffRow`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add -u
git commit -m "feat(shift-table): 月時間が上限に近づくと色で警告"
```

---

### Task 3.5: スタッフ一覧・登録画面で `monthlyHourLimit` の編集UI追加

**Files:**
- Modify: `frontend/src/components/manager/SectionBody.tsx`
- Modify: `frontend/src/components/manager/SectionBody.test.tsx`
- Modify: `frontend/src/store/AppContext.tsx` (updateStaff 経路)

- [ ] **Step 1: 失敗テスト**

```ts
it('スタッフ一覧の各行に「月上限」セルがある', () => {
  renderSection('staff-list');
  expect(screen.getByText(/月上限/)).toBeInTheDocument();
});
```

- [ ] **Step 2: テスト失敗確認**

- [ ] **Step 3: `renderStaffManagement` の table に列追加**

`SectionBody.tsx` の `<thead>` に `<th>月上限</th>` を追加、`<tbody>` の各行に対応セル：

```tsx
<td>
  <input
    type="number"
    min={0}
    max={300}
    aria-label={`${person.name}の月上限`}
    value={person.monthlyHourLimit ?? ''}
    onChange={(e) => {
      const v = e.target.value === '' ? null : Number(e.target.value);
      void updateStaff(person.id, person.rank, person.skills.join(','), person.hourlyWage ?? null, v);
    }}
    style={{ width: 64 }}
  />
  <small>h</small>
</td>
```

- [ ] **Step 4: AppContext の updateStaff シグネチャを拡張**

該当箇所を確認：

Run: `grep -n "updateStaff" /c/Users/User/shift-app/frontend/src/store/AppContext.tsx`

引数に monthlyHourLimit を追加し、`api.updateStaff` に渡す。

- [ ] **Step 5: 登録画面側の `monthlyHourLimit` 初期値**

登録直後はnull（警告なし）。後で一覧から編集。Step 3-4 で足りる。

- [ ] **Step 6: テストpass確認**

Run: `cd frontend && npm test -- --run`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add -u
git commit -m "feat(staff): スタッフ一覧から月上限を編集可能に"
```

---

## Phase 4: Assignment に時間（startTime/endTime）を追加（最大スコープ）

### Task 4.1: バックエンド ShiftAssignment にカラム追加

**Files:**
- Modify: `backend/src/main/java/jp/akiyume/shift/domain/ShiftAssignment.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/dto/AssignmentDto.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/dto/AssignmentBody.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/repo/service/AssignmentService.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/AssignmentController.java`
- Modify: 既存 AssignmentController テスト

- [ ] **Step 1: 失敗テスト**

`AssignmentControllerTest`（既存があれば追加、なければ新規）に：

```java
@Test
void assign_withTimes_persistsStartEnd() throws Exception {
    mvc.perform(post("/api/assignments")
        .with(csrf()).with(managerAuth())
        .contentType(APPLICATION_JSON)
        .content("{\"storeId\":1,\"date\":\"2026-09-01\",\"slot\":\"early\",\"staffId\":2,\"startTime\":\"09:00\",\"endTime\":\"13:00\"}"))
       .andExpect(status().isOk());
    var list = assignmentRepository.findByStore_IdAndDateBetween(1L, LocalDate.parse("2026-09-01"), LocalDate.parse("2026-09-01"));
    assertThat(list).hasSize(1);
    assertThat(list.get(0).getStartTime()).isEqualTo("09:00");
    assertThat(list.get(0).getEndTime()).isEqualTo("13:00");
}
```

- [ ] **Step 2: テスト失敗確認**

- [ ] **Step 3: ShiftAssignment.java にフィールド追加**

```java
@Column(name = "start_time", length = 5)
private String startTime; // "HH:MM" or null

@Column(name = "end_time", length = 5)
private String endTime;

public String getStartTime() { return startTime; }
public String getEndTime() { return endTime; }
public void setStartTime(String v) { this.startTime = v; }
public void setEndTime(String v) { this.endTime = v; }
```

`UniqueConstraint` を `{"store_id", "date", "slot", "staff_id"}` から `{"store_id", "date", "slot", "staff_id", "start_time"}` に拡張する（同日同スロット内で時間違いの2件を許容したいか確認 → **しない**ことに決定。1スタッフ1日1割当の前提を維持。UniqueConstraintは変更不要）。

- [ ] **Step 4: AssignmentDto / AssignmentBody 拡張**

```java
public record AssignmentDto(String date, String slot, Long staffId, String startTime, String endTime) {
    public static AssignmentDto from(ShiftAssignment a) {
        return new AssignmentDto(a.getDate().toString(), a.getSlot().getCode(), a.getStaff().getId(),
            a.getStartTime(), a.getEndTime());
    }
}

public record AssignmentBody(Long storeId, String date, String slot, Long staffId,
                              String startTime, String endTime) {}
```

- [ ] **Step 5: AssignmentService.assign の引数拡張**

```java
@Transactional
public void assign(Long storeId, LocalDate date, String slotCode, Long staffId,
                   String startTime, String endTime, String changedBy) {
    WorkSlot slot = WorkSlot.fromCode(slotCode);
    var existing = assignmentRepository.findByStore_IdAndDateAndSlotAndStaff_Id(storeId, date, slot, staffId);
    if (existing.isPresent()) {
        // 既存があれば時間だけ更新（冪等性を保ちつつ時間変更を可能に）
        var a = existing.get();
        a.setStartTime(startTime);
        a.setEndTime(endTime);
        return;
    }
    Store store = storeRepository.findById(storeId).orElseThrow();
    Staff staff = staffRepository.findById(staffId).orElseThrow();
    var a = new ShiftAssignment(store, date, slot, staff);
    a.setStartTime(startTime);
    a.setEndTime(endTime);
    assignmentRepository.save(a);
    recordChangeIfApplicable(store, date, slot, staff,
            ShiftChangeHistory.Action.ASSIGN, changedBy);
}
```

- [ ] **Step 6: AssignmentController 修正**

```java
@PostMapping("/assignments")
public void assign(@RequestBody AssignmentBody body, Authentication auth) {
    guard.requireStoreAccess(auth, body.storeId());
    guard.requireStaffInStore(body.staffId(), body.storeId());
    // 半端な片方nullを拒否
    if ((body.startTime() == null) != (body.endTime() == null)) {
        throw new IllegalArgumentException("startTime と endTime は両方指定するか両方省略してください");
    }
    assignmentService.assign(body.storeId(), LocalDate.parse(body.date()), body.slot(),
            body.staffId(), body.startTime(), body.endTime(), auth.getName());
}
```

- [ ] **Step 7: テストpass確認**

Run: `cd backend && ./mvnw.cmd test -q`
Expected: PASS

- [ ] **Step 8: 既存 H2 DB を破棄**

```bash
rm /c/Users/User/shift-app/backend/data/shiftdb.*.db
```

- [ ] **Step 9: コミット**

```bash
git add -u
git commit -m "feat(backend): Assignmentに開始/終了時刻を追加"
```

---

### Task 4.2: フロント型・APIクライアントに時間追加

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/store/assignments.ts`

- [ ] **Step 1: types.ts の Assignment 拡張**

```ts
export interface Assignment {
  date: string;
  slot: WorkSlot;
  staffIds: string[];
  /** 1スタッフ単位の時間。staffIdsと同じ index で対応。 */
  startTimes?: (string | null)[];
  endTimes?: (string | null)[];
}
```

注: 既存のフロント側の Assignment 構造は (date, slot, staffIds[]) の集約形だが、バックエンドは (date, slot, staff, startTime, endTime) のレコード形。フロントで集約するときに時間配列に展開する。

- [ ] **Step 2: client.ts の `ApiAssignment` 拡張**

```ts
export interface ApiAssignment { date: string; slot: 'early' | 'late'; staffId: number; startTime?: string | null; endTime?: string | null; }

async assign(storeId: number, date: string, slot: 'early' | 'late', staffId: number,
              startTime?: string | null, endTime?: string | null): Promise<void> {
  await mutate('/api/assignments', {
    method: 'POST',
    body: JSON.stringify({ storeId, date, slot, staffId, startTime: startTime ?? null, endTime: endTime ?? null }),
  });
}
```

- [ ] **Step 3: store/assignments.ts: ApiAssignment → Assignment への集約に時間配列を含める**

該当の集約関数を確認：

Run: `grep -n "staffIds:" /c/Users/User/shift-app/frontend/src/store/AppContext.tsx /c/Users/User/shift-app/frontend/src/store/assignments.ts`

集約処理で `startTimes[]` `endTimes[]` を埋める：

```ts
// AppContext.tsx の loadAssignments 周り
const grouped = new Map<string, { staffIds: string[]; startTimes: (string|null)[]; endTimes: (string|null)[] }>();
for (const a of apiList) {
  const key = `${a.date}|${a.slot}`;
  const g = grouped.get(key) ?? { staffIds: [], startTimes: [], endTimes: [] };
  g.staffIds.push(String(a.staffId));
  g.startTimes.push(a.startTime ?? null);
  g.endTimes.push(a.endTime ?? null);
  grouped.set(key, g);
}
return Array.from(grouped, ([k, v]) => {
  const [date, slot] = k.split('|');
  return { date, slot: slot as WorkSlot, ...v };
});
```

- [ ] **Step 4: テスト整合**

既存テストの Assignment モックに startTimes/endTimes を任意で追加。空配列でもOKに設計。

Run: `cd frontend && npm test -- --run`
Expected: PASS（オプショナルなので壊れない想定）

- [ ] **Step 5: コミット**

```bash
git add -u
git commit -m "feat(frontend): Assignmentに時間配列を追加"
```

---

### Task 4.3: 空セルクリック → 時間入力モーダル

**Files:**
- Modify: `frontend/src/components/manager/ShiftStaffRow.tsx`
- Modify: `frontend/src/components/manager/ShiftStaffRow.test.tsx`
- Create: `frontend/src/components/manager/AssignTimeModal.tsx`
- Create: `frontend/src/components/manager/AssignTimeModal.test.tsx`

- [ ] **Step 1: 失敗テスト for AssignTimeModal**

```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignTimeModal } from './AssignTimeModal';

it('正社員には早/遅/任意の3ボタンが出る', () => {
  render(<AssignTimeModal open employmentType="正社員" patterns={...} onSave={()=>{}} onClose={()=>{}} />);
  expect(screen.getByRole('button', { name: /早番/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /遅番/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /任意時間/ })).toBeInTheDocument();
});

it('パートは時間入力フォームが直接出る', () => {
  render(<AssignTimeModal open employmentType="パート" patterns={...} onSave={()=>{}} onClose={()=>{}} />);
  expect(screen.getByLabelText('開始')).toBeInTheDocument();
  expect(screen.getByLabelText('終了')).toBeInTheDocument();
});

it('保存で onSave({slot, startTime, endTime})', async () => {
  const onSave = vi.fn();
  const user = userEvent.setup();
  render(<AssignTimeModal open employmentType="パート" patterns={defaultPatterns} onSave={onSave} onClose={()=>{}} />);
  await user.clear(screen.getByLabelText('開始'));
  await user.type(screen.getByLabelText('開始'), '09:00');
  await user.clear(screen.getByLabelText('終了'));
  await user.type(screen.getByLabelText('終了'), '13:00');
  await user.click(screen.getByRole('button', { name: '保存' }));
  expect(onSave).toHaveBeenCalledWith({ slot: 'early', startTime: '09:00', endTime: '13:00' });
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `cd frontend && npm test -- --run AssignTimeModal`
Expected: FAIL

- [ ] **Step 3: AssignTimeModal.tsx 実装**

```tsx
import { useState } from 'react';
import { Modal } from '../ui/Modal';
import type { ShiftPatterns } from '../../lib/shiftPatterns';
import type { EmploymentType, WorkSlot } from '../../types';

export interface AssignResult {
  slot: WorkSlot;
  startTime: string | null;
  endTime: string | null;
}

interface Props {
  open: boolean;
  employmentType: EmploymentType;
  patterns: ShiftPatterns;
  initial?: AssignResult;
  onSave: (result: AssignResult) => void;
  onClose: () => void;
}

export function AssignTimeModal({ open, employmentType, patterns, initial, onSave, onClose }: Props) {
  const [start, setStart] = useState(initial?.startTime ?? '');
  const [end, setEnd] = useState(initial?.endTime ?? '');
  const showSlotButtons = employmentType === '正社員';

  const save = (slot: WorkSlot, s: string | null, e: string | null) => {
    onSave({ slot, startTime: s, endTime: e });
  };

  const saveCustom = () => {
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return;
    const slot: WorkSlot = Number(start.slice(0, 2)) < 12 ? 'early' : 'late';
    save(slot, start, end);
  };

  return (
    <Modal open={open} title="シフトを割り当て" onClose={onClose}>
      <div className="rk-assign-modal">
        {showSlotButtons && (
          <>
            <button type="button" onClick={() => save('early', null, null)}>早番 {patterns.early.start}-{patterns.early.end}</button>
            <button type="button" onClick={() => save('late', null, null)}>遅番 {patterns.late.start}-{patterns.late.end}</button>
            <hr />
            <p>任意時間：</p>
          </>
        )}
        <label>開始 <input type="time" aria-label="開始" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>終了 <input type="time" aria-label="終了" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <button type="button" onClick={saveCustom}>保存</button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: ShiftStaffRow 統合**

空セルクリックで AssignTimeModal を開けるようにする。`ShiftStaffRow.tsx` の `<td className="rk-shift-cell">` 部分、`!requestVisible && !assignmentVisible` のとき空ボタンを置く：

```tsx
{!assignmentVisible && !requestVisible && (
  <button
    type="button"
    className="rk-shift-cell__empty"
    aria-label={`${person.name} ${date} に割当を追加`}
    onClick={() => onOpenAssignModal(date)}
  >
    ＋
  </button>
)}
```

新しい prop `onOpenAssignModal: (date: string) => void;` を ShiftStaffRow に追加。

ShiftTable.tsx 側で AssignTimeModal をマウント。ShiftStaffRow へのコールバックをモーダル開閉につなぐ。

- [ ] **Step 5: onToggleAssignment シグネチャ拡張**

```ts
onToggleAssignment: (
  date: string, slot: WorkSlot, staffId: string, assigned: boolean,
  startTime?: string | null, endTime?: string | null
) => void;
```

ShiftTable から ManagerShiftScreen, AppContext まで呼び出しチェーンに startTime/endTime を伝播。

- [ ] **Step 6: AppContext の assign 呼び出しに反映**

`api.assign(storeId, date, slot, staffIdNum, startTime, endTime)` に渡す。

- [ ] **Step 7: セル表示優先度を更新**

ShiftStaffRow 内でセル表示を更新：

```tsx
{assignmentVisible && cell.assignment && (
  <button ... >
    {cell.assignment.startTime && cell.assignment.endTime
      ? `${cell.assignment.startTime}-${cell.assignment.endTime}`
      : cell.assignment.label /* 既存の 早/遅 */}
  </button>
)}
```

`cell.assignment` に startTime/endTime を持たせるため `shiftViewModel.ts` の `getShiftCellModel` を拡張：

```ts
// shiftViewModel.ts
const assignment = assignments.find(...);
const idx = assignment?.staffIds.indexOf(staffId) ?? -1;
const startTime = idx >= 0 ? assignment?.startTimes?.[idx] ?? null : null;
const endTime = idx >= 0 ? assignment?.endTimes?.[idx] ?? null : null;
return {
  assignment: assignment ? { slot: assignment.slot, label, startTime, endTime } : null,
  ...
};
```

- [ ] **Step 8: テストpass確認**

Run: `cd frontend && npm test -- --run`
Expected: PASS

- [ ] **Step 9: コミット**

```bash
git add -u
git commit -m "feat(shift-table): 空セルクリックで時間入力モーダル"
```

---

### Task 4.4: シードデータから rank/skills 関連を整理、パートに時間サンプル

**Files:**
- Modify: `backend/src/main/java/jp/akiyume/shift/seed/DataSeeder.java`

- [ ] **Step 1: 現状確認**

Run: `head -80 /c/Users/User/shift-app/backend/src/main/java/jp/akiyume/shift/seed/DataSeeder.java`

- [ ] **Step 2: rank/skills 設定行を削除**

`setRank(...)` `setSkills(...)` 呼び出しを削除。`setMonthlyHourLimit(87)` をパート扱いのスタッフに、`setMonthlyHourLimit(null)` を正社員に。

- [ ] **Step 3: デモ割当に時間入りサンプルを混ぜる**

既存のデモ割当作成ループで、パートのスタッフには startTime/endTime を設定：

```java
var a = new ShiftAssignment(store, date, WorkSlot.EARLY, partStaff);
a.setStartTime("09:00");
a.setEndTime("13:00");
assignmentRepository.save(a);
```

- [ ] **Step 4: H2 DB を破棄して再起動**

```bash
rm /c/Users/User/shift-app/backend/data/shiftdb.*.db
```

- [ ] **Step 5: テスト確認**

Run: `cd backend && ./mvnw.cmd test -q`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add -u
git commit -m "chore(seed): rank/skills削除、パートに時間割当サンプル追加"
```

---

## Phase 5: 「先月と同じ」コピー機能

### Task 5.1: 曜日パターン化コピーアルゴリズム

**Files:**
- Create: `frontend/src/lib/previousMonthCopy.ts`
- Create: `frontend/src/lib/previousMonthCopy.test.ts`

- [ ] **Step 1: 失敗テスト**

```ts
import { describe, it, expect } from 'vitest';
import { previousMonthByWeekday } from './previousMonthCopy';

type Item = { date: string; value: string };

describe('previousMonthByWeekday', () => {
  it('同曜日の最頻値を翌月の同曜日全てに適用', () => {
    // 2026-05: 月曜が4回（5/4, 5/11, 5/18, 5/25）→ 3回 early, 1回 off → 最頻 early
    const prev: Item[] = [
      { date: '2026-05-04', value: 'early' },
      { date: '2026-05-11', value: 'early' },
      { date: '2026-05-18', value: 'early' },
      { date: '2026-05-25', value: 'off' },
    ];
    const targetDates = ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29']; // 月曜
    const result = previousMonthByWeekday(prev, targetDates, (i) => i.value);
    expect(result).toEqual({
      '2026-06-01': 'early',
      '2026-06-08': 'early',
      '2026-06-15': 'early',
      '2026-06-22': 'early',
      '2026-06-29': 'early',
    });
  });

  it('同数のときは最新日付の値', () => {
    const prev: Item[] = [
      { date: '2026-05-04', value: 'early' },
      { date: '2026-05-11', value: 'late' },
    ];
    const result = previousMonthByWeekday(prev, ['2026-06-01'], (i) => i.value);
    expect(result['2026-06-01']).toBe('late'); // 最新（5/11）
  });

  it('該当曜日のデータがない target は値が undefined', () => {
    const result = previousMonthByWeekday([], ['2026-06-01'], (i: Item) => i.value);
    expect(result['2026-06-01']).toBeUndefined();
  });
});
```

- [ ] **Step 2: テスト失敗確認**

Run: `cd frontend && npm test -- --run previousMonthCopy`

- [ ] **Step 3: 実装**

```ts
export function previousMonthByWeekday<T>(
  prevItems: T[],
  targetDates: string[],
  getValue: (item: T) => string | null | undefined,
): Record<string, string | undefined> {
  // group prevItems by weekday
  const byWeekday = new Map<number, { date: string; value: string }[]>();
  for (const item of prevItems) {
    const v = getValue(item);
    if (v == null) continue;
    const date = (item as any).date as string;
    const wd = new Date(`${date}T00:00:00`).getDay();
    const list = byWeekday.get(wd) ?? [];
    list.push({ date, value: v });
    byWeekday.set(wd, list);
  }
  // pick mode per weekday (newest on tie)
  const modeByWeekday = new Map<number, string>();
  for (const [wd, items] of byWeekday) {
    items.sort((a, b) => b.date.localeCompare(a.date));  // newest first
    const counts = new Map<string, number>();
    for (const it of items) counts.set(it.value, (counts.get(it.value) ?? 0) + 1);
    let bestValue = items[0].value;
    let bestCount = 0;
    for (const it of items) {
      const c = counts.get(it.value) ?? 0;
      if (c > bestCount) {
        bestCount = c;
        bestValue = it.value;
      }
    }
    modeByWeekday.set(wd, bestValue);
  }
  const result: Record<string, string | undefined> = {};
  for (const date of targetDates) {
    const wd = new Date(`${date}T00:00:00`).getDay();
    result[date] = modeByWeekday.get(wd);
  }
  return result;
}
```

- [ ] **Step 4: テストpass確認**

Run: `cd frontend && npm test -- --run previousMonthCopy`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add -u
git commit -m "feat(lib): 先月の曜日パターンコピーを実装"
```

---

### Task 5.2: 店長シフト表に「先月と同じ」ボタン追加

**Files:**
- Modify: `frontend/src/components/manager/ShiftStaffRow.tsx`
- Modify: `frontend/src/components/manager/ShiftTable.tsx`
- Modify: `frontend/src/components/manager/ManagerShiftScreen.tsx`
- Modify: `frontend/src/store/AppContext.tsx`

- [ ] **Step 1: previousMonth ヘルパを `frontend/src/lib/date.ts` に追加**

```ts
export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
```

短いユニットテストも追加：

```ts
// frontend/src/lib/date.test.ts
import { previousMonth } from './date';
it('previousMonth: 月境界', () => {
  expect(previousMonth('2026-01')).toBe('2025-12');
  expect(previousMonth('2026-06')).toBe('2026-05');
});
```

- [ ] **Step 2: AppContext に「先月割当を取得して曜日コピー」関数**

```ts
import { previousMonth } from '../lib/date';
import { previousMonthByWeekday } from '../lib/previousMonthCopy';

async function copyPreviousMonthAssignments(staffId: string): Promise<void> {
  const prev = previousMonth(month);
  const prevList = await api.assignments(Number(storeId), prev);
  const myPrev = prevList.filter((a) => String(a.staffId) === staffId);
  const targetDates = getMonthDates(Number(month.slice(0,4)), Number(month.slice(5,7)));
  const items = myPrev.map((a) => ({ date: a.date, slot: a.slot, startTime: a.startTime, endTime: a.endTime }));
  // 曜日ごとに値（slot|startTime|endTime をシリアライズ）
  const serialized = items.map(it => ({ date: it.date, value: `${it.slot}|${it.startTime ?? ''}|${it.endTime ?? ''}` }));
  const plan = previousMonthByWeekday(serialized, targetDates, (i: any) => i.value);
  // 既存今月の割当を全削除→新規割当
  const current = assignments.filter((a) => a.staffIds.includes(staffId));
  for (const a of current) {
    await api.unassign(Number(storeId), a.date, a.slot, Number(staffId));
  }
  for (const [date, value] of Object.entries(plan)) {
    if (!value) continue;
    const [slot, start, end] = value.split('|');
    await api.assign(Number(storeId), date, slot as WorkSlot, Number(staffId),
                     start || null, end || null);
  }
  await reloadAssignments(); // 既存
}
```

`AppContext` の expose に `copyPreviousMonthAssignments` を追加。

- [ ] **Step 3: ShiftStaffRow にボタン追加**

```tsx
<th scope="row" className="rk-shift-staff">
  <span className="rk-shift-staff__name">{person.name}</span>
  <button
    type="button"
    className="rk-shift-staff__copy"
    aria-label={`${person.name}の先月と同じシフトを今月に複製`}
    onClick={() => onCopyPreviousMonth(person.id)}
  >
    先月と同じ
  </button>
  ...
</th>
```

新prop `onCopyPreviousMonth: (staffId: string) => void;`

- [ ] **Step 4: ManagerShiftScreen でコールバック繋ぐ**

確認モーダル → `copyPreviousMonthAssignments(staffId)` → トースト。

- [ ] **Step 5: テスト**

`ShiftStaffRow.test.tsx` に：

```ts
it('「先月と同じ」ボタンが表示される', () => {
  const onCopy = vi.fn();
  render(<ShiftStaffRow person={person} ... onCopyPreviousMonth={onCopy} />);
  expect(screen.getByRole('button', { name: /先月と同じ/ })).toBeInTheDocument();
});
```

- [ ] **Step 6: テストpass確認**

Run: `cd frontend && npm test -- --run`

- [ ] **Step 7: コミット**

```bash
git add -u
git commit -m "feat(manager): 店長シフト表に「先月と同じ」ボタン追加"
```

---

### Task 5.3: スタッフ側「先月と同じ希望」改修

**Files:**
- Modify: `frontend/src/components/RequestEditor.tsx`
- Modify: `frontend/src/components/RequestEditor.test.tsx`
- Modify: `frontend/src/api/client.ts` (任意月の自分のrequestsを取得する関数があるか確認)

- [ ] **Step 1: API に「指定月の自分の requests」取得関数**

`api.requests(storeId, month)` は店舗全員分を返す。クライアント側でstaffIdでフィルタしてOK。なので新API不要。

- [ ] **Step 2: 失敗テスト**

`RequestEditor.test.tsx` に：

```ts
it('「先月と同じ希望」ボタンを押すと先月の曜日パターンがdraftにセットされる', async () => {
  // 前月: 月曜 early が複数
  // 今月: 月曜が draft で early になることを確認
  const user = userEvent.setup();
  setupApiWithPrevRequests([
    { staffId: 1, date: '2026-05-04', slot: 'early', startTime: '09:00', endTime: '13:00' },
    { staffId: 1, date: '2026-05-11', slot: 'early', startTime: '09:00', endTime: '13:00' },
  ]);
  renderRequestEditor({ year: 2026, month: 6 });
  await user.click(screen.getByRole('button', { name: /先月と同じ希望/ }));
  // 6月の月曜（6/1, 6/8, ...）が draft で early 表示になっている
  expect(screen.getByText(/6\/1\(月\)/).closest('div')!.textContent).toMatch(/出勤/);
});
```

- [ ] **Step 3: テスト失敗確認**

- [ ] **Step 4: RequestEditor.tsx 改修**

```tsx
import { previousMonthByWeekday } from '../lib/previousMonthCopy';
import { previousMonth } from '../lib/date';

async function copyPreviousMonth() {
  const prevMonth = previousMonth(`${year}-${String(month).padStart(2, '0')}`);
  const prevList = await api.requests(storeId, prevMonth);
  const myPrev = prevList.filter((r) => String(r.staffId) === myId);
  const serialized = myPrev.map(r => ({
    date: r.date,
    value: `${r.slot}|${r.startTime ?? ''}|${r.endTime ?? ''}`,
  }));
  const plan = previousMonthByWeekday(serialized, dates, (i: any) => i.value);
  const newReq: Record<string, DayRequestValue> = {};
  const newTime: Record<string, { start: string; end: string }> = {};
  for (const [date, value] of Object.entries(plan)) {
    if (!value) continue;
    const [slot, start, end] = value.split('|');
    newReq[date] = slot as DayRequestValue;
    if (start && end) newTime[date] = { start, end };
  }
  setRequestDrafts(newReq);
  setTimeDrafts(newTime);
  setSubmitted(false);
  showToast('先月と同じ希望をセットしました');
}
```

ボタンのラベルを変更し動作差し替え：

```tsx
<button ... onClick={copyPreviousMonth}>先月と同じ希望</button>
```

`previousMonth` ヘルパは Task 5.2 Step 1 で `lib/date.ts` に追加済み。

- [ ] **Step 5: テストpass確認**

Run: `cd frontend && npm test -- --run RequestEditor`

- [ ] **Step 6: コミット**

```bash
git add -u
git commit -m "feat(staff): 「先月と同じ希望」ボタンを曜日パターンコピーへ改修"
```

---

## Phase 6: 文字大・15人スクロールなしレイアウト

### Task 6.1: 表示設定の初期値を「大」に

**Files:**
- Modify: `frontend/src/components/manager/SectionBody.tsx`

- [ ] **Step 1: useSetting のデフォルト変更**

```ts
const [fontSize, setFontSize] = useSetting<'small' | 'standard' | 'large'>(`akiyume-fontsize:${storeId}`, 'large');
```

注: 既存のローカルストレージに値があれば優先される。新規店舗のみデフォルト変更。

- [ ] **Step 2: コミット**

```bash
git add -u
git commit -m "feat(display): 文字サイズの初期値を「大」に"
```

---

### Task 6.2: CSS で大サイズ強化 + 行密度詰め

**Files:**
- Modify: `frontend/src/styles/` 配下の該当CSSファイル

- [ ] **Step 1: 該当ファイル特定**

Run: `grep -rln "rk-app--large\|rk-shift-staff-row" /c/Users/User/shift-app/frontend/src/styles`

- [ ] **Step 2: `.rk-app--large` の base font-size を 18px に**

該当箇所を編集：

```css
.rk-app--large { font-size: 18px; }
```

- [ ] **Step 3: シフト表のパディング・列幅を縮小**

```css
.rk-shift-staff-row--medium .rk-shift-cell { padding: 0.35rem 0.4rem; }
.rk-shift-staff { min-width: 100px; padding: 0.35rem 0.4rem; }
.rk-shift-table th, .rk-shift-table td { font-size: 0.95em; }
```

- [ ] **Step 4: 開発サーバで目視確認**

Run: `cd backend && ./mvnw.cmd spring-boot:run` (バックグラウンド)
Run: `cd frontend && npm run dev`

ブラウザで店長ログインしてシフト表を確認。15人で1080px画面にスクロールなしで収まるか目視。

- [ ] **Step 5: 微調整**

15人入らなければさらにパディング詰める。

- [ ] **Step 6: コミット**

```bash
git add -u
git commit -m "style(shift-table): 行密度を詰めて15人をスクロールなしで表示"
```

---

## Phase 7: rank/skills の最終削除（後片付け）

### Task 7.1: バックエンド Staff から rank/skills 削除

**Files:**
- Modify: `backend/src/main/java/jp/akiyume/shift/domain/Staff.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/dto/StaffDto.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/dto/UpdateStaffBody.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/StaffController.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/repo/service/StaffService.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/seed/DataSeeder.java`
- Modify: 既存テスト

- [ ] **Step 1: バックエンドテストの rank/skills 依存箇所を確認**

Run: `cd backend && grep -rn "setRank\|setSkills\|getRank\|getSkills" src/`

- [ ] **Step 2: 失敗テストを書く（または既存修正）**

```java
@Test
void putStaff_doesNotAcceptRankOrSkills() throws Exception {
    // body に rank/skills を含めても無視される
    mvc.perform(put("/api/staff/" + staffId)
        .with(csrf()).with(managerAuth())
        .contentType(APPLICATION_JSON)
        .content("{\"hourlyWage\":1000,\"monthlyHourLimit\":87}"))
       .andExpect(status().isOk());
}
```

- [ ] **Step 3: Staff.java から rank/skills フィールド・メソッド削除**

`private Integer rank;` `private String skills;` getter/setter 全削除。

- [ ] **Step 4: StaffDto / UpdateStaffBody / Controller / Service の rank/skills を削除**

```java
public record StaffDto(Long id, String name, String employmentType, String role,
                       Integer hourlyWage, Integer monthlyHourLimit) {
    public static StaffDto from(Staff s) {
        return new StaffDto(s.getId(), s.getName(), s.getEmploymentType().name(),
            s.getRole().name(), s.getHourlyWage(), s.getMonthlyHourLimit());
    }
}

public record UpdateStaffBody(Integer hourlyWage, Integer monthlyHourLimit) {}
```

- [ ] **Step 5: DataSeeder の setRank/setSkills を完全削除**

- [ ] **Step 6: H2 DB を破棄**

```bash
rm /c/Users/User/shift-app/backend/data/shiftdb.*.db
```

- [ ] **Step 7: テスト確認**

Run: `cd backend && ./mvnw.cmd test -q`
Expected: PASS

- [ ] **Step 8: コミット**

```bash
git add -u
git commit -m "refactor(backend): Staffからrank/skillsを完全削除"
```

---

### Task 7.2: フロント types.ts と参照箇所から rank/skills 削除

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/store/AppContext.tsx`
- Modify: `frontend/src/components/manager/SectionBody.tsx` (一覧画面のランク/スキル列)

- [ ] **Step 1: Staff 型から rank/skills 削除**

```ts
export interface Staff {
  id: string;
  name: string;
  storeId: string;
  employmentType: EmploymentType;
  role: 'STAFF' | 'MANAGER';
  hourlyWage?: number | null;
  monthlyHourLimit?: number | null;
}
```

- [ ] **Step 2: ApiStaff / updateStaff からも削除**

```ts
export interface ApiStaff { id: number; name: string; employmentType: string; role: string; hourlyWage?: number | null; monthlyHourLimit?: number | null; }
async updateStaff(id: number, hourlyWage?: number | null, monthlyHourLimit?: number | null): Promise<void> {
  await mutate(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ hourlyWage, monthlyHourLimit }),
  });
}
```

- [ ] **Step 3: 参照箇所のコンパイルエラーを修正**

Run: `cd frontend && npm run build` または `npm run typecheck`

エラーが出る箇所（SectionBody.tsx のランク/スキル列など）を削除。

- [ ] **Step 4: テストpass確認**

Run: `cd frontend && npm test -- --run`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add -u
git commit -m "refactor(frontend): Staff型からrank/skillsを完全削除"
```

---

## Phase 8: 最終確認

### Task 8.1: フルテストとデモ確認

- [ ] **Step 1: 全テスト緑**

Run: `cd backend && ./mvnw.cmd test -q && cd ../frontend && npm test -- --run`
Expected: 両方 PASS

- [ ] **Step 2: backend を立ち上げてデモ動作確認**

```bash
rm /c/Users/User/shift-app/backend/data/shiftdb.*.db
cd /c/Users/User/shift-app/backend && ./mvnw.cmd spring-boot:run
```

別ターミナルで：

```bash
cd /c/Users/User/shift-app/frontend && npm run dev
```

確認項目（チェックリスト）：
- [ ] 店長ログイン → ナビに「計画」「ランク設定」「スキル設定」がない
- [ ] ナビ「設定」に「モデルシフト」がある
- [ ] ナビ「シフト確定」グループ名になっている
- [ ] シフト表のサマリーに売上計画/人件費/人時売上高/ランク計が出ない
- [ ] スタッフ並びがパート→アルバイト→正社員
- [ ] スタッフ名横に「先月と同じ」ボタン
- [ ] 月時間が上限に近い人の時間表示が色付き
- [ ] 空セルクリックで時間入力モーダル → パートは時間直入力、正社員は早/遅ボタン+任意
- [ ] パートに 9:00-13:00 で割当 → セルに「9:00-13:00」表示
- [ ] スタッフログイン → 「シフト確定」画面に希望（点線）が出ない
- [ ] スタッフ画面「先月と同じ希望」ボタンが動く
- [ ] シフト周期に「半月」が無い
- [ ] 文字が大きい・15人見える

- [ ] **Step 3: 修正があれば追加コミット**

- [ ] **Step 4: 計画完了**

---

## 完了基準

- 全テスト緑
- Phase 8 のチェックリスト全項目OK
- `git log --oneline` で各Phaseのコミットが順に並ぶ
