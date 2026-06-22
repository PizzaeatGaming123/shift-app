# 中番＋メモ機能 設計（らくしふ再現 第2イテレーション）

- 日付: 2026-06-22
- 前提: `2026-06-22-rakushifu-style-ui-design.md` の続き。配色・マトリクスは実装済み。
- 目的: スクショに「完璧に同じ」へ寄せるため、中番（3スロット化）と、セルのひとことメモ・店舗メモ（アプリで入力・保存可能）を追加する。

## ユーザー承認済みの決定

1. **中番を追加**：早番／中番／遅番の3スロット。バックエンド enum・シード・各画面を拡張。
2. **メモはアプリで入力・保存**：スタッフのひとこと（交代・応援依頼等）と店長の店舗メモを永続化。
3. **希望提出は1日1選択**（早番／中番／遅番／休み）。既存の「早番+遅番（both）」は廃止。
4. **ホールメモは「店舗メモ」1行に集約**（暁夢デモにホール/キッチン区分がないため）。

## スコープ外（YAGNI）

- 1セルに複数チップを重ねる希望（複数スロット同時希望）。単一選択に統一。
- ホール/キッチンのセクション分け。
- 人件費のスタッフ別時給（既存の一律 `HOURLY_WAGE` を維持。`Staff.hourlyWage` は将来用で未使用のまま）。

## データモデル変更

### enum
- `WorkSlot`: `MID("mid")` を追加（EARLY/MID/LATE）。
- `RequestSlot`: `MID("mid")` を追加（EARLY/MID/LATE/OFF）。

### 新エンティティ
- **`DayNote`**：スタッフの日次ひとこと。`id` / `staff`(ManyToOne) / `date` / `text`(最大200)。一意制約 `(staff_id, date)`。
- **`StoreNote`**：店長の店舗メモ。`id` / `store`(ManyToOne) / `date` / `text`(最大200)。一意制約 `(store_id, date)`。

### リポジトリ
- `DayNoteRepository`: `findByStaff_Store_IdAndDateBetween`, `findByStaff_IdAndDate`。
- `StoreNoteRepository`: `findByStore_IdAndDateBetween`, `findByStore_IdAndDate`。

### サービス（`NoteService`）
- `setDayNote(username, date, text)`：空文字なら削除、それ以外は upsert。
- `findDayNotesByStoreMonth(storeId, from, to)`。
- `setStoreNote(storeId, date, text)`：空文字なら削除、それ以外は upsert。
- `findStoreNotesByMonth(storeId, from, to)`。

## API

| メソッド | パス | 権限 | 用途 |
|---|---|---|---|
| GET | `/api/stores/{storeId}/day-notes?month=YYYY-MM` | 認証 | スタッフひとこと一覧 `[{staffId,date,text}]` |
| PUT | `/api/day-notes` `{date,text}` | 認証（本人） | 自分のひとこと upsert |
| GET | `/api/stores/{storeId}/store-notes?month=YYYY-MM` | 認証 | 店舗メモ一覧 `[{date,text}]` |
| PUT | `/api/stores/{storeId}/store-notes` `{date,text}` | MANAGER | 店舗メモ upsert |

- `SecurityConfig` に `PUT /api/stores/*/store-notes` の `hasRole("MANAGER")` を追加。
- DTO: `DayNoteDto(staffId,date,text)` / `StoreNoteDto(date,text)` / `SetDayNoteBody(date,text)` / `SetStoreNoteBody(date,text)`。

## シードデータ（`DataSeeder`）

H2はファイルDB・gitignore対象。`backend/data` を削除して初期化すれば新データで再シードされる。
`storeRepository.count()==0` の初期投入ブロック内で、各店に当月（2026-07）の希望・割り当て・メモのサンプルを投入し、ログイン直後からスクショのように賑やかに見せる。

## フロントエンド変更

- `types.ts`: `WorkSlot` に `'mid'`、`DayRequestValue = 'none'|'early'|'mid'|'late'|'off'`（both 廃止）、`RequestSlot` に `'mid'`、`DayNote`/`StoreNote` 型を追加。
- `constants.ts`: `SLOT_LABELS.mid='中番'`、`SLOT_TIMES.mid='11:00-20:00'`、`WORK_SLOTS=['early','mid','late']`、`SLOT_HOURS.mid=9`。
- `store/requests.ts`: `getDayRequest`/`setDayRequest` を mid 対応・both 廃止。
- `api/client.ts`: day-notes / store-notes の取得・更新を追加。
- `store/AppContext.tsx`: dayNotes / storeNotes を読み込み、`setDayNote` / `setStoreNote` を公開。
- `components/RequestEditor.tsx`: 早番/中番/遅番/休み の単一選択＋ひとことメモ入力欄。
- `components/ManagerMatrix.tsx`: 中番の集計・割り当て、セルのメモ吹き出し表示、「店舗メモ」行（店長が編集）。
- `components/SharedView.tsx`: 中番対応。
- `components/ui/Legend.tsx` / `SummaryBar.tsx` / `summary.ts`: 中番対応・both 廃止。
- `styles.css`: メモ吹き出し・店舗メモ行・中番チップの仕上げ。

## テスト

- バックエンド: `NoteService` のユニット/スライステスト、`NoteController` のスライステスト（権限含む）。既存テスト（Assignment/Request/Store/Auth）の回帰を確認。`WorkSlot.fromCode("mid")` 等。
- フロント: `requests.test.ts`（mid・both廃止）、`summary.test.ts`、`labor` は変更なし（WORK_SLOTS 経由で mid を自動加算）、`ManagerMatrix.test.tsx`、新規メモUIの最小テスト。
- 最終: `mvnw.cmd test` / `tsc --noEmit` / `npm test` / `npm run build`、その後ローカル起動して目視。

## リスク

- enum 追加で既存の DB スキーマ（EnumType.STRING）には影響少。ただし既存 H2 データは初期化推奨。
- `DayRequestValue` の both 廃止が広範に波及。TDDで段階的に。
- メモ入力の XSS は React 標準エスケープに委ねる（`dangerouslySetInnerHTML` 不使用）。text は長さ制限（200）。
