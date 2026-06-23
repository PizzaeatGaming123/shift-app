import { describe, expect, it } from 'vitest';
import type {
  Assignment,
  DayNote,
  ShiftRequest,
  Staff,
} from '../../types';
import {
  formatDuration,
  getDailySummary,
  getManagerDateWindow,
  getShiftCellModel,
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

const requests: ShiftRequest[] = [
  { staffId: '1', date: '2026-07-01', slot: 'early' },
];

const notes: DayNote[] = [
  { staffId: '1', date: '2026-07-01', text: '早番大丈夫です！' },
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

describe('getShiftCellModel', () => {
  it('希望・確定・勤務メモを別の表示層として返す', () => {
    expect(getShiftCellModel({
      staffId: '1',
      date: '2026-07-01',
      requests,
      assignments,
      notes,
    })).toEqual({
      request: { slot: 'early', label: '早番', time: '7:00-16:00' },
      assignment: { slot: 'early', label: '早番', time: '7:00-16:00' },
      note: '早番大丈夫です！',
    });
  });

  it('休み希望は勤務時刻を持たない', () => {
    expect(getShiftCellModel({
      staffId: '1',
      date: '2026-07-03',
      requests: [{ staffId: '1', date: '2026-07-03', slot: 'off' }],
      assignments,
      notes,
    }).request).toEqual({
      slot: 'off',
      label: '休み',
      time: null,
    });
  });
});

describe('getDailySummary', () => {
  it('売上・労働時間・人件費・人時売上高・ランク計を算出する', () => {
    expect(getDailySummary({
      date: '2026-07-01',
      assignments,
      staff,
      salesTarget: 90000,
    })).toEqual({
      sales: 90000,
      workHours: 18,
      laborCost: 19800,
      laborCostRate: 22,
      salesPerHour: 5000,
      rankTotal: 8,
    });
  });
});
