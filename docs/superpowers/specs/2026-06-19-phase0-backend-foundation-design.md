# Phase 0: バックエンド基盤 設計書

- 対象顧客: ラーメン店「株式会社暁夢」（岡山県倉敷市・3店舗）
- 位置づけ: らくしふ相当のSaaS化に向けた**土台**。以降の Phase 1（人件費）/ 2（自動作成）/ 3（打刻）/ 4（未提出リマインド）はすべてこの基盤の上に載せる。
- ゴール: 既存 React フロントを **localStorage からサーバーAPIに切り替え**、複数ユーザー・複数端末で同じデータを共有し、**実ログイン認証**で役割（スタッフ／店長）を区別する。

## 技術選定（確定）

- バックエンド: **Spring Boot 3.x（Java 21）/ Maven（wrapper `mvnw` 同梱、システムMaven不要）**
- DB: **H2（ファイル保存）+ Spring Data JPA**（将来 PostgreSQL に差し替え可能な設計）
- 認証: **Spring Security セッションCookie**（BCryptパスワード）
- フロント: 既存 **React + Vite + TS** を再利用。データ源を localStorage → REST API に変更。

## 1. リポジトリ構成（モノレポ化）

現在ルート直下にある React 一式を `frontend/` へ移動し、`backend/` を新設する。

```
shift-app/
├── frontend/                 # 既存 React（移動）
│   ├── src/ ...              # 既存コード。storage.ts を api.ts に置換、Login追加
│   ├── package.json, vite.config.ts, index.html, tsconfig*.json
│   └── ...
├── backend/                  # 新規 Spring Boot
│   ├── mvnw, mvnw.cmd, .mvn/ # Maven wrapper
│   ├── pom.xml
│   └── src/main/java/jp/akiyume/shift/...
│       src/main/resources/application.yml
│       src/test/java/...
├── docs/                     # 既存（要件・設計・計画）
├── README.md                 # ルートは全体説明＋各サブ起動方法に更新
└── .gitignore                # backend のビルド成果物等を追加
```

移動に伴い、ルートの `package.json` 等は `frontend/` 配下になる。Vite の dev proxy 設定もここで行う。

## 2. データモデル（JPA エンティティ）

| エンティティ | フィールド |
|---|---|
| `Store` | id (Long, PK), name (String) |
| `Staff` | id (Long, PK), username (String, unique), passwordHash (String), name (String), store (ManyToOne Store), employmentType (enum: 正社員/パート), role (enum: STAFF/MANAGER), hourlyWage (Integer, nullable ※Phase1用) |
| `ShiftRequest` | id (Long, PK), staff (ManyToOne Staff), date (LocalDate), slot (enum: EARLY/LATE/OFF) |
| `ShiftAssignment` | id (Long, PK), store (ManyToOne Store), date (LocalDate), slot (enum: EARLY/LATE), staff (ManyToOne Staff) |

- 既存フロントの型（early/late/off, both は early+late の2レコード）と整合させる。`ShiftRequest` は (staff,date,slot) を一意制約とし、`both` は EARLY と LATE の2行で表現、`off` は OFF 1行。
- `ShiftAssignment` は (store,date,slot,staff) 一意。フラットテーブルで表現。

## 3. REST API（JSON、すべて `/api` 配下）

認証:
- `POST /api/auth/login` ボディ {username, password} → 成功で 200＋セッションCookie発行、`me` 相当を返す
- `POST /api/auth/logout` → セッション破棄
- `GET /api/auth/me` → {id, name, role, storeId}（未ログインは 401）

データ:
- `GET /api/stores` → [{id, name}]（ログイン必須）
- `GET /api/stores/{storeId}/staff` → [{id, name, employmentType, role}]
- `GET /api/stores/{storeId}/requests?month=YYYY-MM` → [{staffId, date, slot}]
- `PUT /api/requests` ボディ {date, value:('none'|'early'|'late'|'both'|'off')} → **自分の**希望をその日について設定（staffId はセッションから決定）。200で更新後の当日希望を返す
- `GET /api/stores/{storeId}/assignments?month=YYYY-MM` → [{date, slot, staffId}]
- `POST /api/assignments` ボディ {storeId, date, slot, staffId} → 追加（店長のみ）
- `DELETE /api/assignments` ボディ {storeId, date, slot, staffId} → 解除（店長のみ）

### 権限ルール
- 全エンドポイントはログイン必須。
- `PUT /api/requests` は本人の希望のみ（staffId はサーバ側でセッションから決定。リクエストボディに staffId を含めない）。
- `POST/DELETE /api/assignments` は **role=MANAGER のみ**（403 otherwise）。
- スタッフは自店舗のデータのみ参照可（storeId が自分の所属と異なれば 403）。店長も自店舗のみ（複数店舗集約は Phase 1 で検討）。

### エラー応答
- 認証なし: 401、権限なし: 403、バリデーション不正: 400（{message} を返す）。

## 4. 認証・セキュリティ

- Spring Security の **セッションCookieベースのフォームではなくAPIログイン**（`/api/auth/login` を独自に実装し、`UsernamePasswordAuthenticationToken` で認証→`SecurityContext` をセッションに保存）。
- パスワードは **BCrypt** でハッシュ化。
- CSRF: SPA + セッションCookie のため、開発簡略化として **CSRFはオフ**にし、`SameSite=Lax` Cookie で運用（デモ/本番初期の割り切り。将来 CSRFトークン方式に強化可能と明記）。
- CORS: 開発は **Vite dev proxy** で同一オリジン化するため不要。proxy を使わない場合に備え、`localhost:5173` を許可する設定も用意（credentials 許可）。

## 5. 初期データ投入（Seed）

起動時、DBが空なら投入（`CommandLineRunner` 等）:
- 3店舗: 中島店 / 新田店 / 早島店
- 各店に既存 seed.ts 相当のスタッフ。**各店「◯◯（店長）」を role=MANAGER**、他を role=STAFF。
- 全員に既定パスワード（例: `password`）を BCrypt 保存。username は分かりやすく（例: `nakashima-tencho`, `nakashima-1` 等）。ログイン画面に「デモ用アカウント一覧」を表示してすぐ試せるようにする。

## 6. フロント連携（既存 React の変更）

- `src/store/storage.ts`（localStorage）を廃し、**`src/api/client.ts`**（fetch、`credentials:'include'`）を新設。
- 状態管理: AppData をAPIから取得する形へ。`AppContext` は (a) `/me` でログイン状態と役割・所属店舗を取得、(b) 選択中の店舗・月に応じて staff/requests/assignments を取得、(c) 変更操作はAPI呼び出し→該当データ再取得。
- **ログイン画面** `src/components/Login.tsx` を追加。未ログイン時はこれを表示。
- `Header` の**役割トグルを廃止**し、ログインユーザーの role で表示を出し分け（スタッフはRequest/Shared、店長はMatrix/Shared）。店舗選択は、店長/スタッフとも自店舗固定（将来の複数店舗対応に備えビューは残す）。
- 既存の純粋ロジック（date / requests / assignments / fulfillment）は**そのまま再利用**。reducer は「サーバから来たデータを保持する」形に縮小（楽観更新はせず取得し直す方針でシンプルに）。

## 7. ビルド・起動・配信

- 開発: `backend` で `./mvnw spring-boot:run`（:8080）、`frontend` で `npm run dev`（:5173、`/api`→:8080 proxy）。
- 本番（将来）: `npm run build` の成果物を Spring Boot の static として配信し同一オリジンで動かす（Phase 0 ではビルド成果物配信の最小設定まで用意、運用最適化は後段）。

## 8. テスト方針

- バックエンド:
  - リポジトリ/サービス層: 主要クエリと希望設定（none/early/late/both/off の更新ロジック）、割り当てトグルのユニットテスト
  - コントローラ: MockMvc で 認証要否・権限（スタッフが割り当てAPIを叩くと403、本人以外の希望編集不可）・正常系を検証
  - セキュリティ: 未ログイン401、ログイン後200
- フロント:
  - `api/client.ts` は fetch をモックして主要呼び出しを検証
  - 既存ロジックテストは維持

## 9. 対象外（このPhaseでやらないこと）

- 人件費計算（Phase 1）、自動作成（Phase 2）、打刻（Phase 3）、リマインド/通知（Phase 4）、LINE連携（Phase 5）
- パスワード変更・ユーザー管理画面、CSRFトークン方式、PostgreSQL移行（設計上は差し替え可能にしておくのみ）

## 10. 受け入れ基準（Phase 0 完了の定義）

1. `backend` が `./mvnw spring-boot:run` で起動し、H2にseedが入る。
2. ブラウザでフロントを開くとログイン画面が出て、デモ用アカウントでログインできる。
3. スタッフでログイン→希望提出→**別ブラウザ/別端末**で店長ログイン→その希望が見え、割り当て→確定シフトがスタッフ側にも見える（＝サーバー共有が成立）。
4. スタッフが割り当てAPIを叩くと拒否される（権限）。
5. バックエンド・フロント双方のテストが緑。
