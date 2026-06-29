import { describe, it, expect } from 'vitest';
import {
  dailyWorkHours, dailyLaborCost, staffMonthlyHours, maxConsecutiveAssignedDays,
} from './labor';
import type { Assignment } from '../types';

const A: Assignment[] = [
  { date: '2026-07-01', slot: 'early', staffIds: ['1', '2'] },
  { date: '2026-07-01', slot: 'late', staffIds: ['3'] },
  { date: '2026-07-02', slot: 'early', staffIds: ['1'] },
];

describe('labor', () => {
  it('dailyWorkHours: 1日の割り当てコマ数×1コマ9hを合計する', () => {
    // 2026-07-01: early2人 + late1人 = 3コマ × 9h = 27h
    expect(dailyWorkHours(A, '2026-07-01')).toBe(27);
    expect(dailyWorkHours(A, '2026-07-02')).toBe(9);
    expect(dailyWorkHours(A, '2026-07-03')).toBe(0);
  });

  it('dailyLaborCost: 総労働時間×仮時給1100円', () => {
    expect(dailyLaborCost(A, '2026-07-01')).toBe(27 * 1100);
    expect(dailyLaborCost(A, '2026-07-03')).toBe(0);
  });

  it('staffMonthlyHours: スタッフの割り当てコマを月内で合計する', () => {
    // staff '1': 07-01 early(9h) + 07-02 early(9h) = 18h
    expect(staffMonthlyHours(A, '1', ['2026-07-01', '2026-07-02', '2026-07-03'])).toBe(18);
    expect(staffMonthlyHours(A, '3', ['2026-07-01', '2026-07-02'])).toBe(9);
    expect(staffMonthlyHours(A, '99', ['2026-07-01'])).toBe(0);
  });

  it('startTime/endTime が指定されていれば、その差分時間で集計する（任意時間シフト）', () => {
    // staff '1' は 07-01 に 04:00-19:00（=15h）の早番、07-02 は時間未指定で既定 9h。
    const B: Assignment[] = [
      {
        date: '2026-07-01',
        slot: 'early',
        staffIds: ['1', '2'],
        startTimes: ['04:00', null],
        endTimes: ['19:00', null],
      },
      {
        date: '2026-07-02',
        slot: 'early',
        staffIds: ['1'],
      },
    ];
    expect(staffMonthlyHours(B, '1', ['2026-07-01', '2026-07-02'])).toBe(15 + 9);
    // 同日の総労働時間: staff1=15h + staff2=既定9h = 24h
    expect(dailyWorkHours(B, '2026-07-01')).toBe(15 + 9);
    // 24:00 終わりも 1440 分として扱う
    const C: Assignment[] = [
      { date: '2026-07-03', slot: 'late', staffIds: ['1'], startTimes: ['18:00'], endTimes: ['24:00'] },
    ];
    expect(staffMonthlyHours(C, '1', ['2026-07-03'])).toBe(6);
  });

  it('maxConsecutiveAssignedDays: 連続割り当ての最長日数を返す', () => {
    // staff '1': 07-01, 07-02 連続 → 2、03は無し
    expect(maxConsecutiveAssignedDays(A, '1', ['2026-07-01', '2026-07-02', '2026-07-03'])).toBe(2);
    expect(maxConsecutiveAssignedDays(A, '3', ['2026-07-01', '2026-07-02', '2026-07-03'])).toBe(1);
    expect(maxConsecutiveAssignedDays(A, '99', ['2026-07-01'])).toBe(0);
  });
});
