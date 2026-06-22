import { describe, expect, it } from 'vitest';
import type { Assignment, Staff } from '../../types';
import {
  formatDuration,
  getManagerDateWindow,
  sortShiftStaff,
} from './shiftViewModel';

const monthDates = Array.from(
  { length: 31 },
  (_, index) => `2026-07-${String(index + 1).padStart(2, '0')}`,
);

const staff: Staff[] = [
  {
    id: '1',
    name: '田中太郎',
    storeId: '1',
    employmentType: '正社員',
    role: 'STAFF',
    rank: 3,
    skills: [],
  },
  {
    id: '2',
    name: '山田花子',
    storeId: '1',
    employmentType: 'パート',
    role: 'STAFF',
    rank: 5,
    skills: [],
  },
];

const assignments: Assignment[] = [
  { date: '2026-07-01', slot: 'early', staffIds: ['1'] },
  { date: '2026-07-01', slot: 'late', staffIds: ['2'] },
  { date: '2026-07-02', slot: 'early', staffIds: ['2'] },
];

describe('getManagerDateWindow', () => {
  it('日表示は選択した1日を返す', () => {
    expect(getManagerDateWindow({
      monthDates,
      view: 'day',
      anchorDate: '2026-07-18',
    })).toEqual(['2026-07-18']);
  });

  it('週表示は選択日を含む月曜から日曜を返す', () => {
    expect(getManagerDateWindow({
      monthDates,
      view: 'week',
      anchorDate: '2026-07-29',
    })).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
    ]);
  });

  it('半月表示は選択日に応じて前半または後半を返す', () => {
    expect(getManagerDateWindow({
      monthDates,
      view: 'half-month',
      anchorDate: '2026-07-08',
    })).toHaveLength(15);
    expect(getManagerDateWindow({
      monthDates,
      view: 'half-month',
      anchorDate: '2026-07-20',
    })[0]).toBe('2026-07-16');
  });

  it('月表示は月内の全日付を返す', () => {
    expect(getManagerDateWindow({
      monthDates,
      view: 'month',
      anchorDate: '2026-07-18',
    })).toEqual(monthDates);
  });
});

describe('sortShiftStaff', () => {
  it('月間労働時間が長い順に並べる', () => {
    expect(sortShiftStaff({
      staff,
      assignments,
      dates: ['2026-07-01', '2026-07-02'],
      mode: 'hours',
    }).map((person) => person.id)).toEqual(['2', '1']);
  });

  it('ランクが高い順に並べる', () => {
    expect(sortShiftStaff({
      staff,
      assignments,
      dates: monthDates,
      mode: 'rank',
    }).map((person) => person.id)).toEqual(['2', '1']);
  });

  it('氏名順は日本語ロケールで並べる', () => {
    expect(sortShiftStaff({
      staff,
      assignments,
      dates: monthDates,
      mode: 'name',
    }).map((person) => person.name)).toEqual(['山田花子', '田中太郎']);
  });
});

describe('formatDuration', () => {
  it('小数時間を時:分で表示する', () => {
    expect(formatDuration(45)).toBe('45:00');
    expect(formatDuration(7.5)).toBe('7:30');
  });
});
