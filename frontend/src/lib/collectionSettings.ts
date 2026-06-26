export type CollectionStatus = 'BEFORE' | 'OPEN' | 'CLOSED';

export interface CollectionSettings {
  targetMonth: string;
  cycle: 'month';
  startAt: string;
  deadlineAt: string;
  publishAt: string;
  status: CollectionStatus;
  reminders: number;
}

export function createDefaultCollectionSettings(month: string): CollectionSettings {
  return {
    targetMonth: month,
    cycle: 'month',
    startAt: `${month}-01T00:00`,
    deadlineAt: `${month}-25T23:59`,
    publishAt: `${month}-28T12:00`,
    status: 'OPEN',
    reminders: 2,
  };
}

/**
 * 旧バージョンで保存された `cycle: 'half-month'` を `'month'` に正規化する。
 * 他のキーはそのまま透過する。
 */
export function migrateCollectionSettings(raw: unknown): Partial<CollectionSettings> {
  if (typeof raw !== 'object' || raw === null) return {};
  const settings = raw as Record<string, unknown>;
  if (settings.cycle === 'half-month') {
    return { ...settings, cycle: 'month' } as Partial<CollectionSettings>;
  }
  return settings as Partial<CollectionSettings>;
}

export function collectionSettingKey(storeId: string | number | null): string {
  return `akiyume-collect:${storeId ?? 'default'}`;
}

export function collectionStatusLabel(status: CollectionStatus): string {
  if (status === 'BEFORE') return '受付開始前';
  if (status === 'CLOSED') return '受付終了';
  return '受付中';
}

export function daysUntilDeadline(deadlineAt: string, now = new Date()): number {
  const deadline = new Date(deadlineAt);
  if (Number.isNaN(deadline.getTime())) return 0;
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000));
}
