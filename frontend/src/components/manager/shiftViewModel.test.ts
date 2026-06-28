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
  },
  {
    id: '2',
    name: '山田花子',
    storeId: '1',
    employmentType: 'パート',
    role: 'STAFF',
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

  it('氏名順は日本語ロケールで並べる', () => {
    expect(sortShiftStaff({
      staff,
      assignments,
      dates: monthDates,
      mode: 'name',
    }).map((person) => person.name)).toEqual(['山田花子', '田中太郎']);
  });
});

describe('sortShiftStaff default mode', () => {
  const mkStaff = (id: string, name: string, employmentType: Staff['employmentType']): Staff => ({
    id,
    name,
    storeId: '1',
    employmentType,
    role: 'STAFF',
  });

  it('雇用形態を パート→正社員 の順で並べる', () => {
    const list = [
      mkStaff('s1', '田中', '正社員'),
      mkStaff('s2', '佐藤', 'パート'),
    ];
    const sorted = sortShiftStaff({ staff: list, assignments: [], dates: [], mode: 'default' });
    expect(sorted.map((s) => s.name)).toEqual(['佐藤', '田中']);
  });

  it('同区分内は氏名昇順', () => {
    const list = [
      mkStaff('s1', '田中', 'パート'),
      mkStaff('s2', '佐藤', 'パート'),
    ];
    const sorted = sortShiftStaff({ staff: list, assignments: [], dates: [], mode: 'default' });
    expect(sorted.map((s) => s.name)).toEqual(['佐藤', '田中']);
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
      assignment: {
        slot: 'early', label: '早番', time: '7:00-16:00',
        startTime: null, endTime: null,
      },
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

  it('割当に startTimes/endTimes が並列で入っていれば、その index の時間が assignment に載る', () => {
    const result = getShiftCellModel({
      staffId: '2',
      date: '2026-07-10',
      requests: [],
      assignments: [{
        date: '2026-07-10',
        slot: 'early',
        staffIds: ['1', '2'],
        startTimes: [null, '09:00'],
        endTimes: [null, '13:00'],
      }],
      notes: [],
    });
    expect(result.assignment).toEqual({
      slot: 'early',
      label: '09:00-13:00',
      time: '09:00-13:00',
      startTime: '09:00',
      endTime: '13:00',
    });
  });

  it('パートには早番/遅番のラベルを使わず、希望と割当を時間表示に切り替える', () => {
    const result = getShiftCellModel({
      staffId: '1',
      date: '2026-07-01',
      requests: [{ staffId: '1', date: '2026-07-01', slot: 'late' }],
      assignments: [{ date: '2026-07-01', slot: 'late', staffIds: ['1'] }],
      notes: [],
      employmentType: 'パート',
    });
    expect(result.request?.label).toBe('15:00-24:00');
    expect(result.assignment?.label).toBe('15:00-24:00');
  });

  it('パートでも任意時間が指定されていれば、その時間ラベルが使われる', () => {
    const result = getShiftCellModel({
      staffId: '1',
      date: '2026-07-01',
      requests: [{ staffId: '1', date: '2026-07-01', slot: 'early', startTime: '09:00', endTime: '11:00' }],
      assignments: [{ date: '2026-07-01', slot: 'early', staffIds: ['1'], startTimes: ['09:00'], endTimes: ['11:00'] }],
      notes: [],
      employmentType: 'パート',
    });
    expect(result.request?.label).toBe('09:00-11:00');
    expect(result.assignment?.label).toBe('09:00-11:00');
  });

  it('正社員には従来どおり早番/遅番のラベルを使う', () => {
    const result = getShiftCellModel({
      staffId: '1',
      date: '2026-07-01',
      requests: [{ staffId: '1', date: '2026-07-01', slot: 'late' }],
      assignments: [{ date: '2026-07-01', slot: 'late', staffIds: ['1'] }],
      notes: [],
      employmentType: '正社員',
    });
    expect(result.request?.label).toBe('遅番');
    expect(result.assignment?.label).toBe('遅番');
  });
});

describe('getDailySummary', () => {
  it('売上・労働時間・人件費・人時売上高を算出する', () => {
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
    });
  });
});
