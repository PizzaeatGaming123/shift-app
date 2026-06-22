# 中番＋メモ機能 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans でタスク順に実装。チェックボックスで進捗管理。

**Goal:** 中番（3スロット化）とアプリ入力可能なひとことメモ・店舗メモを追加し、らくしふのスクショに寄せる。

**Architecture:** バックエンド: `WorkSlot`/`RequestSlot` に MID 追加、`DayNote`/`StoreNote` エンティティ＋Repository＋`NoteService`＋`NoteController` を追加、`DataSeeder` にデモ希望/割当/メモを投入。フロント: 型・定数・store・api・各コンポーネントを mid＋メモ対応。

**Tech Stack:** Spring Boot 3.5 + JPA + H2、React + Vite + TS、Vitest、JUnit。

参照設計: `docs/superpowers/specs/2026-06-22-mid-shift-and-memos-design.md`

---

## フェーズ1: バックエンド — 中番（enum）

### Task 1: WorkSlot / RequestSlot に MID 追加
- Modify: `domain/WorkSlot.java`, `domain/RequestSlot.java`
- [ ] `WorkSlot` に `MID("mid")` を EARLY と LATE の間に追加
- [ ] `RequestSlot` に `MID("mid")` を追加
- [ ] `RequestService.setDayRequest` の switch に `case "mid"` を追加、`case "both"` を削除
- [ ] `mvnw.cmd test` で既存テスト緑を確認
- [ ] commit: `feat(backend): 中番(mid)スロットを追加`

## フェーズ2: バックエンド — メモ

### Task 2: DayNote / StoreNote エンティティ＋リポジトリ
- Create: `domain/DayNote.java`, `domain/StoreNote.java`, `repo/DayNoteRepository.java`, `repo/StoreNoteRepository.java`
- [ ] `DayNote`(id, staff ManyToOne, date, text@Column(length=200)) 一意制約(staff_id,date)
- [ ] `StoreNote`(id, store ManyToOne, date, text length=200) 一意制約(store_id,date)
- [ ] `DayNoteRepository`: `findByStaff_Store_IdAndDateBetween`, `findByStaff_IdAndDate`
- [ ] `StoreNoteRepository`: `findByStore_IdAndDateBetween`, `findByStore_IdAndDate`
- [ ] commit: `feat(backend): メモ用エンティティとリポジトリを追加`

### Task 3: NoteService（TDD）
- Create: `repo/service/NoteService.java`, `src/test/java/.../repo/service/NoteServiceTest.java`
- [ ] 失敗するテスト: setDayNote upsert/空削除、setStoreNote upsert/空削除
- [ ] 実装: `setDayNote(username,date,text)`, `findDayNotesByStoreMonth`, `setStoreNote(storeId,date,text)`, `findStoreNotesByMonth`
- [ ] `mvnw.cmd test`
- [ ] commit: `feat(backend): メモのupsert/取得サービスを追加`

### Task 4: NoteController＋DTO＋Security
- Create: `web/NoteController.java`, `web/dto/DayNoteDto.java`, `web/dto/StoreNoteDto.java`, `web/dto/SetDayNoteBody.java`, `web/dto/SetStoreNoteBody.java`
- Modify: `security/SecurityConfig.java`
- Test: `src/test/java/.../web/NoteControllerTest.java`
- [ ] エンドポイント4種（設計の表）。`SecurityConfig` に `PUT /api/stores/*/store-notes` → MANAGER
- [ ] スライステスト: 取得・upsert・権限（スタッフが store-note PUT で403）
- [ ] `mvnw.cmd test`
- [ ] commit: `feat(backend): メモAPIエンドポイントを追加`

### Task 5: DataSeeder にデモデータ
- Modify: `seed/DataSeeder.java`
- [ ] 初期投入ブロックで当月(2026-07)の希望・割り当て・メモを各店に投入（賑やかに見せる程度）
- [ ] `backend/data` を削除して再起動 → シード再投入を確認
- [ ] commit: `feat(backend): デモ用の希望・割当・メモをシード`

## フェーズ3: フロント — 中番＋型/定数/store/api

### Task 6: 型・定数の mid 対応
- Modify: `types.ts`, `constants.ts`
- [ ] `WorkSlot` に `'mid'`、`DayRequestValue` から `'both'` 削除し `'mid'` 追加、`RequestSlot` に `'mid'`、`DayNote`/`StoreNote` 型追加
- [ ] `SLOT_LABELS.mid='中番'`, `SLOT_TIMES.mid='11:00-20:00'`, `WORK_SLOTS=['early','mid','late']`, `SLOT_HOURS.mid=9`
- [ ] commit: `feat(frontend): 中番スロットとメモ型を追加`

### Task 7: store/requests.ts（TDD）＋ summary
- Modify: `store/requests.ts`, `store/requests.test.ts`, `components/ui/summary.ts`, `components/ui/summary.test.ts`
- [ ] テスト更新: `getDayRequest` が mid を返す/`setDayRequest` が mid 行を作る・both 廃止、summary に mid 集計
- [ ] 実装更新
- [ ] `npx vitest run src/store/requests.test.ts src/components/ui/summary.test.ts`
- [ ] commit: `feat(frontend): 希望ロジックを中番対応に更新`

### Task 8: api/client.ts＋AppContext にメモ
- Modify: `api/client.ts`, `store/AppContext.tsx`
- [ ] api: `dayNotes(storeId,month)`, `setDayNote(date,text)`, `storeNotes(storeId,month)`, `setStoreNote(storeId,date,text)` と型
- [ ] AppContext: `dayNotes`/`storeNotes` state、`reloadStoreData` で取得、`setDayNote`/`setStoreNote` 公開
- [ ] `npx tsc --noEmit`
- [ ] commit: `feat(frontend): メモのAPI連携とアプリ状態を追加`

## フェーズ4: フロント — UI

### Task 9: RequestEditor（早/中/遅/休＋メモ）
- Modify: `components/RequestEditor.tsx`
- [ ] ボトムシートを 早番/中番/遅番/休み の単一選択に、ひとことメモの入力欄を追加（保存時 setDayRequest＋setDayNote）
- [ ] チップ表示に mid 反映
- [ ] `npx tsc --noEmit && npm test`
- [ ] commit: `feat(frontend): 希望提出に中番とひとことメモを追加`

### Task 10: ManagerMatrix（中番・メモ吹き出し・店舗メモ行）
- Modify: `components/ManagerMatrix.tsx`, `components/ManagerMatrix.test.tsx`, `styles.css`
- [ ] 中番の count 行・チップ、各セルに DayNote 吹き出し、上部に「店舗メモ」編集行（店長が各日入力→setStoreNote）
- [ ] CSS: `.cell-memo` 吹き出し、`.store-note-row` 入力
- [ ] テスト更新（中番行・店舗メモ行の存在）
- [ ] `npm test && npx tsc --noEmit && npm run build`
- [ ] commit: `feat(frontend): マトリクスに中番・メモ・店舗メモを追加`

### Task 11: SharedView / Legend 仕上げ
- Modify: `components/SharedView.tsx`, `components/ui/Legend.tsx`
- [ ] 中番チップを共有ビュー・凡例に反映
- [ ] `npm test && npx tsc --noEmit && npm run build`
- [ ] commit: `style(frontend): 共有ビューと凡例を中番対応に`

## フェーズ5: 検証

### Task 12: 最終検証＋目視
- [ ] backend `mvnw.cmd test`
- [ ] frontend `npx tsc --noEmit && npm test && npm run build`
- [ ] `backend/data` 初期化 → backend 起動 → frontend 起動 → ログインしてスクショと突き合わせ
- [ ] 差分があれば詰める／完了報告

---

## Self-Review
- Spec coverage: 中番(Task1,6,7,10,11)、メモエンティティ/API(Task2-4)、シード(Task5)、希望ロジック(Task7)、メモUI(Task9,10)、検証(Task12) — 全項目に対応。
- both 廃止は Task6,7,9 で一貫処理。
- 権限: store-note PUT は MANAGER（Task4）。
