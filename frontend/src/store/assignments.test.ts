import { describe, it, expect } from 'vitest';
import {
  isAssigned,
  toggleAssignment,
  countAssigned,
  fulfillmentLevel,
} from './assignments';
import type { Assignment } from '../types';

describe('toggleAssignment / isAssigned', () => {
  it('adds a staff to an empty slot', () => {
    const next = toggleAssignment([], '2026-06-01', 'early', 'p1');
    expect(isAssigned(next, '2026-06-01', 'early', 'p1')).toBe(true);
  });
  it('removes a staff already assigned', () => {
    const start: Assignment[] = [{ date: '2026-06-01', slot: 'early', staffIds: ['p1'] }];
    const next = toggleAssignment(start, '2026-06-01', 'early', 'p1');
    expect(isAssigned(next, '2026-06-01', 'early', 'p1')).toBe(false);
  });
  it('keeps other staff in the same slot', () => {
    const start: Assignment[] = [{ date: '2026-06-01', slot: 'early', staffIds: ['p1', 'p2'] }];
    const next = toggleAssignment(start, '2026-06-01', 'early', 'p1');
    expect(isAssigned(next, '2026-06-01', 'early', 'p2')).toBe(true);
  });
});

describe('countAssigned', () => {
  it('counts staff in a date+slot', () => {
    const a: Assignment[] = [{ date: '2026-06-01', slot: 'early', staffIds: ['p1', 'p2'] }];
    expect(countAssigned(a, '2026-06-01', 'early')).toBe(2);
    expect(countAssigned(a, '2026-06-01', 'late')).toBe(0);
  });
});

describe('fulfillmentLevel', () => {
  it('flags low when below minimum', () => {
    expect(fulfillmentLevel(1)).toBe('low'); // MIN=2
  });
  it('flags ok within range', () => {
    expect(fulfillmentLevel(3)).toBe('ok');
  });
  it('flags over above maximum', () => {
    expect(fulfillmentLevel(5)).toBe('over'); // MAX=4
  });
});
