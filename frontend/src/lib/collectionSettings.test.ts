import { describe, expect, it } from 'vitest';
import {
  collectionStatusLabel,
  createDefaultCollectionSettings,
  daysUntilDeadline,
  migrateCollectionSettings,
} from './collectionSettings';

describe('collectionSettings', () => {
  it('creates the current month collection defaults', () => {
    const settings = createDefaultCollectionSettings('2026-07');
    expect(settings.targetMonth).toBe('2026-07');
    expect(settings.status).toBe('OPEN');
    expect(settings.deadlineAt).toBe('2026-07-25T23:59');
  });

  it('shows an explicit reception status', () => {
    expect(collectionStatusLabel('BEFORE')).toBe('受付開始前');
    expect(collectionStatusLabel('OPEN')).toBe('受付中');
    expect(collectionStatusLabel('CLOSED')).toBe('受付終了');
  });

  it('calculates remaining whole days without becoming negative', () => {
    expect(daysUntilDeadline('2026-07-25T23:59', new Date('2026-07-23T10:00:00'))).toBe(3);
    expect(daysUntilDeadline('2026-07-20T23:59', new Date('2026-07-23T10:00:00'))).toBe(0);
  });

  it('migrates legacy half-month cycle to month', () => {
    const legacy = {
      targetMonth: '2026-07',
      cycle: 'half-month',
      reminders: 1,
    };
    expect(migrateCollectionSettings(legacy)).toEqual({
      targetMonth: '2026-07',
      cycle: 'month',
      reminders: 1,
    });
  });

  it('passes through non-legacy settings unchanged', () => {
    const fresh = { targetMonth: '2026-08', cycle: 'month', reminders: 2 };
    expect(migrateCollectionSettings(fresh)).toBe(fresh);
  });

  it('returns an empty object for non-object input', () => {
    expect(migrateCollectionSettings(null)).toEqual({});
    expect(migrateCollectionSettings('half-month')).toEqual({});
  });
});
