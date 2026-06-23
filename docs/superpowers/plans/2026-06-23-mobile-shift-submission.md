# スマホシフト一括提出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スタッフがスマートフォンで提出期間を選び、全日分の勤務可否・開始終了時刻・メモを確認後に一括提出し、再編集できるようにする。

**Architecture:** 提出期間、提出ヘッダー、日別入力を正規化したSpring Data JPAモデルで保存し、期間単位のPUTを1トランザクションで処理する。フロントエンドはAPI状態と編集中ドラフトを分離し、入口、期間選択、入力、確認、完了の5状態を単一のスタッフ向けフローとして構成する。

**Tech Stack:** Java 17, Spring Boot 3.5, Spring Data JPA, H2, React 18, TypeScript, Vitest, Testing Library, CSS.

## Global Constraints

- 先に `2026-06-23-remove-mid-shift-domain.md` を完了する。
- QRコード、LINE登録、LINE通知を実装しない。
- 中番を復活させない。
- スマホ幅320pxから操作可能にする。
- 日別入力は巨大なカードにせず、薄い罫線の縦一覧にする。
- 一括提出は全件成功または全件失敗にする。
- サブエージェントを使用せず、実装はインラインで行う。

---

## File Structure

### Backend domain and API

- `backend/src/main/java/jp/akiyume/shift/domain/SubmissionAvailability.java`
- `backend/src/main/java/jp/akiyume/shift/domain/ShiftCollectionPeriod.java`
- `backend/src/main/java/jp/akiyume/shift/domain/ShiftSubmission.java`
- `backend/src/main/java/jp/akiyume/shift/domain/ShiftSubmissionDay.java`
- `backend/src/main/java/jp/akiyume/shift/domain/Store.java` — 営業開始分、営業終了分、入力刻み分。
- `backend/src/main/java/jp/akiyume/shift/domain/ShiftTime.java` — `00:00`〜`24:00`と0〜1440分の相互変換。
- `backend/src/main/java/jp/akiyume/shift/repo/ShiftCollectionPeriodRepository.java`
- `backend/src/main/java/jp/akiyume/shift/repo/ShiftSubmissionRepository.java`
- `backend/src/main/java/jp/akiyume/shift/repo/ShiftSubmissionDayRepository.java`
- `backend/src/main/java/jp/akiyume/shift/repo/service/ShiftSubmissionService.java`
- `backend/src/main/java/jp/akiyume/shift/web/ShiftSubmissionController.java`
- `backend/src/main/java/jp/akiyume/shift/web/dto/ShiftCollectionPeriodDto.java`
- `backend/src/main/java/jp/akiyume/shift/web/dto/ShiftSubmissionDayBody.java`
- `backend/src/main/java/jp/akiyume/shift/web/dto/PutShiftSubmissionBody.java`
- `backend/src/main/java/jp/akiyume/shift/web/dto/ShiftSubmissionDto.java`
- `backend/src/test/java/jp/akiyume/shift/web/ShiftSubmissionControllerTest.java`
- `backend/src/test/java/jp/akiyume/shift/repo/service/ShiftSubmissionServiceTest.java`

### Frontend domain and API

- `frontend/src/types.ts` — 期間、提出、日別入力の型。
- `frontend/src/api/client.ts` — 期間取得、提出取得、一括PUT。
- `frontend/src/store/AppContext.tsx` — スタッフ提出の取得・更新。
- `frontend/src/components/staff/submissionModel.ts` — ドラフト生成、検証、確認表示用純粋関数。
- `frontend/src/components/staff/submissionModel.test.ts`
- `frontend/src/components/staff/SubmissionPeriodList.tsx`
- `frontend/src/components/staff/SubmissionDayList.tsx`
- `frontend/src/components/staff/SubmissionReview.tsx`
- `frontend/src/components/staff/SubmissionComplete.tsx`
- `frontend/src/components/staff/ShiftSubmissionFlow.tsx`
- `frontend/src/components/staff/ShiftSubmissionFlow.test.tsx`
- `frontend/src/components/StaffApp.tsx` — 新フローを接続。
- `frontend/src/components/RequestEditor.tsx` — 移行後に削除。
- `frontend/src/components/MonthCalendar.tsx` — 確定シフトで利用中なら保持。
- `frontend/src/styles.css` — 資料準拠スマホUI。

---

### Task 1: 提出期間・提出・日別入力のJPAモデル

**Files:**
- Create: `backend/src/main/java/jp/akiyume/shift/domain/SubmissionAvailability.java`
- Create: `backend/src/main/java/jp/akiyume/shift/domain/ShiftCollectionPeriod.java`
- Create: `backend/src/main/java/jp/akiyume/shift/domain/ShiftSubmission.java`
- Create: `backend/src/main/java/jp/akiyume/shift/domain/ShiftSubmissionDay.java`
- Create: `backend/src/main/java/jp/akiyume/shift/domain/ShiftTime.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/domain/Store.java`
- Create: `backend/src/main/java/jp/akiyume/shift/repo/ShiftCollectionPeriodRepository.java`
- Create: `backend/src/main/java/jp/akiyume/shift/repo/ShiftSubmissionRepository.java`
- Create: `backend/src/main/java/jp/akiyume/shift/repo/ShiftSubmissionDayRepository.java`
- Create: `backend/src/test/java/jp/akiyume/shift/repo/service/ShiftSubmissionServiceTest.java`

**Interfaces:**
- Produces: `SubmissionAvailability.WORK|OFF`
- Produces: 1店舗に複数の `ShiftCollectionPeriod`
- Produces: 同一スタッフ・同一期間に1件の `ShiftSubmission`
- Produces: 同一提出・同一日に1件の `ShiftSubmissionDay`
- Produces: `ShiftTime.parse("24:00") == 1440`

- [ ] **Step 1: 永続化制約テストを書く**

```java
@Test
void oneSubmissionPerStaffAndPeriod() {
    ShiftSubmission first = submissionRepository.save(
        new ShiftSubmission(staff, period, Instant.parse("2026-06-23T00:00:00Z"))
    );
    assertThat(first.getId()).isNotNull();
    assertThatThrownBy(() -> submissionRepository.saveAndFlush(
        new ShiftSubmission(staff, period, Instant.parse("2026-06-23T01:00:00Z"))
    )).isInstanceOf(DataIntegrityViolationException.class);
}
```

日別一意制約も同様に検証する。

- [ ] **Step 2: テストがクラス未定義で失敗することを確認する**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=ShiftSubmissionServiceTest test
```

Expected: コンパイルFAIL。

- [ ] **Step 3: エンティティを実装する**

`ShiftCollectionPeriod`:

```java
@Entity
@Table(name = "shift_collection_periods",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"store_id", "period_start", "period_end"}))
public class ShiftCollectionPeriod {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false) private Store store;
    @Column(name = "period_start", nullable = false) private LocalDate periodStart;
    @Column(name = "period_end", nullable = false) private LocalDate periodEnd;
    @Column(nullable = false) private Instant deadline;
    @Column(nullable = false) private boolean open;
}
```

`ShiftSubmissionDay`:

```java
@Entity
@Table(name = "shift_submission_days",
    uniqueConstraints = @UniqueConstraint(columnNames = {"submission_id", "date"}))
public class ShiftSubmissionDay {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false) private ShiftSubmission submission;
    @Column(nullable = false) private LocalDate date;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false) private SubmissionAvailability availability;
    private Integer startMinute;
    private Integer endMinute;
    @Column(length = 200) private String note;
}
```

`Store` に次を追加する。

```java
@Column(nullable = false)
private int openingMinute = 420;

@Column(nullable = false)
private int closingMinute = 1440;

@Column(nullable = false)
private int submissionMinuteStep = 30;
```

`ShiftTime`:

```java
public final class ShiftTime {
    public static int parse(String value) {
        if ("24:00".equals(value)) return 1440;
        LocalTime time = LocalTime.parse(value);
        return time.getHour() * 60 + time.getMinute();
    }

    public static String format(int minute) {
        if (minute == 1440) return "24:00";
        return "%02d:%02d".formatted(minute / 60, minute % 60);
    }
}
```

- [ ] **Step 4: 永続化テストを通す**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=ShiftSubmissionServiceTest test
```

Expected: PASS。

- [ ] **Step 5: コミットする**

```cmd
git add -- backend/src/main/java/jp/akiyume/shift/domain backend/src/main/java/jp/akiyume/shift/repo backend/src/test/java/jp/akiyume/shift/repo/service/ShiftSubmissionServiceTest.java
git commit -m "feat(backend): add shift submission domain"
```

---

### Task 2: 期間取得と一括提出サービス

**Files:**
- Create: `backend/src/main/java/jp/akiyume/shift/repo/service/ShiftSubmissionService.java`
- Create: `backend/src/main/java/jp/akiyume/shift/web/dto/ShiftCollectionPeriodDto.java`
- Create: `backend/src/main/java/jp/akiyume/shift/web/dto/ShiftSubmissionDayBody.java`
- Create: `backend/src/main/java/jp/akiyume/shift/web/dto/PutShiftSubmissionBody.java`
- Create: `backend/src/main/java/jp/akiyume/shift/web/dto/ShiftSubmissionDto.java`
- Modify: `backend/src/test/java/jp/akiyume/shift/repo/service/ShiftSubmissionServiceTest.java`

**Interfaces:**
- Produces: `listOpenPeriods(String username, Instant now)`
- Produces: `getSubmission(String username, Long periodId)`
- Produces: `submit(String username, PutShiftSubmissionBody body, Instant now)`

- [ ] **Step 1: 正常提出とロールバックのサービステストを書く**

```java
@Test
void submitReplacesAllDaysAtomically() {
    PutShiftSubmissionBody body = new PutShiftSubmissionBody(period.getId(), List.of(
        new ShiftSubmissionDayBody("2026-07-01", "WORK", "09:00", "17:00", ""),
        new ShiftSubmissionDayBody("2026-07-02", "OFF", null, null, "通院")
    ));

    ShiftSubmissionDto result = service.submit(
        staff.getUsername(), body, Instant.parse("2026-06-23T02:00:00Z"));

    assertThat(result.days()).hasSize(2);
    assertThat(result.submittedAt()).isNotNull();
}

@Test
void invalidSecondDayRollsBackFirstDay() {
    PutShiftSubmissionBody body = new PutShiftSubmissionBody(period.getId(), List.of(
        new ShiftSubmissionDayBody("2026-07-01", "WORK", "09:00", "17:00", ""),
        new ShiftSubmissionDayBody("2026-07-02", "WORK", "18:00", "09:00", "")
    ));

    assertThatThrownBy(() -> service.submit(staff.getUsername(), body, Instant.now()))
        .isInstanceOf(IllegalArgumentException.class);
    assertThat(submissionRepository.count()).isZero();
}
```

- [ ] **Step 2: サービステストの失敗を確認する**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=ShiftSubmissionServiceTest test
```

Expected: サービス未定義でFAIL。

- [ ] **Step 3: 期間・日付・時刻・メモを検証する**

検証順:

```text
1. ログインユーザーを取得
2. periodIdが同一店舗に属するか確認
3. period.openかつdeadline前か確認
4. daysの日付重複を検査
5. 期間内の全日が1回ずつ含まれるか確認
6. WORKはstartTime/endTime必須
7. `ShiftTime.parse` で0〜1440分へ変換
8. startMinute < endMinute
9. 店舗のopeningMinute〜closingMinute内
10. 店舗のsubmissionMinuteStepで割り切れる
11. OFFは時刻をnullへ正規化
12. noteはtrimして200文字以内
13. 全検証後に既存daysを置換
```

サービスには `@Transactional` を付け、検証完了前にdelete/saveしない。

- [ ] **Step 4: サービステストを通す**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=ShiftSubmissionServiceTest test
```

Expected: PASS。

- [ ] **Step 5: コミットする**

```cmd
git add -- backend/src/main/java/jp/akiyume/shift/repo/service/ShiftSubmissionService.java backend/src/main/java/jp/akiyume/shift/web/dto backend/src/test/java/jp/akiyume/shift/repo/service/ShiftSubmissionServiceTest.java
git commit -m "feat(backend): add transactional shift submission service"
```

---

### Task 3: スタッフ提出API

**Files:**
- Create: `backend/src/main/java/jp/akiyume/shift/web/ShiftSubmissionController.java`
- Create: `backend/src/test/java/jp/akiyume/shift/web/ShiftSubmissionControllerTest.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/security/SecurityConfig.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/seed/DataSeeder.java`

**Interfaces:**
- Produces: `GET /api/staff/shift-submission-periods`
- Produces: `GET /api/staff/shift-submissions?periodId={id}`
- Produces: `PUT /api/staff/shift-submissions`

- [ ] **Step 1: APIテストを書く**

```java
@Test
@WithMockUser(username = "nakashima-1", roles = {"STAFF"})
void staffCanSubmitAndReadBack() throws Exception {
    mvc.perform(put("/api/staff/shift-submissions")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "periodId": 1,
                  "days": [
                    {"date":"2026-07-01","availability":"WORK","startTime":"09:00","endTime":"17:00","note":""},
                    {"date":"2026-07-02","availability":"OFF","startTime":null,"endTime":null,"note":"通院"}
                  ]
                }
                """))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.days[0].availability").value("WORK"));
}
```

管理者でスタッフ提出PUTを呼ぶテストは403を期待する。

- [ ] **Step 2: API未定義の失敗を確認する**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=ShiftSubmissionControllerTest test
```

Expected: 404または403でFAIL。

- [ ] **Step 3: Controllerと権限を実装する**

```java
@RestController
@RequestMapping("/api/staff")
public class ShiftSubmissionController {
    @GetMapping("/shift-submission-periods")
    List<ShiftCollectionPeriodDto> periods(Authentication auth) {
        return service.listOpenPeriods(auth.getName(), Instant.now());
    }

    @GetMapping("/shift-submissions")
    ShiftSubmissionDto submission(
        @RequestParam Long periodId,
        Authentication auth
    ) {
        return service.getSubmission(auth.getName(), periodId);
    }

    @PutMapping("/shift-submissions")
    ShiftSubmissionDto submit(
        @RequestBody PutShiftSubmissionBody body,
        Authentication auth
    ) {
        return service.submit(auth.getName(), body, Instant.now());
    }
}
```

Security:

```java
.requestMatchers("/api/staff/shift-submission-periods").hasRole("STAFF")
.requestMatchers("/api/staff/shift-submissions").hasRole("STAFF")
```

seedには2026年7月の提出期間を1件追加する。

- [ ] **Step 4: APIテストと全バックエンドテストを通す**

Run:

```cmd
cd backend
mvnw.cmd test
```

Expected: PASS。

- [ ] **Step 5: コミットする**

```cmd
git add -- backend/src/main/java/jp/akiyume/shift/web/ShiftSubmissionController.java backend/src/main/java/jp/akiyume/shift/security/SecurityConfig.java backend/src/main/java/jp/akiyume/shift/seed/DataSeeder.java backend/src/test/java/jp/akiyume/shift/web/ShiftSubmissionControllerTest.java
git commit -m "feat(backend): expose staff shift submission API"
```

---

### Task 4: フロントエンド提出型・API・状態

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/api/client.test.ts`
- Modify: `frontend/src/store/AppContext.tsx`
- Modify: `frontend/src/test/mockShiftApi.ts`

**Interfaces:**
- Produces: `ShiftCollectionPeriod`
- Produces: `ShiftSubmission`
- Produces: `ShiftSubmissionDay`
- Produces: `api.shiftSubmissionPeriods()`
- Produces: `api.shiftSubmission(periodId)`
- Produces: `api.putShiftSubmission(body)`
- Produces: Contextの `submissionPeriods`, `loadSubmission`, `submitShift`

- [ ] **Step 1: APIテストを書く**

```ts
it('submits all shift days in one PUT', async () => {
  fetchMock.mockResolvedValue(response({
    periodId: 1,
    submittedAt: '2026-06-23T02:00:00Z',
    days: [],
  }));

  await api.putShiftSubmission({
    periodId: 1,
    days: [{
      date: '2026-07-01',
      availability: 'WORK',
      startTime: '09:00',
      endTime: '17:00',
      note: '',
    }],
  });

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/staff/shift-submissions',
    expect.objectContaining({ method: 'PUT' }),
  );
});
```

- [ ] **Step 2: テストの失敗を確認する**

Run:

```cmd
cd frontend
npx vitest run src/api/client.test.ts
```

Expected: API関数未定義でFAIL。

- [ ] **Step 3: 型とAPIを追加する**

```ts
export interface ShiftCollectionPeriod {
  id: number;
  periodStart: string;
  periodEnd: string;
  deadline: string;
  open: boolean;
  submitted: boolean;
}

export interface ShiftSubmissionDay {
  date: string;
  availability: 'WORK' | 'OFF';
  startTime: string | null;
  endTime: string | null;
  note: string;
}
```

AppContextはスタッフログイン時だけ期間を取得する。管理者ログイン時は空配列を維持する。

- [ ] **Step 4: APIとContextテストを通す**

Run:

```cmd
cd frontend
npx vitest run src/api/client.test.ts src/components/manager/ManagerShiftScreen.test.tsx
npx tsc --noEmit
```

Expected: PASS。

- [ ] **Step 5: コミットする**

```cmd
git add -- frontend/src/types.ts frontend/src/api/client.ts frontend/src/api/client.test.ts frontend/src/store/AppContext.tsx frontend/src/test/mockShiftApi.ts
git commit -m "feat(frontend): add shift submission client state"
```

---

### Task 5: 提出ドラフトと検証純粋関数

**Files:**
- Create: `frontend/src/components/staff/submissionModel.ts`
- Create: `frontend/src/components/staff/submissionModel.test.ts`

**Interfaces:**
- Produces: `SubmissionDraftDay`
- Produces: `createSubmissionDraft(period, existing, patterns): SubmissionDraftDay[]`
- Produces: `validateSubmissionDraft(days, period, businessHours): SubmissionErrors`
- Produces: `toSubmissionBody(periodId, days): PutShiftSubmissionBody`

- [ ] **Step 1: 純粋関数テストを書く**

```ts
it('disables times for OFF and validates reversed WORK time', () => {
  const errors = validateSubmissionDraft([
    { date: '2026-07-01', availability: 'OFF', startTime: null, endTime: null, note: '' },
    { date: '2026-07-02', availability: 'WORK', startTime: '18:00', endTime: '09:00', note: '' },
  ], period, { open: '07:00', close: '24:00' });

  expect(errors['2026-07-01']).toBeUndefined();
  expect(errors['2026-07-02']).toContain('終了時刻');
});
```

全日生成、既存提出の復元、200文字、期間外、営業時間外も個別テストする。

- [ ] **Step 2: 未実装FAILを確認する**

Run:

```cmd
cd frontend
npx vitest run src/components/staff/submissionModel.test.ts
```

Expected: モジュール未定義でFAIL。

- [ ] **Step 3: 純粋関数を実装する**

`SubmissionErrors`:

```ts
export type SubmissionErrors = Record<string, string[]>;
```

ドラフトは期間の全日を必ず含める。既存提出がない日は `WORK`、早番開始・終了を初期値とする。

- [ ] **Step 4: 純粋関数テストを通す**

Run:

```cmd
cd frontend
npx vitest run src/components/staff/submissionModel.test.ts
```

Expected: PASS。

- [ ] **Step 5: コミットする**

```cmd
git add -- frontend/src/components/staff/submissionModel.ts frontend/src/components/staff/submissionModel.test.ts
git commit -m "feat(frontend): add submission draft validation"
```

---

### Task 6: スマホ提出画面群

**Files:**
- Create: `frontend/src/components/staff/SubmissionPeriodList.tsx`
- Create: `frontend/src/components/staff/SubmissionDayList.tsx`
- Create: `frontend/src/components/staff/SubmissionReview.tsx`
- Create: `frontend/src/components/staff/SubmissionComplete.tsx`
- Create: `frontend/src/components/staff/ShiftSubmissionFlow.tsx`
- Create: `frontend/src/components/staff/ShiftSubmissionFlow.test.tsx`
- Modify: `frontend/src/components/StaffApp.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: Task 4のContext API、Task 5の純粋関数。
- Produces: 入口→期間→入力→確認→完了→再編集の画面遷移。

- [ ] **Step 1: 統合テストを書く**

```tsx
it('selects a period, edits days, reviews, and submits once', async () => {
  renderStaffFlow();
  await user.click(await screen.findByRole('button', { name: /7月1日.*7月15日/ }));
  await user.click(screen.getByRole('radio', { name: '7月2日 休み' }));
  await user.click(screen.getByRole('button', { name: '入力内容を確認' }));
  expect(screen.getByText('7月2日')).toBeInTheDocument();
  expect(screen.getByText('休み')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'シフト提出' }));
  expect(await screen.findByRole('heading', { name: '提出完了' })).toBeInTheDocument();
});
```

失敗時に入力を保持するテスト、二重クリック無効化、再編集も追加する。

- [ ] **Step 2: コンポーネント未定義FAILを確認する**

Run:

```cmd
cd frontend
npx vitest run src/components/staff/ShiftSubmissionFlow.test.tsx
```

Expected: FAIL。

- [ ] **Step 3: 資料順で画面を実装する**

状態:

```ts
type SubmissionStep = 'periods' | 'edit' | 'review' | 'complete';
```

日別行:

```tsx
<section className="staff-submit-day" aria-labelledby={`day-${day.date}`}>
  <header>
    <h3 id={`day-${day.date}`}>{formatJapaneseDate(day.date)}</h3>
  </header>
  <fieldset>
    <label><input type="radio" name={`availability-${day.date}`} />勤務可能</label>
    <label><input type="radio" name={`availability-${day.date}`} />休み</label>
  </fieldset>
  <div className="staff-submit-day__times">
    <label>
      開始
      <select aria-label={`${day.date} 開始時刻`}>
        {timeOptions.map((time) => <option key={time}>{time}</option>)}
      </select>
    </label>
    <label>
      終了
      <select aria-label={`${day.date} 終了時刻`}>
        {timeOptions.map((time) => <option key={time}>{time}</option>)}
      </select>
    </label>
  </div>
  <label>勤務メモ <textarea maxLength={200} /></label>
</section>
```

CSSは白背景、青い上部見出し、薄い罫線、角丸0〜2px。スマホ本体モック、吹き出し、絵文字を削除する。
`timeOptions` は店舗営業時間と刻み幅から作り、終了選択肢の末尾に `24:00` を含める。

- [ ] **Step 4: 320pxを含むテストと型チェックを通す**

Run:

```cmd
cd frontend
npx vitest run src/components/staff
npx tsc --noEmit
```

Expected: PASS。

- [ ] **Step 5: コミットする**

```cmd
git add -- frontend/src/components/staff frontend/src/components/StaffApp.tsx frontend/src/styles.css
git commit -m "feat(frontend): add mobile shift submission flow"
```

---

### Task 7: 旧希望APIを新提出データへ置換

**Files:**
- Modify: `backend/src/main/java/jp/akiyume/shift/web/RequestController.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/dto/RequestDto.java`
- Delete: `backend/src/main/java/jp/akiyume/shift/domain/ShiftRequest.java`
- Delete: `backend/src/main/java/jp/akiyume/shift/repo/ShiftRequestRepository.java`
- Delete: `backend/src/main/java/jp/akiyume/shift/repo/service/RequestService.java`
- Delete: `backend/src/main/java/jp/akiyume/shift/web/dto/SetRequestBody.java`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/store/AppContext.tsx`
- Delete: `frontend/src/components/RequestEditor.tsx`
- Delete: `frontend/src/store/requests.ts`
- Delete: `frontend/src/store/requests.test.ts`
- Modify: manager shift components and tests

**Interfaces:**
- Produces: 店長向け希望表示モデルは `date, staffId, availability, startTime, endTime, note, suggestedSlot`。
- Produces: `suggestedSlot` は保存済みシフトパターンと完全一致時のみ `early|late`。

- [ ] **Step 1: 店長希望DTOのテストを書く**

```java
@Test
@WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
void managerReadsSubmittedWorkTimes() throws Exception {
    mvc.perform(get("/api/stores/1/shift-preferences?month=2026-07"))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$[0].startTime").value("09:00"))
       .andExpect(jsonPath("$[0].availability").value("WORK"));
}
```

- [ ] **Step 2: 新API未定義FAILを確認する**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=ShiftSubmissionControllerTest test
```

Expected: 404でFAIL。

- [ ] **Step 3: 管理者用希望投影を実装し旧日次PUTを削除する**

新DTO:

```java
public record ShiftPreferenceDto(
    Long staffId,
    String date,
    String availability,
    String startTime,
    String endTime,
    String note,
    String suggestedSlot
) {}
```

`suggestedSlot` は早番・遅番パターンと開始終了が完全一致する場合だけ返す。

- [ ] **Step 4: フロントの店長表示を時間希望へ更新する**

`ShiftCellModel.request`:

```ts
request: {
  availability: 'WORK' | 'OFF';
  label: string;
  time: string | null;
  suggestedSlot: WorkSlot | null;
} | null;
```

希望札は `09:00-17:00` または `休み` を表示する。一括割り当ては `suggestedSlot` がある希望だけを対象にする。

- [ ] **Step 5: 旧コード不在と全検証を確認する**

Run:

```cmd
rg -n "ShiftRequest|setDayRequest|/api/requests|RequestEditor" backend/src frontend/src
cd backend
mvnw.cmd test
cd ..\frontend
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected: 意図的な移行説明以外0件、全検証PASS。

- [ ] **Step 6: コミットする**

```cmd
git add -- backend/src frontend/src
git commit -m "refactor: replace daily requests with submissions"
```

---

### Task 8: 実機幅と提出失敗の最終確認

**Files:**
- Modify only observed differences in `frontend/src/styles.css` or staff components.

- [ ] **Step 1: ローカル起動する**

```cmd
cd backend
mvnw.cmd spring-boot:run
```

```cmd
cd frontend
npm run dev
```

- [ ] **Step 2: 320px、375px、430pxで確認する**

確認項目:

```text
[ ] 横スクロールなし
[ ] 日付が切れない
[ ] radioとtime入力のタップ領域が44px以上
[ ] 入力→確認→完了が片手で操作可能
[ ] 休みの日に時刻が無効
[ ] エラーが日付行と画面上部に表示
[ ] 絵文字、QR、端末モックなし
```

- [ ] **Step 3: API失敗時の入力保持を確認する**

テスト用にPUTを500へして提出し、入力値と確認内容が維持されることを確認する。

- [ ] **Step 4: 全検証する**

```cmd
cd frontend
npx tsc --noEmit
npm test -- --run
npm run build
cd ..\backend
mvnw.cmd test
```

Expected: 全成功。

- [ ] **Step 5: 観測差分があれば最小修正してコミットする**

```cmd
git add -- frontend/src
git commit -m "fix(frontend): refine mobile submission layout"
```
