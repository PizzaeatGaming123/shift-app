-- ddl-auto: update が ALTER をサボる既存DB向けの保険。
-- IF NOT EXISTS にしているので、新規DB（Hibernate がテーブル生成）でも害は無い。
ALTER TABLE IF EXISTS shift_requests ADD COLUMN IF NOT EXISTS status VARCHAR(24);
