import { describe, expect, it } from 'vitest';
import type { ShiftRequest } from '../../types';
import { summarizeRequests } from './summary';

const dates = ['2026-07-01', '2026-07-02', '2026-07-03'];

describe('summarizeRequests', () => {
  it('counts submitted slots for one staff member', () => {
    const requests: ShiftRequest[] = [
      { staffId: 'p1', date: '2026-07-01', slot: 'early' },
      { staffId: 'p1', date: '2026-07-02', slot: 'late' },
      { staffId: 'p2', date: '2026-07-01', slot: 'late' },
    ];

    expect(summarizeRequests(requests, 'p1', dates)).toEqual({
      total: 3,
      submitted: 2,
      early: 1,
      late: 1,
      off: 0,
    });
  });

  it('counts off days separately', () => {
    const requests: ShiftRequest[] = [
      { staffId: 'p1', date: '2026-07-03', slot: 'off' },
    ];

    expect(summarizeRequests(requests, 'p1', dates)).toEqual({
      total: 3,
      submitted: 1,
      early: 0,
      late: 0,
      off: 1,
    });
  });
});

