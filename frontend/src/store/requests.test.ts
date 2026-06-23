import { describe, it, expect } from 'vitest';
import { getDayRequest, setDayRequest } from './requests';
import type { ShiftRequest } from '../types';

describe('getDayRequest', () => {
  it('returns none when no record exists', () => {
    expect(getDayRequest([], 'p1', '2026-06-01')).toBe('none');
  });
  it('returns early/late for single slot', () => {
    const reqs: ShiftRequest[] = [{ staffId: 'p1', date: '2026-06-01', slot: 'early' }];
    expect(getDayRequest(reqs, 'p1', '2026-06-01')).toBe('early');
  });
  it('returns off for a holiday request', () => {
    const reqs: ShiftRequest[] = [{ staffId: 'p1', date: '2026-06-01', slot: 'off' }];
    expect(getDayRequest(reqs, 'p1', '2026-06-01')).toBe('off');
  });
});

describe('setDayRequest', () => {
  it('replaces existing records for that staff+date only', () => {
    const reqs: ShiftRequest[] = [
      { staffId: 'p1', date: '2026-06-01', slot: 'early' },
      { staffId: 'p2', date: '2026-06-01', slot: 'late' },
    ];
    const next = setDayRequest(reqs, 'p1', '2026-06-01', 'late');
    expect(getDayRequest(next, 'p1', '2026-06-01')).toBe('late');
    // p2 は影響を受けない
    expect(getDayRequest(next, 'p2', '2026-06-01')).toBe('late');
  });
  it('none removes all records for that staff+date', () => {
    const reqs: ShiftRequest[] = [{ staffId: 'p1', date: '2026-06-01', slot: 'early' }];
    const next = setDayRequest(reqs, 'p1', '2026-06-01', 'none');
    expect(next).toHaveLength(0);
  });
  it('off stores a single off record', () => {
    const next = setDayRequest([], 'p1', '2026-06-01', 'off');
    expect(next).toEqual([{ staffId: 'p1', date: '2026-06-01', slot: 'off' }]);
  });
});
