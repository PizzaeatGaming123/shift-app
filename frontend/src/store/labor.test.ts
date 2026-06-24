import { describe, it, expect } from 'vitest';
import {
  dailyWorkHours, dailyLaborCost, staffMonthlyHours, dailyRankTotal, maxConsecutiveAssignedDays,
} from './labor';
import type { Assignment, Staff } from '../types';

const A: Assignment[] = [
  { date: '2026-07-01', slot: 'early', staffIds: ['1', '2'] },
  { date: '2026-07-01', slot: 'late', staffIds: ['3'] },
  { date: '2026-07-02', slot: 'early', staffIds: ['1'] },
];

const STAFF: Staff[] = [
  { id: '1', name: 'A', storeId: '1', employmentType: '正社員', role: 'STAFF', rank: 5, skills: [], hourlyWage: null },
  { id: '2', name: 'B', storeId: '1', employmentType: 'パート', role: 'STAFF', rank: 3, skills: [], hourlyWage: null },
  { id: '3', name: 'C', storeId: '1', employmentType: 'パート', role: 'STAFF', rank: 2, skills: [], hourlyWage: null },
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

  it('dailyRankTotal: 割り当てスタッフのランクを合計する', () => {
    // 2026-07-01: early[1(rank5),2(rank3)] + late[3(rank2)] = 10
    expect(dailyRankTotal(A, STAFF, '2026-07-01')).toBe(10);
    expect(dailyRankTotal(A, STAFF, '2026-07-02')).toBe(5);
    expect(dailyRankTotal(A, STAFF, '2026-07-03')).toBe(0);
  });

  it('maxConsecutiveAssignedDays: 連続割り当ての最長日数を返す', () => {
    // staff '1': 07-01, 07-02 連続 → 2、03は無し
    expect(maxConsecutiveAssignedDays(A, '1', ['2026-07-01', '2026-07-02', '2026-07-03'])).toBe(2);
    expect(maxConsecutiveAssignedDays(A, '3', ['2026-07-01', '2026-07-02', '2026-07-03'])).toBe(1);
    expect(maxConsecutiveAssignedDays(A, '99', ['2026-07-01'])).toBe(0);
  });
});
