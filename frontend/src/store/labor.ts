import type { Assignment } from '../types';
import { WORK_SLOTS, SLOT_HOURS, HOURLY_WAGE } from '../constants';
import { isAssigned, countAssigned } from './assignments';

/** 指定日の総労働時間（全スロットの割り当て人数 × 1コマの時間） */
export function dailyWorkHours(assignments: Assignment[], date: string): number {
  return WORK_SLOTS.reduce(
    (sum, slot) => sum + countAssigned(assignments, date, slot) * SLOT_HOURS[slot],
    0,
  );
}

/** 指定日の人件費の目安（総労働時間 × 仮時給） */
export function dailyLaborCost(assignments: Assignment[], date: string): number {
  return dailyWorkHours(assignments, date) * HOURLY_WAGE;
}

/** 指定スタッフの月間労働時間（割り当てベース） */
export function staffMonthlyHours(
  assignments: Assignment[],
  staffId: string,
  dates: string[],
): number {
  let hours = 0;
  for (const date of dates) {
    for (const slot of WORK_SLOTS) {
      if (isAssigned(assignments, date, slot, staffId)) hours += SLOT_HOURS[slot];
    }
  }
  return hours;
}
