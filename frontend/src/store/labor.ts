import type { Assignment, Staff, WorkSlot } from '../types';
import { WORK_SLOTS, SLOT_HOURS, HOURLY_WAGE } from '../constants';
import { isAssigned } from './assignments';

/**
 * 'HH:MM'（'24:00' を含む）を分に変換。不正なら null。
 * 'H:MM'（1桁時）も寛容に受け付ける。
 */
function parseHHMM(value: string | null | undefined): number | null {
  if (!value) return null;
  if (value === '24:00') return 24 * 60;
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * 1割当の実労働時間。startTime/endTime が両方有効ならその差分（時間）を返し、
 * 片方でも欠けていれば slotHours[slot] へフォールバックする。
 * （シフト確定時の任意時間 9:00-13:00 や 4:00-19:00 を集計に反映するため。）
 */
function assignmentHours(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  slot: WorkSlot,
  slotHours: Record<WorkSlot, number>,
): number {
  const start = parseHHMM(startTime);
  const end = parseHHMM(endTime);
  if (start !== null && end !== null && end > start) {
    return (end - start) / 60;
  }
  return slotHours[slot];
}

/** 指定日の総労働時間（割当ごとの startTime/endTime を優先、無ければ slotHours で補う）。 */
export function dailyWorkHours(
  assignments: Assignment[],
  date: string,
  slotHours: Record<WorkSlot, number> = SLOT_HOURS,
): number {
  let hours = 0;
  for (const slot of WORK_SLOTS) {
    const a = assignments.find((x) => x.date === date && x.slot === slot);
    if (!a) continue;
    for (let i = 0; i < a.staffIds.length; i += 1) {
      hours += assignmentHours(a.startTimes?.[i], a.endTimes?.[i], slot, slotHours);
    }
  }
  return hours;
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
  const wageById = staff
    ? new Map(staff.map((s) => [s.id, s.hourlyWage ?? HOURLY_WAGE]))
    : null;
  let cost = 0;
  for (const slot of WORK_SLOTS) {
    const a = assignments.find((x) => x.date === date && x.slot === slot);
    if (!a) continue;
    for (let i = 0; i < a.staffIds.length; i += 1) {
      const hours = assignmentHours(a.startTimes?.[i], a.endTimes?.[i], slot, slotHours);
      const wage = wageById?.get(a.staffIds[i]) ?? HOURLY_WAGE;
      cost += hours * wage;
    }
  }
  return cost;
}

/** 指定スタッフの月間労働時間（割当ごとの startTime/endTime を優先、無ければ slotHours で補う）。 */
export function staffMonthlyHours(
  assignments: Assignment[],
  staffId: string,
  dates: string[],
  slotHours: Record<WorkSlot, number> = SLOT_HOURS,
): number {
  const dateSet = new Set(dates);
  let hours = 0;
  for (const a of assignments) {
    if (!dateSet.has(a.date)) continue;
    const idx = a.staffIds.indexOf(staffId);
    if (idx < 0) continue;
    hours += assignmentHours(a.startTimes?.[idx], a.endTimes?.[idx], a.slot, slotHours);
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
