import type { Assignment, Staff, WorkSlot } from '../types';
import { WORK_SLOTS, SLOT_HOURS, HOURLY_WAGE } from '../constants';
import { isAssigned, countAssigned } from './assignments';

/** 指定日の総労働時間（全スロットの割り当て人数 × 1コマの時間） */
export function dailyWorkHours(
  assignments: Assignment[],
  date: string,
  slotHours: Record<WorkSlot, number> = SLOT_HOURS,
): number {
  return WORK_SLOTS.reduce(
    (sum, slot) => sum + countAssigned(assignments, date, slot) * slotHours[slot],
    0,
  );
}

/**
 * 指定日の予定人件費。
 * staff が与えられた場合は本人の時給（hourlyWage）で集計し、時給が null（権限分離で
 * 隠されている／未設定）のときだけ HOURLY_WAGE 既定値で補う。
 * 互換のため staff を省略した場合は従来通り全員 HOURLY_WAGE で計算する。
 */
export function dailyLaborCost(
  assignments: Assignment[],
  date: string,
  slotHours: Record<WorkSlot, number> = SLOT_HOURS,
  staff?: Staff[],
): number {
  if (!staff || staff.length === 0) {
    return dailyWorkHours(assignments, date, slotHours) * HOURLY_WAGE;
  }
  const wageById = new Map(staff.map((s) => [s.id, s.hourlyWage ?? HOURLY_WAGE]));
  let cost = 0;
  for (const slot of WORK_SLOTS) {
    const a = assignments.find((x) => x.date === date && x.slot === slot);
    for (const id of a?.staffIds ?? []) {
      cost += slotHours[slot] * (wageById.get(id) ?? HOURLY_WAGE);
    }
  }
  return cost;
}

/** 指定スタッフの月間労働時間（割り当てベース） */
export function staffMonthlyHours(
  assignments: Assignment[],
  staffId: string,
  dates: string[],
  slotHours: Record<WorkSlot, number> = SLOT_HOURS,
): number {
  let hours = 0;
  for (const date of dates) {
    for (const slot of WORK_SLOTS) {
      if (isAssigned(assignments, date, slot, staffId)) hours += slotHours[slot];
    }
  }
  return hours;
}

/** 指定スタッフが連続して割り当てられている最長日数（労務アラート用） */
export function maxConsecutiveAssignedDays(
  assignments: Assignment[],
  staffId: string,
  dates: string[],
): number {
  let run = 0;
  let max = 0;
  for (const date of dates) {
    const assigned = WORK_SLOTS.some((slot) => isAssigned(assignments, date, slot, staffId));
    if (assigned) {
      run += 1;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}
