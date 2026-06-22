# AGENTS.md

## Project

暁夢（あきゆめ）向けシフト管理アプリ。`frontend/` は React + Vite + TypeScript、`backend/` は Spring Boot + H2。

## Working agreements

- ユーザー向け文言と説明は日本語にする。
- フロントエンドの作業は `frontend/`、バックエンドの作業は `backend/` でコマンドを実行する。
- UIは清潔でプロフェッショナルなSaaS調。インディゴ基調、PC/スマホ両対応、操作の意味が一目で分かることを優先する。
- Tailwind CSSやUIライブラリを追加しない。既存の素のCSSとデザイントークンを使う。
- API契約やドメインロジックを、見た目だけの変更に巻き込まない。
- キーボード操作、見えるフォーカス、適切なARIA、`prefers-reduced-motion` を維持する。
- 既存のユーザー変更や無関係なファイルを戻さない。
- コミットメッセージにAIの帰属トレーラーを付けない。

## Test-first workflow

- 振る舞いを追加・修正するときは、先に失敗するテストを書き、失敗理由を確認してから最小実装を行う。
- フロントエンドの最終確認:

```cmd
cd frontend
npx tsc --noEmit
npm test
```

- バックエンドの最終確認:

```cmd
cd backend
mvnw.cmd test
```

## Architecture notes

- API通信: `frontend/src/api/client.ts`
- 認証・店舗・月・シフト状態: `frontend/src/store/AppContext.tsx`
- 日付ロジック: `frontend/src/lib/date.ts`
- 希望・割り当て純粋関数: `frontend/src/store/requests.ts`, `frontend/src/store/assignments.ts`
- 共有UI部品: `frontend/src/components/ui/`
- 全体スタイル: `frontend/src/styles.css`

## Local development

バックエンドとフロントエンドを別ターミナルで起動する。

```cmd
cd backend
mvnw.cmd spring-boot:run
```

```cmd
cd frontend
npm run dev
```

ブラウザ: `http://localhost:5173`

