# 中番完全削除 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** フロントエンド、バックエンド、H2、初期データ、テストから中番を完全に削除し、早番・遅番・休みだけの安全な基盤を作る。

**Architecture:** 先にバックエンドの列挙値と入力境界から `mid/MID` を排除し、次にフロントエンドの型と表示を縮小する。旧ファイルDBは中番を変換せず、検証済みのデモDBだけを再生成する。

**Tech Stack:** Java 17, Spring Boot 3.5, Spring Data JPA, H2, JUnit 5, MockMvc, React 18, TypeScript, Vitest.

## Global Constraints

- 中番を早番または遅番へ自動変換しない。
- QRコード、LINE連携は実装しない。
- Tailwind CSSやUIライブラリを追加しない。
- 既存の資料ファイルとユーザー変更をステージしない。
- コミットメッセージやソースへAIツール名を追加しない。
- サブエージェントを使用せず、実装はインラインで行う。

---

## File Structure

### Backend

- `backend/src/main/java/jp/akiyume/shift/domain/WorkSlot.java` — 確定シフト区分を `EARLY/LATE` に限定。
- `backend/src/main/java/jp/akiyume/shift/domain/RequestSlot.java` — 移行期間中の希望区分を `EARLY/LATE/OFF` に限定。
- `backend/src/main/java/jp/akiyume/shift/repo/service/RequestService.java` — `mid` を400へ変換できる検証例外を返す。
- `backend/src/main/java/jp/akiyume/shift/web/ApiExceptionHandler.java` — 不正区分をJSONの400エラーにする。
- `backend/src/main/java/jp/akiyume/shift/seed/DataSeeder.java` — 早番・遅番・休みだけを投入。
- `backend/src/test/java/jp/akiyume/shift/web/RequestControllerTest.java` — `mid` 拒否と早番・遅番・休みを検証。
- `backend/src/test/java/jp/akiyume/shift/web/AssignmentControllerTest.java` — 中番割り当て拒否を検証。
- `backend/src/test/java/jp/akiyume/shift/seed/DataSeederTest.java` — seedにMIDがないことを検証。

### Frontend

- `frontend/src/types.ts` — `WorkSlot` と `DayRequestValue` から `mid` を削除。
- `frontend/src/constants.ts` — ラベル、時間、時間数から中番を削除。
- `frontend/src/api/client.ts` — API区分型を早番・遅番へ限定。
- `frontend/src/store/requests.ts` — 中番優先ロジックを削除。
- `frontend/src/store/requests.test.ts` — 早番・遅番・休みのみを検証。
- `frontend/src/components/ui/summary.ts` — 中番件数を削除。
- `frontend/src/components/ui/SummaryBar.tsx` — 中番表示を削除。
- `frontend/src/components/ui/Legend.tsx` — 中番凡例を削除。
- `frontend/src/components/RequestEditor.tsx` — 旧画面から中番を削除。後続計画で画面自体を置換。
- `frontend/src/components/StaffApp.tsx` — 中番文言と絵文字を削除。
- `frontend/src/components/manager/types.ts` — `visibleSlots.mid` を削除。
- `frontend/src/components/manager/ManagerShiftScreen.tsx` — シフト種類ダイアログから中番を削除。
- `frontend/src/components/manager/DayTimeline.tsx` — 中番バーを削除。
- `frontend/src/components/manager/ShiftTableSummaryRows.tsx` — 必要人数帯の中番依存を削除。
- 関連する `*.test.ts` / `*.test.tsx` — 中番fixtureと期待値を削除。
- `frontend/src/styles.css` — `.mid`、`--mid-*`、`sel-mid`、`rk-*-mid` を削除。

---

### Task 1: バックエンド列挙値と入力検証

**Files:**
- Modify: `backend/src/main/java/jp/akiyume/shift/domain/WorkSlot.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/domain/RequestSlot.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/repo/service/RequestService.java`
- Create: `backend/src/main/java/jp/akiyume/shift/web/ApiExceptionHandler.java`
- Modify: `backend/src/test/java/jp/akiyume/shift/web/RequestControllerTest.java`
- Modify: `backend/src/test/java/jp/akiyume/shift/web/AssignmentControllerTest.java`

**Interfaces:**
- Produces: `WorkSlot.fromCode(String): WorkSlot` は `early|late` だけを受理。
- Produces: `RequestService.setDayRequest(String username, LocalDate date, String value)` は `early|late|off|none` だけを受理。
- Produces: `IllegalArgumentException` は `{"message":"例外メッセージ"}` のHTTP 400になる。

- [ ] **Step 1: 中番拒否のコントローラテストを書く**

```java
@Test
@WithMockUser(username = "nakashima-1")
void putRequest_mid_returns400() throws Exception {
    mvc.perform(put("/api/requests")
            .contentType("application/json")
            .content("{\"date\":\"2026-07-01\",\"value\":\"mid\"}"))
       .andExpect(status().isBadRequest())
       .andExpect(jsonPath("$.message").value("Unknown request value: mid"));
}

@Test
@WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
void manager_cannotAssign_mid() throws Exception {
    mvc.perform(post("/api/assignments")
            .contentType("application/json")
            .content("{\"storeId\":1,\"date\":\"2026-07-03\",\"slot\":\"mid\",\"staffId\":2}"))
       .andExpect(status().isBadRequest())
       .andExpect(jsonPath("$.message").value("Unknown work slot: mid"));
}
```

- [ ] **Step 2: 失敗を確認する**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=RequestControllerTest,AssignmentControllerTest test
```

Expected: 現在は `mid` が成功するためFAIL。

- [ ] **Step 3: 列挙値とサービスを最小変更する**

```java
public enum WorkSlot {
    EARLY("early"),
    LATE("late");
}
```

```java
public enum RequestSlot {
    EARLY("early"),
    LATE("late"),
    OFF("off");
}
```

`RequestService` のswitchは次に限定する。

```java
switch (value) {
    case "early" -> added.add(new ShiftRequest(staff, date, RequestSlot.EARLY));
    case "late" -> added.add(new ShiftRequest(staff, date, RequestSlot.LATE));
    case "off" -> added.add(new ShiftRequest(staff, date, RequestSlot.OFF));
    case "none" -> { }
    default -> throw new IllegalArgumentException("Unknown request value: " + value);
}
```

例外ハンドラ:

```java
@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    Map<String, String> illegalArgument(IllegalArgumentException error) {
        return Map.of("message", error.getMessage());
    }
}
```

- [ ] **Step 4: 対象テストを通す**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=RequestControllerTest,AssignmentControllerTest test
```

Expected: PASS。

- [ ] **Step 5: コミットする**

```cmd
git add -- backend/src/main/java/jp/akiyume/shift/domain/WorkSlot.java backend/src/main/java/jp/akiyume/shift/domain/RequestSlot.java backend/src/main/java/jp/akiyume/shift/repo/service/RequestService.java backend/src/main/java/jp/akiyume/shift/web/ApiExceptionHandler.java backend/src/test/java/jp/akiyume/shift/web/RequestControllerTest.java backend/src/test/java/jp/akiyume/shift/web/AssignmentControllerTest.java
git commit -m "refactor(backend): remove mid shift slot"
```

---

### Task 2: デモデータから中番を除去

**Files:**
- Modify: `backend/src/main/java/jp/akiyume/shift/seed/DataSeeder.java`
- Modify: `backend/src/test/java/jp/akiyume/shift/seed/DataSeederTest.java`

**Interfaces:**
- Produces: デモ希望と割り当ては `EARLY/LATE/OFF` のみ。

- [ ] **Step 1: seedの区分を検査するテストを書く**

```java
@Autowired ShiftRequestRepository requestRepository;
@Autowired ShiftAssignmentRepository assignmentRepository;

@Test
void demoSeedContainsNoMidSlot() {
    assertThat(requestRepository.findAll())
        .extracting(request -> request.getSlot().getCode())
        .doesNotContain("mid");
    assertThat(assignmentRepository.findAll())
        .extracting(assignment -> assignment.getSlot().getCode())
        .doesNotContain("mid");
}
```

テストプロファイルでこのテストだけ `app.seed-demo-shifts=true` を指定する。

- [ ] **Step 2: 失敗またはコンパイルエラーを確認する**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=DataSeederTest test
```

Expected: `RequestSlot.MID` / `WorkSlot.MID` が残っているためFAIL。

- [ ] **Step 3: パターンを早番・遅番・休みだけにする**

```java
RequestSlot[] pattern1 = {
    RequestSlot.EARLY, RequestSlot.EARLY, RequestSlot.OFF, RequestSlot.EARLY
};
RequestSlot[] pattern2 = {
    RequestSlot.LATE, RequestSlot.EARLY, RequestSlot.LATE, RequestSlot.OFF
};
RequestSlot[] pattern3 = {
    RequestSlot.EARLY, RequestSlot.LATE, RequestSlot.EARLY, RequestSlot.LATE
};
RequestSlot[] pattern4 = {
    RequestSlot.OFF, RequestSlot.EARLY, RequestSlot.EARLY, RequestSlot.LATE
};
```

`toWorkSlot`:

```java
return switch (slot) {
    case EARLY -> WorkSlot.EARLY;
    case LATE -> WorkSlot.LATE;
    case OFF -> throw new IllegalArgumentException("OFF は割り当てできません");
};
```

- [ ] **Step 4: seedテストを通す**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=DataSeederTest test
```

Expected: PASS。

- [ ] **Step 5: コミットする**

```cmd
git add -- backend/src/main/java/jp/akiyume/shift/seed/DataSeeder.java backend/src/test/java/jp/akiyume/shift/seed/DataSeederTest.java
git commit -m "fix(backend): seed early and late shifts only"
```

---

### Task 3: フロントエンド型と純粋関数から中番を削除

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/constants.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/store/requests.ts`
- Modify: `frontend/src/store/requests.test.ts`
- Modify: `frontend/src/components/ui/summary.ts`
- Modify: `frontend/src/components/ui/summary.test.ts`
- Modify: `frontend/src/store/labor.test.ts`
- Modify: `frontend/src/store/assignments.test.ts`

**Interfaces:**
- Produces: `type WorkSlot = 'early' | 'late'`
- Produces: `type DayRequestValue = 'none' | 'early' | 'late' | 'off'`
- Produces: `RequestSummary = {total, submitted, early, late, off}`

- [ ] **Step 1: 型と集計の期待テストを変更する**

```ts
expect(summarizeRequests(requests, 'p1', dates)).toEqual({
  total: 3,
  submitted: 3,
  early: 1,
  late: 1,
  off: 1,
});
```

`requests.test.ts` は早番・遅番・休みの取得と置換だけを残す。

- [ ] **Step 2: 型チェックの失敗を確認する**

Run:

```cmd
cd frontend
npx tsc --noEmit
```

Expected: `mid` を参照するファイルが型エラーになる。

- [ ] **Step 3: 型と定数を縮小する**

```ts
export type WorkSlot = 'early' | 'late';
export type DayRequestValue = 'none' | WorkSlot | 'off';
export type RequestSlot = WorkSlot | 'off';
```

```ts
export const SLOT_LABELS = {
  early: '早番',
  late: '遅番',
} satisfies Record<WorkSlot, string>;

export const SLOT_TIMES = {
  early: '7:00-16:00',
  late: '15:00-24:00',
} satisfies Record<WorkSlot, string>;

export const WORK_SLOTS: WorkSlot[] = ['early', 'late'];
export const SLOT_HOURS: Record<WorkSlot, number> = { early: 9, late: 9 };
```

`getDayRequest` の優先順:

```ts
if (slots.includes('off')) return 'off';
if (slots.includes('early')) return 'early';
if (slots.includes('late')) return 'late';
return 'none';
```

- [ ] **Step 4: 純粋関数テストと型チェックを通す**

Run:

```cmd
cd frontend
npx vitest run src/store src/components/ui/summary.test.ts
npx tsc --noEmit
```

Expected: PASS。ただしUIの中番参照が残る場合は型チェックがその場所を列挙する。

- [ ] **Step 5: コミットする**

```cmd
git add -- frontend/src/types.ts frontend/src/constants.ts frontend/src/api/client.ts frontend/src/store/requests.ts frontend/src/store/requests.test.ts frontend/src/components/ui/summary.ts frontend/src/components/ui/summary.test.ts frontend/src/store/labor.test.ts frontend/src/store/assignments.test.ts
git commit -m "refactor(frontend): remove mid shift types"
```

---

### Task 4: 全UIから中番を削除

**Files:**
- Modify: `frontend/src/components/RequestEditor.tsx`
- Modify: `frontend/src/components/StaffApp.tsx`
- Modify: `frontend/src/components/ui/SummaryBar.tsx`
- Modify: `frontend/src/components/ui/Legend.tsx`
- Modify: `frontend/src/components/manager/types.ts`
- Modify: `frontend/src/components/manager/ManagerShiftScreen.tsx`
- Modify: `frontend/src/components/manager/DayTimeline.tsx`
- Modify: `frontend/src/components/manager/ShiftTableSummaryRows.tsx`
- Modify: `frontend/src/components/manager/shiftViewModel.test.ts`
- Modify: `frontend/src/components/manager/ShiftStaffRow.test.tsx`
- Modify: `frontend/src/components/manager/DayTimeline.test.tsx`
- Modify: `frontend/src/components/manager/ManagerShiftScreen.test.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Produces: シフト種類ダイアログは早番・遅番・休みのみ。
- Produces: 日別タイムラインは早番と遅番のみ。
- Produces: 画面テキストに「中番」が存在しない。

- [ ] **Step 1: 中番不在の回帰テストを書く**

`ManagerShiftScreen.test.tsx`:

```tsx
await user.click(screen.getByRole('button', { name: 'シフトの種類' }));
expect(screen.queryByText('中番')).not.toBeInTheDocument();
expect(screen.getByText('早番')).toBeInTheDocument();
expect(screen.getByText('遅番')).toBeInTheDocument();
```

`RequestEditor` のテストを新設する場合:

```tsx
expect(screen.queryByRole('button', { name: '中番' })).not.toBeInTheDocument();
```

- [ ] **Step 2: テストと型チェックの失敗を確認する**

Run:

```cmd
cd frontend
npx vitest run src/components/manager src/components/RequestEditor.test.tsx
npx tsc --noEmit
```

Expected: 旧中番UIまたは型参照でFAIL。

- [ ] **Step 3: UIとCSSを削除する**

`DEFAULT_SHIFT_LAYERS.visibleSlots`:

```ts
visibleSlots: {
  early: true,
  late: true,
  off: true,
}
```

シフト種類:

```ts
[
  ['early', '早番'],
  ['late', '遅番'],
  ['off', '休'],
] as const
```

`DayTimeline`:

```ts
const SLOT_RANGE = {
  early: { start: 7, end: 16 },
  late: { start: 15, end: 24 },
} satisfies Record<WorkSlot, { start: number; end: number }>;
```

集計帯は中番という固定区分に依存せず、早番・遅番の時間重複で集計する。

```ts
const BANDS = [
  { key: 'morning', label: '09:00 - 14:00', slots: ['early'] },
  { key: 'afternoon', label: '14:00 - 19:00', slots: ['early', 'late'] },
  { key: 'night', label: '19:00 - 23:00', slots: ['late'] },
] satisfies BandDefinition[];
```

CSSから次を削除する。

```text
--mid
--mid-soft
--mid-text
.chip.mid
.pick.sel-mid
.filter-chip.mid
.rk-shift-chip--mid
.rk-day-timeline__bar--mid
```

- [ ] **Step 4: 中番文字列スキャンと全フロント検証を行う**

Run:

```cmd
cd frontend
rg -n "mid|中番" src
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected:

- `rg` は意図的な拒否テスト以外0件。
- 型チェック、全テスト、ビルドがPASS。

- [ ] **Step 5: コミットする**

```cmd
git add -- frontend/src
git commit -m "feat(frontend): remove mid shift UI"
```

---

### Task 5: 開発H2を安全に再生成して最終検証

**Files:**
- Runtime data only: `backend/data/shiftdb.mv.db`
- Test: frontend and backend full suites

**Interfaces:**
- Produces: 新規H2スキーマの列挙値にMIDが存在しない。

- [ ] **Step 1: DBパスを検証する**

Run:

```powershell
$target = Resolve-Path 'backend\data\shiftdb.mv.db' -ErrorAction SilentlyContinue
if ($target -and -not $target.Path.StartsWith((Resolve-Path 'backend').Path)) { throw 'Unexpected DB path' }
$target
```

Expected: 存在する場合は `C:\Users\User\shift-app\backend\data\shiftdb.mv.db`。

- [ ] **Step 2: 開発サーバーが停止していることを確認する**

Run:

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
```

Expected: 出力なし。待受がある場合は所有プロセスを確認してから停止する。

- [ ] **Step 3: デモDBだけを削除する**

```powershell
$root = (Resolve-Path 'backend').Path
$target = Join-Path $root 'data\shiftdb.mv.db'
if (Test-Path -LiteralPath $target) {
  $resolved = (Resolve-Path -LiteralPath $target).Path
  if (-not $resolved.StartsWith($root)) { throw 'Unsafe DB target' }
  Remove-Item -LiteralPath $resolved
}
```

- [ ] **Step 4: 全検証を実行する**

Run:

```cmd
cd backend
mvnw.cmd test
cd ..\frontend
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected: 全成功。

- [ ] **Step 5: Git差分を確認する**

Run:

```cmd
git status --short
git diff --check
```

Expected: 資料ファイル以外の未コミット差分なし。DBはGit管理対象に含めない。
