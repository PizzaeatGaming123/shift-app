# 店長設定4画面 資料準拠 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** シフト設定、シフトパターン、モデルシフト、ランク設定を追加資料と同じ情報構造・密度・操作順で実装する。

**Architecture:** 巨大な `SectionBody.tsx` から4画面を独立コンポーネントへ分離し、各画面を専用の型・API・テストで管理する。スマホ提出へ影響する回収期間とパターンはバックエンド保存、モデルシフトとランクは既存データとの互換性を保ちながら資料UIへ置換する。

**Tech Stack:** React 18, TypeScript, Spring Boot 3.5, Spring Data JPA, H2, Vitest, Testing Library, MockMvc.

## Global Constraints

- 先に中番削除とスマホ一括提出計画を完了する。
- UIは今回の4枚の資料画像を最優先にする。
- 角丸は0〜2px、影は浮遊パネルだけに使用する。
- 中番を追加しない。
- QRコードを表示しない。
- Tailwind CSSやUIライブラリを追加しない。
- サブエージェントを使用せず、実装はインラインで行う。

---

## File Structure

- `frontend/src/components/manager/settings/ShiftSettingsSection.tsx`
- `frontend/src/components/manager/settings/ShiftSettingsSection.test.tsx`
- `frontend/src/components/manager/settings/ShiftPatternsSection.tsx`
- `frontend/src/components/manager/settings/ShiftPatternsSection.test.tsx`
- `frontend/src/components/manager/settings/ModelShiftSection.tsx`
- `frontend/src/components/manager/settings/ModelShiftSection.test.tsx`
- `frontend/src/components/manager/settings/RankSettingsSection.tsx`
- `frontend/src/components/manager/settings/RankSettingsSection.test.tsx`
- `frontend/src/components/manager/SectionBody.tsx` — ルーティングと他セクションだけを保持。
- `frontend/src/styles.css` — `rk-settings-*` スタイル。
- `backend/src/main/java/jp/akiyume/shift/domain/ShiftPattern.java` — 店舗別早番・遅番。
- `backend/src/main/java/jp/akiyume/shift/domain/RankDefinition.java` — 店舗別5段階ランク名。
- `backend/src/main/java/jp/akiyume/shift/web/StoreShiftSettingsController.java` — 回収期間・パターン・ランクAPI。

---

### Task 1: 店舗シフトパターンAPI

**Files:**
- Create: `backend/src/main/java/jp/akiyume/shift/domain/ShiftPatternCode.java`
- Create: `backend/src/main/java/jp/akiyume/shift/domain/ShiftPattern.java`
- Create: `backend/src/main/java/jp/akiyume/shift/repo/ShiftPatternRepository.java`
- Create: `backend/src/main/java/jp/akiyume/shift/repo/service/ShiftPatternService.java`
- Create: `backend/src/main/java/jp/akiyume/shift/web/StoreShiftSettingsController.java`
- Create: `backend/src/main/java/jp/akiyume/shift/web/dto/ShiftPatternDto.java`
- Create: `backend/src/test/java/jp/akiyume/shift/web/StoreShiftSettingsControllerTest.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/seed/DataSeeder.java`

**Interfaces:**
- Produces: `GET /api/stores/{storeId}/shift-patterns`
- Produces: `PUT /api/stores/{storeId}/shift-patterns`
- Produces: コードは `EARLY|LATE` の2件固定。
- Produces: Entityは `startMinute/endMinute`、DTOは `startTime/endTime` 文字列。

- [ ] **Step 1: 管理者更新とスタッフ拒否のテストを書く**

```java
@Test
@WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
void managerUpdatesEarlyAndLatePatterns() throws Exception {
    mvc.perform(put("/api/stores/1/shift-patterns")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
              [
                {"code":"EARLY","label":"早番","startTime":"08:00","endTime":"16:00","color":"#d97777"},
                {"code":"LATE","label":"遅番","startTime":"16:00","endTime":"24:00","color":"#4d8ebf"}
              ]
            """))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$[0].code").value("EARLY"))
       .andExpect(jsonPath("$[1].code").value("LATE"));
}
```

- [ ] **Step 2: 404を確認する**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=StoreShiftSettingsControllerTest test
```

Expected: FAIL。

- [ ] **Step 3: パターンモデルと検証を実装する**

検証:

```text
- 必ずEARLYとLATEを1件ずつ含む
- 重複コード不可
- labelは1〜20文字
- `ShiftTime.parse(startTime) < ShiftTime.parse(endTime)`
- `24:00` は終了時刻だけに許可
- 色は#[0-9a-fA-F]{6}
- MIDはenumに存在しない
```

- [ ] **Step 4: APIテストを通す**

Run:

```cmd
cd backend
mvnw.cmd -Dtest=StoreShiftSettingsControllerTest test
```

Expected: PASS。

- [ ] **Step 5: コミットする**

```cmd
git add -- backend/src
git commit -m "feat(backend): add store shift patterns"
```

---

### Task 2: 回収期間管理API

**Files:**
- Modify: `backend/src/main/java/jp/akiyume/shift/repo/service/ShiftSubmissionService.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/StoreShiftSettingsController.java`
- Create: `backend/src/main/java/jp/akiyume/shift/web/dto/PutCollectionPeriodBody.java`
- Modify: `backend/src/test/java/jp/akiyume/shift/web/StoreShiftSettingsControllerTest.java`

**Interfaces:**
- Produces: `GET /api/stores/{storeId}/collection-periods`
- Produces: `POST /api/stores/{storeId}/collection-periods`
- Produces: `PUT /api/stores/{storeId}/collection-periods/{periodId}`

- [ ] **Step 1: 期間重複と期限のテストを書く**

```java
@Test
@WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
void rejectsOverlappingCollectionPeriod() throws Exception {
    mvc.perform(post("/api/stores/1/collection-periods")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
              {
                "periodStart":"2026-07-10",
                "periodEnd":"2026-07-20",
                "deadline":"2026-06-30T23:59:00Z",
                "open":true
              }
            """))
       .andExpect(status().isBadRequest())
       .andExpect(jsonPath("$.message").value("提出期間が重複しています"));
}
```

- [ ] **Step 2: テスト失敗を確認する**

```cmd
cd backend
mvnw.cmd -Dtest=StoreShiftSettingsControllerTest test
```

- [ ] **Step 3: CRUDと検証を実装する**

期間開始≤期間終了、同店舗内の重複不可、期限必須、他店舗編集不可を保証する。

- [ ] **Step 4: APIテストを通す**

```cmd
cd backend
mvnw.cmd -Dtest=StoreShiftSettingsControllerTest test
```

- [ ] **Step 5: コミットする**

```cmd
git add -- backend/src
git commit -m "feat(backend): manage shift collection periods"
```

---

### Task 3: ランク定義API

**Files:**
- Create: `backend/src/main/java/jp/akiyume/shift/domain/RankDefinition.java`
- Create: `backend/src/main/java/jp/akiyume/shift/repo/RankDefinitionRepository.java`
- Create: `backend/src/main/java/jp/akiyume/shift/web/dto/RankDefinitionDto.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/web/StoreShiftSettingsController.java`
- Modify: `backend/src/main/java/jp/akiyume/shift/seed/DataSeeder.java`
- Modify: `backend/src/test/java/jp/akiyume/shift/web/StoreShiftSettingsControllerTest.java`

**Interfaces:**
- Produces: `GET /api/stores/{storeId}/rank-definitions`
- Produces: `PUT /api/stores/{storeId}/rank-definitions`
- Produces: rankValue 1〜5、名称、並び順、holderCount。

- [ ] **Step 1: 5段階固定と保有者数のテストを書く**

```java
@Test
@WithMockUser(username = "nakashima-mgr", roles = {"MANAGER"})
void returnsFiveRanksWithHolderCounts() throws Exception {
    mvc.perform(get("/api/stores/1/rank-definitions"))
       .andExpect(status().isOk())
       .andExpect(jsonPath("$.length()").value(5))
       .andExpect(jsonPath("$[4].rankValue").value(5))
       .andExpect(jsonPath("$[4].holderCount").isNumber());
}
```

- [ ] **Step 2: API未定義FAILを確認する**

```cmd
cd backend
mvnw.cmd -Dtest=StoreShiftSettingsControllerTest test
```

- [ ] **Step 3: エンティティとDTO投影を実装する**

ランク値は1〜5固定。名称だけ編集可能。holderCountはStaffを集計して返す。

- [ ] **Step 4: APIテストを通す**

```cmd
cd backend
mvnw.cmd -Dtest=StoreShiftSettingsControllerTest test
```

- [ ] **Step 5: コミットする**

```cmd
git add -- backend/src
git commit -m "feat(backend): add configurable rank definitions"
```

---

### Task 4: フロントエンド設定APIクライアント

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/api/client.test.ts`
- Modify: `frontend/src/test/mockShiftApi.ts`

**Interfaces:**
- Produces: `api.collectionPeriods(storeId)`
- Produces: `api.createCollectionPeriod(storeId, body)`
- Produces: `api.updateCollectionPeriod(storeId, periodId, body)`
- Produces: `api.shiftPatterns(storeId)`
- Produces: `api.updateShiftPatterns(storeId, patterns)`
- Produces: `api.rankDefinitions(storeId)`
- Produces: `api.updateRankDefinitions(storeId, ranks)`

- [ ] **Step 1: 各HTTPメソッドのテストを書く**

```ts
it('updates shift patterns for a store', async () => {
  await api.updateShiftPatterns(1, patterns);
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/stores/1/shift-patterns',
    expect.objectContaining({ method: 'PUT' }),
  );
});
```

- [ ] **Step 2: 未定義FAILを確認する**

```cmd
cd frontend
npx vitest run src/api/client.test.ts
```

- [ ] **Step 3: 型とAPI関数を実装する**

APIの非2xxは既存 `json` 関数で例外にする。保存成功後はサーバー応答を画面状態へ採用する。

- [ ] **Step 4: APIテストと型チェックを通す**

```cmd
cd frontend
npx vitest run src/api/client.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: コミットする**

```cmd
git add -- frontend/src/types.ts frontend/src/api/client.ts frontend/src/api/client.test.ts frontend/src/test/mockShiftApi.ts
git commit -m "feat(frontend): add manager settings API client"
```

---

### Task 5: 資料準拠シフト設定画面

**Files:**
- Create: `frontend/src/components/manager/settings/ShiftSettingsSection.tsx`
- Create: `frontend/src/components/manager/settings/ShiftSettingsSection.test.tsx`
- Modify: `frontend/src/components/manager/SectionBody.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: Task 4の回収期間API。
- Produces: 回収プレビュー、周期、開始終了、期限、初回指定、期間追加。

- [ ] **Step 1: 情報順序と保存のテストを書く**

```tsx
expect(screen.getAllByRole('heading').map((item) => item.textContent)).toEqual([
  'シフト回収プレビュー',
  'シフト周期',
  'シフト提出期限',
  '初回指定',
]);
await user.click(screen.getByRole('button', { name: '回収期間を追加' }));
expect(api.createCollectionPeriod).toHaveBeenCalled();
```

- [ ] **Step 2: 未実装FAILを確認する**

```cmd
cd frontend
npx vitest run src/components/manager/settings/ShiftSettingsSection.test.tsx
```

- [ ] **Step 3: 資料の白い浮遊設定パネルを実装する**

構造:

```tsx
<section className="rk-settings-panel rk-settings-panel--collection">
  <header>シフト回収プレビュー</header>
  <div className="rk-collection-preview">
    {periods.map((period) => (
      <article key={period.id}>
        <time>{period.periodStart}</time>
        <span>〜</span>
        <time>{period.periodEnd}</time>
        <small>提出期限 {formatDeadline(period.deadline)}</small>
      </article>
    ))}
  </div>
  <fieldset>
    <legend>シフト周期</legend>
    <select aria-label="シフト周期" value={cycle} onChange={changeCycle}>
      <option value="half-month">半月</option>
      <option value="month">1ヶ月</option>
    </select>
  </fieldset>
  <fieldset>
    <legend>シフト提出期限</legend>
    <input aria-label="提出期限" type="datetime-local" value={deadline} onChange={changeDeadline} />
  </fieldset>
  <fieldset>
    <legend>初回指定</legend>
    <input aria-label="初回提出期限" type="datetime-local" value={firstDeadline} onChange={changeFirstDeadline} />
  </fieldset>
</section>
```

QRコード要素は作らない。

- [ ] **Step 4: テストと型チェックを通す**

```cmd
cd frontend
npx vitest run src/components/manager/settings/ShiftSettingsSection.test.tsx
npx tsc --noEmit
```

- [ ] **Step 5: コミットする**

```cmd
git add -- frontend/src/components/manager/settings/ShiftSettingsSection.tsx frontend/src/components/manager/settings/ShiftSettingsSection.test.tsx frontend/src/components/manager/SectionBody.tsx frontend/src/styles.css
git commit -m "feat(frontend): rebuild shift settings screen"
```

---

### Task 6: 資料準拠シフトパターン画面

**Files:**
- Create: `frontend/src/components/manager/settings/ShiftPatternsSection.tsx`
- Create: `frontend/src/components/manager/settings/ShiftPatternsSection.test.tsx`
- Modify: `frontend/src/components/manager/SectionBody.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: Task 4のパターンAPI。
- Produces: 自店舗、ヘルプ、休み、早番、遅番の未確定・確定プレビュー。

- [ ] **Step 1: 中番不在と保存のテストを書く**

```tsx
expect(screen.getByText('早番')).toBeInTheDocument();
expect(screen.getByText('遅番')).toBeInTheDocument();
expect(screen.queryByText('中番')).not.toBeInTheDocument();
await user.clear(screen.getByLabelText('早番 開始時刻'));
await user.type(screen.getByLabelText('早番 開始時刻'), '08:00');
await user.click(screen.getByRole('button', { name: '保存' }));
expect(api.updateShiftPatterns).toHaveBeenCalled();
```

- [ ] **Step 2: FAILを確認する**

```cmd
cd frontend
npx vitest run src/components/manager/settings/ShiftPatternsSection.test.tsx
```

- [ ] **Step 3: 点線希望・実線確定の表を実装する**

```tsx
<table className="rk-pattern-table">
  <thead>
    <tr><th>シフトの種類</th><th>未確定シフト</th><th>確定シフト</th></tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">自店舗</th>
      <td><span className="rk-pattern-preview rk-pattern-preview--request">10:00-12:00</span></td>
      <td><span className="rk-pattern-preview rk-pattern-preview--assigned">10:00-12:00</span></td>
    </tr>
    <tr>
      <th scope="row">ヘルプ</th>
      <td><span className="rk-pattern-preview rk-pattern-preview--request">10:00-12:00 [恵比寿]</span></td>
      <td><span className="rk-pattern-preview rk-pattern-preview--assigned">10:00-12:00 [恵比寿]</span></td>
    </tr>
    <tr>
      <th scope="row">休み</th>
      <td><span className="rk-pattern-preview rk-pattern-preview--request">休み</span></td>
      <td><span className="rk-pattern-preview rk-pattern-preview--assigned">休み</span></td>
    </tr>
    {patterns.map((pattern) => (
      <tr key={pattern.code}>
        <th scope="row">{pattern.label}</th>
        <td><span className="rk-pattern-preview rk-pattern-preview--request">{pattern.label}</span></td>
        <td><span className="rk-pattern-preview rk-pattern-preview--assigned">{pattern.label}</span></td>
      </tr>
    ))}
  </tbody>
</table>
```

角丸は1px。希望はdashed、確定はsolid。

- [ ] **Step 4: テストを通す**

```cmd
cd frontend
npx vitest run src/components/manager/settings/ShiftPatternsSection.test.tsx
npx tsc --noEmit
```

- [ ] **Step 5: コミットする**

```cmd
git add -- frontend/src/components/manager/settings frontend/src/components/manager/SectionBody.tsx frontend/src/styles.css
git commit -m "feat(frontend): rebuild shift patterns screen"
```

---

### Task 7: 資料準拠モデルシフト画面

**Files:**
- Create: `frontend/src/components/manager/settings/ModelShiftSection.tsx`
- Create: `frontend/src/components/manager/settings/ModelShiftSection.test.tsx`
- Modify: `frontend/src/components/manager/modelShift.ts`
- Modify: `frontend/src/components/manager/SectionBody.tsx`
- Modify: `frontend/src/components/manager/ShiftTableSummaryRows.tsx`
- Modify: `frontend/src/components/manager/ManagerShiftScreen.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Produces: `ModelBand = {id, startTime, endTime, requiredByWeekday[7]}`
- Produces: 時間帯追加・削除、曜日別人数、日付別上書き。
- Consumes: シフト表のcoverage計算。

- [ ] **Step 1: 時間帯追加とシフト表反映のテストを書く**

```tsx
await user.click(screen.getByRole('button', { name: '時間帯を追加' }));
await user.type(screen.getByLabelText('追加時間帯 開始'), '12:00');
await user.type(screen.getByLabelText('追加時間帯 終了'), '15:00');
await user.type(screen.getByLabelText('12:00 - 15:00 月曜の必要人数'), '4');
expect(loadModelBands(storeId, position)).toContainEqual(
  expect.objectContaining({ startTime: '12:00', endTime: '15:00' }),
);
```

- [ ] **Step 2: 現在の固定3帯ではFAILすることを確認する**

```cmd
cd frontend
npx vitest run src/components/manager/settings/ModelShiftSection.test.tsx src/components/manager/ManagerShiftScreen.test.tsx
```

- [ ] **Step 3: 配列型モデルへ移行する**

```ts
export interface ModelBand {
  id: string;
  startTime: string;
  endTime: string;
  requiredByWeekday: [number, number, number, number, number, number, number];
  overrides: Record<string, number>;
}
```

必要人数取得:

```ts
export function requiredForDate(band: ModelBand, date: string): number {
  return band.overrides[date]
    ?? band.requiredByWeekday[new Date(`${date}T00:00:00`).getDay()];
}
```

- [ ] **Step 4: モデル画面とシフト表テストを通す**

```cmd
cd frontend
npx vitest run src/components/manager/settings/ModelShiftSection.test.tsx src/components/manager/ManagerShiftScreen.test.tsx src/components/manager/ShiftTableSummaryRows.test.tsx
npx tsc --noEmit
```

- [ ] **Step 5: コミットする**

```cmd
git add -- frontend/src/components/manager frontend/src/styles.css
git commit -m "feat(frontend): rebuild model shift editor"
```

---

### Task 8: 資料準拠ランク設定画面

**Files:**
- Create: `frontend/src/components/manager/settings/RankSettingsSection.tsx`
- Create: `frontend/src/components/manager/settings/RankSettingsSection.test.tsx`
- Modify: `frontend/src/components/manager/SectionBody.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: Task 4のランクAPIと既存 `updateStaff`。
- Produces: 5段階の名称編集、保有者数、スタッフ割り当て。

- [ ] **Step 1: 5行、保有者数、名称保存のテストを書く**

```tsx
expect(screen.getAllByRole('row')).toHaveLength(6);
expect(screen.getByText('2名')).toBeInTheDocument();
await user.clear(screen.getByLabelText('ランク5 名称'));
await user.type(screen.getByLabelText('ランク5 名称'), 'リーダー');
await user.click(screen.getByRole('button', { name: 'ランク名称を保存' }));
expect(api.updateRankDefinitions).toHaveBeenCalled();
```

- [ ] **Step 2: FAILを確認する**

```cmd
cd frontend
npx vitest run src/components/manager/settings/RankSettingsSection.test.tsx
```

- [ ] **Step 3: 資料の一覧レイアウトを実装する**

上部にランク定義、下部にスタッフ割り当て表を置く。入力欄は表内で直線的に配置する。

- [ ] **Step 4: テストを通す**

```cmd
cd frontend
npx vitest run src/components/manager/settings/RankSettingsSection.test.tsx
npx tsc --noEmit
```

- [ ] **Step 5: コミットする**

```cmd
git add -- frontend/src/components/manager/settings frontend/src/components/manager/SectionBody.tsx frontend/src/styles.css
git commit -m "feat(frontend): rebuild rank settings screen"
```

---

### Task 9: SectionBodyを整理して全画面を実機比較

**Files:**
- Modify: `frontend/src/components/manager/SectionBody.tsx`
- Modify: `frontend/src/components/manager/SectionBody.test.tsx`
- Modify only observed differences in `frontend/src/styles.css` and the four section components.

- [ ] **Step 1: SectionBodyをルーターへ縮小する**

```tsx
case 'shift-settings':
case 'collection-settings':
  return <ShiftSettingsSection />;
case 'shift-patterns':
  return <ShiftPatternsSection />;
case 'model-shift':
  return <ModelShiftSection />;
case 'rank-settings':
  return <RankSettingsSection />;
```

旧インライン実装と「準備中」文言を削除する。

- [ ] **Step 2: 4画面のナビゲーションテストを実行する**

```cmd
cd frontend
npx vitest run src/components/manager/ManagerLayout.test.tsx src/components/manager/SectionBody.test.tsx src/components/manager/settings
```

Expected: PASS。

- [ ] **Step 3: 実ブラウザで資料比較する**

確認項目:

```text
[ ] 青い見出しと白背景
[ ] 情報順序が資料と一致
[ ] 角丸0〜2px
[ ] 影は浮遊設定パネルのみ
[ ] 中番なし
[ ] QRコードなし
[ ] 入力と保存が実際に動作
[ ] スマホ提出期間へ設定が反映
[ ] モデルシフトがシフト表へ反映
[ ] ランク保有者数が一致
```

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

- [ ] **Step 5: 最終差分をコミットする**

```cmd
git add -- frontend/src backend/src
git commit -m "fix: align manager settings with references"
```
