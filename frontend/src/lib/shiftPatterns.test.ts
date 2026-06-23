import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHIFT_PATTERNS,
  normalizeShiftPatterns,
  shiftPatternHours,
} from './shiftPatterns';

describe('shiftPatterns', () => {
  it('uses the interviewed early and late shift times by default', () => {
    expect(DEFAULT_SHIFT_PATTERNS.early).toEqual({
      label: '早番',
      start: '07:00',
      end: '16:00',
    });
    expect(DEFAULT_SHIFT_PATTERNS.late).toEqual({
      label: '遅番',
      start: '15:00',
      end: '24:00',
    });
  });

  it('calculates planned hours including 24:00', () => {
    expect(shiftPatternHours(DEFAULT_SHIFT_PATTERNS.early)).toBe(9);
    expect(shiftPatternHours(DEFAULT_SHIFT_PATTERNS.late)).toBe(9);
  });

  it('falls back only for invalid pattern values', () => {
    expect(normalizeShiftPatterns({
      early: { label: '朝', start: '08:00', end: '17:00' },
      late: { label: '', start: '25:00', end: '10:00' },
    })).toEqual({
      early: { label: '朝', start: '08:00', end: '17:00' },
      late: DEFAULT_SHIFT_PATTERNS.late,
    });
  });
});
