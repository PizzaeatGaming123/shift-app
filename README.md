# 暁夢シフト管理アプリ

ラーメン店「株式会社暁夢」向けシフト管理アプリ。React フロント + Spring Boot バックエンド構成。

## 構成
- `frontend/` … React + Vite + TypeScript
- `backend/`  … Spring Boot 3 + H2 + Spring Security
- `docs/`     … 要件・設計・実装計画

## 起動

バックエンド:
```bash
cd backend
./mvnw spring-boot:run    # http://localhost:8080
```

フロントエンド:
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 （/api は backend にプロキシ）
```

## デモ用アカウント（パスワードは全員 password）
- 店長: nakashima-mgr / nitta-mgr / hayashima-mgr
- スタッフ: nakashima-1 〜 nakashima-4 など

## テスト
```bash
cd backend && ./mvnw test
cd frontend && npm test
```
