# 店長UI整理 + パート時間メイン対応 設計書

2026-06-26

## 背景

参考UI風UIをひと通り作ったが、実運用フィードバックで以下が判明：

- パートが店舗の主戦力（10数人／店）、勤怠管理は **時間ベース** がメイン。早番/遅番スロットは正社員のごく一部しか使わない。
- 会計関連（売上計画・人件費・人時売上高）は店長業務の優先度が低く、画面ノイズ。
- ランク/スキル機能は使われていない。
- 扶養範囲を超えないか確認したい。月の合計時間が見えて、超過が近づくと警告ほしい。
- PCで一覧性が悪い（スクロール多発）。文字も小さい。
- 「先月と同じ」で希望/割当をワンタップ複製したい。

本設計はこれらに対応する。

## 用語

- **割当 (Assignment)**: 店長が確定したシフト。1人がいつ働くかの記録。
- **希望 (Request)**: スタッフが事前提出する勤務希望。
- **スロット (WorkSlot)**: `early` / `late` の2値。正社員の早番・遅番判別用に残す。
- **時間割当**: スロットを使わず、`startTime` / `endTime` で勤務時間を直接指定する割当。パート主体。

## 変更スコープ

### A. 削除

| 項目 | 場所 |
|---|---|
| ナビ「計画」グループから売上計画 / 人件費 / 人時売上高 | モデルシフトは除く（後述） |
| ナビ「スタッフ」内：ランク設定 / スキル設定 | |
| シフト周期の「半月」 | シフト設定 |
| シフト表サマリー行: 売上計画 / 人時売上高 / 人件費 / ランク計 | |
| Staffエンティティの `rank` / `skills` | DB + フロント型 |
| `RankSkillScreen.tsx` コンポーネント | |
| `SummaryItemKey` から `sales` / `salesPerHour` / `laborCost` / `rankTotal` | |
| `displayDefaults` の `'half-month'` 選択肢 | `initialView` のデフォルトは `'month'` に変更 |
| 設定キー `collect.cycle` の `'half-month'` | 既存値が `'half-month'` のストアは `'month'` にマイグレーション |

**残すサマリー行**: 総労働時間 / モデルシフト（早遅カバレッジ）/ 店舗メモ / ポジションメモ

**モデルシフトの扱い**: ¥が出ない人員計画なので機能としては残す。ナビ「計画」グループ自体を消すため、モデルシフト編集画面は **「設定」グループに「モデルシフト」サブメニューとして移動**。「計画」グループはナビから完全消滅。

### B. リネーム

- ナビ「シフト管理」グループ → **「シフト確定」**

### C. スタッフ並び順

スタッフ一覧・店長シフト表で `employmentType` で以下の順にソート：

1. パート
2. 正社員
3. その他

同区分内は氏名昇順。これは並び順「標準」のときの挙動。既存の「名前順／時間順／ランク順」のうちランク順は削除。

**雇用形態の選択肢**: パート / 正社員 のみ。アルバイトは廃止（実運用上存在しないと判明したため）。`EmploymentType` enum, スタッフ登録ドロップダウン、シードデータ、全テストから「アルバイト」を除去する。

### D. パート時間メイン化（最重要）

#### バックエンド変更

`Assignment` エンティティに以下を追加：

```java
@Column(name = "start_time", length = 5)
private String startTime;  // "HH:MM" or null

@Column(name = "end_time", length = 5)
private String endTime;    // "HH:MM" or null
```

ルール：
- `startTime` / `endTime` が両方非nullなら **時間割当**（パート想定）
- 両方nullなら **スロット割当**（早/遅。正社員想定）
- 片方だけnullは不正、APIで422

`WorkSlot` は当面残す。`AssignmentDTO`・request/responseに `startTime` / `endTime` を追加。

ShiftRequest側は既に startTime/endTime を持つので変更なし。

DB初期化：開発用H2は破棄して再シード（`backend/data/shiftdb.mv.db` 削除）。

#### フロント変更

**店長シフト表 (ShiftStaffRow.tsx)：**

- 空セルクリックで「割当モーダル」を開く
- 雇用形態で初期表示を分岐：
  - 正社員 → 早 / 遅 / 任意時間 の3ボタン
  - パート / アルバイト → 任意時間入力フォーム（開始・終了）
- セル表示優先度：
  1. 時間割当あり → `"9-13"` 形式
  2. スロット割当あり → `"早"` / `"遅"`
  3. 希望あり → 既存通り

**割当データの送信：**

`api.toggleAssignment` の引数に `{ startTime?, endTime? }` を追加。スロット割当のときは省略。

### E. 「先月と同じ」コピー機能

#### 共通アルゴリズム

```
function copyPreviousMonthByWeekday(targetMonth, staffId, source):
  prevMonth = targetMonth の1か月前
  prev日付ごとの値を曜日別にgroupBy
  曜日ごとに最頻値を計算（同数の場合は最新日付の値）
  targetMonth の全日付について、曜日に対応する最頻値を出力
```

#### 店長側

シフト表の各スタッフ名横に「先月と同じ」小ボタン。

- クリックで `copyPreviousMonthByWeekday` を実行
- 結果を **そのスタッフの確定割当として上書き保存**
- スタッフが希望未提出でも実行可
- 確認モーダル：「○○さんの先月のシフトを今月に複製します。既存の割当は上書きされます。」

#### スタッフ側

`RequestEditor.tsx` の既存「提出履歴から自動入力」ボタンを改修：

- ラベル変更：「**先月と同じ希望**」
- 動作変更：先月の自分のrequestsを曜日パターン化してdraftにセット
- 提出ボタンを押すまではDB保存しない（既存挙動踏襲）

### F. 扶養（時間警告）

#### データモデル

`Staff` に追加：

```java
@Column(name = "monthly_hour_limit")
private Integer monthlyHourLimit;  // null可。デフォルト null（警告なし）
```

#### UI

- スタッフ登録・スタッフ一覧で編集可能。数値入力。
- 推奨初期値：87（130万円の壁の月割相当）
- 計算：当月の `staffMonthlyHours(person, dates)` / `monthlyHourLimit` × 100 = %
- 色段階：
  - <80% → 通常
  - 80-95% → 黄 (`rk-warn-soft`)
  - 95-100% → 橙 (`rk-warn-medium`)
  - >100% → 赤 (`rk-warn-hard`)
- 適用先：
  - ShiftStaffRow の名前下の時間表示
  - `labor-status` 画面のスタッフ行
  - `labor-alerts` の検出条件にも追加

`monthlyHourLimit` がnullのスタッフは警告対象外（既存連続勤務日数の警告のみ）。

### G. 文字大・15人スクロールなしレイアウト

- 表示設定の初期値を `fontSize: 'large'` に変更
- CSS調整：
  - `.rk-app--large` のbase font-size: 17px → 18px
  - シフト表 `rk-shift-staff-row--medium`（default density）のパディング: `0.5rem 0.75rem` → `0.4rem 0.6rem`
  - `.rk-shift-staff__name` 列の最小幅: 120px → 100px
  - 日付セル最小幅: 縮小
- 目標：1920×1080 / 1366×768 共に、ヘッダー+残しサマリー2行+15スタッフ行がスクロールなしで収まる
- 既存設定が `standard` のままのユーザーには影響なし（デフォルト変更は新規店舗のみ）

### H. スタッフ「シフト確定」画面から希望表示削除

`SharedView.tsx:61` の `showRequests: true` → `false`。

### I. 早番2人問題

調査結果：`Assignment.staffIds` が配列で、UI/APIに人数制限なし。技術的には既に動く。

UI上、同日同スロットの複数割当が見づらい問題があれば別途対応。本設計では特段の修正なし。

## 影響テスト

修正・追加が必要なテスト：

- `ShiftTable.test.tsx`: サマリー行削除を反映
- `ShiftStaffRow.test.tsx`: 空セルクリック → モーダル / 時間表示
- `RequestEditor.test.tsx`: 「先月と同じ希望」改修
- `SectionBody.test.tsx`: ナビ削除項目
- `Staff` 関連の backend テスト: rank/skills削除、monthlyHourLimit追加
- `Assignment` 関連: startTime/endTime追加
- 新規: 「先月と同じ」コピーアルゴリズム単体テスト

## マイグレーション

開発のみ。H2ファイルを削除して `DataSeeder` で再投入：

```
rm backend/data/shiftdb.*.db
./mvnw.cmd spring-boot:run
```

`DataSeeder` から rank/skills を取り除き、monthlyHourLimit のサンプル値を入れる。

## 非対応（次回以降）

- AI自動シフト作成
- 時間割当のドラッグ操作（クリックで個別入力のみ）
- パート時間警告の他項目（週40h上限など）
- ランク機能の代替（必要性が見えたら別設計）

## 実装順序の提案

1. 削除系（A, B, H, リネーム） — リスク低、コードが減って次が楽
2. スタッフ並び順（C）
3. 扶養（F） — Staffスキーマ拡張
4. 時間割当（D） — Assignmentスキーマ拡張、最大スコープ
5. 「先月と同じ」（E）— Dが先に必要
6. 文字大・密度（G）— 最後に視覚確認

各ステップでテスト緑を確認してから次へ。
