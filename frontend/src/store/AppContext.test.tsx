import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextMonthIso } from './AppContext';

describe('nextMonthIso', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 28));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('実機が 6 月のとき 2026-07 を返す', () => {
    expect(nextMonthIso()).toBe('2026-07');
  });

  it('実機が 12 月のとき翌年 01 月を返す', () => {
    vi.setSystemTime(new Date(2026, 11, 1));
    expect(nextMonthIso()).toBe('2027-01');
  });
});
