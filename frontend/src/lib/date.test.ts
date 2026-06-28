import { describe, it, expect } from 'vitest';
import { formatDate, daysInMonth, getMonthDates, firstWeekdayOfMonth, shiftMonth, previousMonth } from './date';

describe('formatDate', () => {
  it('zero-pads month and day', () => {
    expect(formatDate(2026, 6, 9)).toBe('2026-06-09');
    expect(formatDate(2026, 12, 25)).toBe('2026-12-25');
  });
});

describe('daysInMonth', () => {
  it('returns days for normal months', () => {
    expect(daysInMonth(2026, 6)).toBe(30);
    expect(daysInMonth(2026, 7)).toBe(31);
  });
  it('handles February leap years', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
  });
});

describe('getMonthDates', () => {
  it('returns every date string in the month', () => {
    const dates = getMonthDates(2026, 6);
    expect(dates).toHaveLength(30);
    expect(dates[0]).toBe('2026-06-01');
    expect(dates[29]).toBe('2026-06-30');
  });
});

describe('firstWeekdayOfMonth', () => {
  it('returns 0-6 (Sun-Sat) for the 1st', () => {
    // 2026-06-01 is a Monday => 1
    expect(firstWeekdayOfMonth(2026, 6)).toBe(1);
  });
});

describe('shiftMonth', () => {
  it('moves forward across year boundary', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
  it('moves backward across year boundary', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('previousMonth', () => {
  it('returns the previous YYYY-MM string', () => {
    expect(previousMonth('2026-06')).toBe('2026-05');
    expect(previousMonth('2026-10')).toBe('2026-09');
  });
  it('crosses year boundary', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
  });
});
