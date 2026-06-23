# 管理メニュー（GlobalNav）セクション機能化 — 設計

作成日: 2026-06-23

## 背景

`frontend/src/components/manager/GlobalNav.tsx` には、らくしふ（300.pdf p13 機能一覧）に倣った
7グループ・約33セクションのプルダウンメニューが定義済みだが、**どこにもレンダリングされておらず**、
各項目を押しても何も起きない。`enabledSections: ReadonlySet<ManagerSection>` で
有効/無効を切り替える設計だけが用意されている。

ユーザー要望: このプルダウンの各項目を、一つ一つ「実際に動く機能」として実装する。
進め方は **ロードマップ（`要件定義/300.pdf` 由来、メモ rakushifu-feature-roadmap）優先度順に1つずつ**。

本ドキュメントは **増分1（土台＋最初の1セクション）** の仕様を定める。
後続セクションは各々が独自の spec → plan → 実装サイクルを持つ。

## 全体の進行順（コンテキスト／本spec対象外）

| 順 | セクション | 根拠 | データ |
|---|---|---|---|
| 土台 | セクション・ルーター | — | — |
| 1 | モデルシフト | p18 | localStorage |
| 2 | 追加募集 | p22 | backend済 |
| 3 | 確定シフト＋確定フロー | p24 | localStorage |
| 4 | ランク設定 | p19 | backend済 |
| 5 | スキル設定 | p20 | backend済 |
| 6 | 労務状況・労働時間アラート | p19 | 計算 |
| 7 | メッセージ（1対1チャット） | p22 | localStorage |
| 8 | 他事業所ヘルプ | p23 | localStorage |
| 9 | 固定シフト・シフトパターン | p17 | localStorage |
| 10 | 色設定／部門・ポジション・権限・雇用形態 | p18,25 | localStorage |
| 11 | スタッフ簡単登録 | p14 | backend済 |
| 12+ | 残り（一覧/CSV/連携/各種設定 等） | p13 | 既存活用 |

各セクションは「設計→実装→テスト(vitest)→実機確認」を1サイクルとして1つずつ仕上げる。

## 増分1 のスコープ

**目的**: GlobalNav を店長画面に組み込み、「選んだ項目で本文が切り替わる」ルーター方式を確立する。
最初の機能セクションとして、リスクが低く実データで end-to-end を証明できる **スタッフ一覧** を実装する。

### 含むもの
- GlobalNav の店長画面への組み込み（TopNav の置き換え）
- セクション・ルーター（`activeSection` 切り替え）
- セクション・レジストリ（実装済みセクションの単一ソース）
- スタッフ一覧パネル（閲覧のみ）
- vitest による回帰テスト

### 含まないもの（後続増分）
- モデルシフト以降の各セクション機能
- スタッフのランク／スキル編集（後続の rank-settings / skill-settings セクションで実装）
- スタッフ新規登録UI（後続の staff-registration セクションで実装）

## アーキテクチャ

### コンポーネント構成

```
App.tsx (店長分岐)
└─ ManagerLayout（新規）
   ├─ GlobalNav（既存・配線する）
   └─ <選択中セクションのパネル>
      ├─ shift-table   → ManagerShiftScreen（既存・そのまま）
      ├─ staff-list    → StaffListPanel（新規）
      └─ その他         → メニューで無効（到達不能）
```

### セクション・レジストリ（`components/manager/sections/registry.tsx`）

`ManagerSection` → パネル描画情報の対応表を単一ソースとして持つ。
`enabledSections`（GlobalNav へ渡す Set）も本文の出し分けも、ここから導出する。

```ts
// 形のイメージ（実装時に確定）
export interface SectionEntry {
  render: () => ReactNode;
}
export const SECTION_REGISTRY: Partial<Record<ManagerSection, SectionEntry>>;
export const ENABLED_SECTIONS: ReadonlySet<ManagerSection>; // = registry のキー集合
```

セクションを実装するたびに registry へ1エントリ追加するだけで、
メニュー点灯（enabled）とルーティングの両方が有効になる。

### ManagerLayout（`components/manager/ManagerLayout.tsx`）

- `activeSection: ManagerSection` を state で保持。既定 `'shift-table'`。
- `GlobalNav` を描画し、以下を配線:
  - `userName` = `useApp().me?.name ?? ''`
  - `enabledSections` = registry 由来の `ENABLED_SECTIONS`
  - `onOpenSection(section)` = `setActiveSection(section)`
  - `onHome` = `activeSection` を `'shift-table'` に戻し、既存のホーム挙動（月リセット）も発火
  - `onLogout` = `useApp().logout`
- 本文は `activeSection` から registry を引いて描画。
  `shift-table` は `ManagerShiftScreen`（既存の `homeSignal` 挙動を維持）。

### ホーム挙動の移譲

現在 `App.tsx` は店長に対し `TopNav` をレンダリングし、`onHome` で `managerHomeSignal` を増やして
`ManagerShiftScreen` をリセットしている。GlobalNav がトップバーを担うため、この `homeSignal` 機構は
`ManagerLayout` 内に移す。`ManagerLayout` がブランド/ホームクリックで
`activeSection='shift-table'` ＋ `homeSignal++` を行い、`ManagerShiftScreen` へ渡す。

### スタッフ一覧パネル（`components/manager/sections/StaffListPanel.tsx`）

- データ: `useApp().staff`。
- 表示: テーブル（列 = 氏名／雇用形態／役割／ランク／スキル）。
  - 役割は STAFF/MANAGER を日本語表記（スタッフ／管理者）。
  - ランク未設定は `—`、スキル無しは空。
- 上部サマリ: 総数・正社員数・パート数。
- 閲覧専用（この増分では編集なし）。
- スタイルは参照UIに準拠（既存 `rk-` 系 className とテーブルパターンに合わせる）。

## データフロー

- 読み取りのみ。`AppContext` が既にログイン時に `staff` をロード済み。新規 API 呼び出しなし。
- 状態の追加は `ManagerLayout` の `activeSection` のみ（永続化不要）。

## エラーハンドリング

- `staff` 空配列時: 「スタッフがいません」を表示。
- `me` 未取得は App.tsx 上流で既にガード済み（店長分岐に入る時点で `me` 確定）。
- 未登録セクションは GlobalNav が disabled 表示するため、本文側で未定義を踏まない。
  万一 registry に無いセクションが `activeSection` になっても、`shift-table` にフォールバック。

## テスト方針（vitest + Testing Library）

- `ManagerLayout`:
  - 既定で `ManagerShiftScreen`（シフト表）が表示される。
  - メニューから「スタッフ一覧」を選ぶと StaffListPanel が表示される。
  - registry 未登録セクションはメニューで無効（押下不可）。
- `StaffListPanel`:
  - スタッフ配列を渡すと各行が描画される。
  - サマリ件数（総数／正社員／パート）が正しい。
- 既存テスト（GlobalNav.test.tsx 等）が壊れないこと。

## 受け入れ基準

1. 店長でログインすると上部に GlobalNav が表示され、ブランド名・アカウント・ログアウトが機能する。
2. 既定でシフト表（既存画面）が表示され、従来どおり操作できる。
3. 「スタッフ」グループ →「スタッフ一覧」でスタッフ一覧パネルに切り替わる。
4. スタッフ一覧に現店舗スタッフが氏名・雇用形態・役割・ランク・スキルで一覧表示される。
5. 未実装セクションはメニューで淡色・押下不可。
6. `npm test`（フロント）と `npm run build` が通る。
