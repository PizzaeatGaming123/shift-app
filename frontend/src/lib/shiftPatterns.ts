import type { WorkSlot } from '../types';

export interface ShiftPattern {
  label: string;
  start: string;
  end: string;
}

export type ShiftPatterns = Record<WorkSlot, ShiftPattern>;

export const DEFAULT_SHIFT_PATTERNS: ShiftPatterns = {
  early: { label: '早番', start: '07:00', end: '16:00' },
  late: { label: '遅番', start: '15:00', end: '24:00' },
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;

function toMinutes(value: string): number {
  if (value === '24:00') return 24 * 60;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function isValidShiftPattern(pattern: ShiftPattern): boolean {
  return pattern.label.trim().length > 0
    && TIME_PATTERN.test(pattern.start)
    && TIME_PATTERN.test(pattern.end)
    && pattern.start !== '24:00'
    && toMinutes(pattern.end) > toMinutes(pattern.start);
}

export function shiftPatternHours(pattern: ShiftPattern): number {
  if (!isValidShiftPattern(pattern)) return 0;
  return (toMinutes(pattern.end) - toMinutes(pattern.start)) / 60;
}

export function normalizeShiftPatterns(value: unknown): ShiftPatterns {
  if (!value || typeof value !== 'object') return DEFAULT_SHIFT_PATTERNS;
  const candidate = value as Partial<ShiftPatterns>;
  return {
    early: candidate.early && isValidShiftPattern(candidate.early)
      ? { ...candidate.early, label: candidate.early.label.trim() }
      : DEFAULT_SHIFT_PATTERNS.early,
    late: candidate.late && isValidShiftPattern(candidate.late)
      ? { ...candidate.late, label: candidate.late.label.trim() }
      : DEFAULT_SHIFT_PATTERNS.late,
  };
}

export function shiftPatternSettingKey(storeId: string | number | null): string {
  return `akiyume-shift-patterns:${storeId ?? 'default'}`;
}
