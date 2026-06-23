import {
  SLOT_LABELS,
  SLOT_TIMES,
  WORK_SLOTS,
} from '../../constants';
import {
  dailyLaborCost,
  dailyRankTotal,
  dailyWorkHours,
  staffMonthlyHours,
} from '../../store/labor';
import type {
  Assignment,
  DayNote,
  ShiftRequest,
  Staff,
  WorkSlot,
} from '../../types';
import type { ManagerView, StaffSortMode } from './types';

export interface ManagerDateWindowInput {
  monthDates: string[];
  view: ManagerView;
  anchorDate: string;
}

export interface SortShiftStaffInput {
  staff: Staff[];
  assignments: Assignment[];
  dates: string[];
  mode: StaffSortMode;
}

function mondayIndex(date: string): number {
  const weekday = new Date(`${date}T00:00:00`).getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

export function getManagerDateWindow({
  monthDates,
  view,
  anchorDate,
}: ManagerDateWindowInput): string[] {
  if (view === 'month') return monthDates;
  if (view === 'day') {
    return monthDates.includes(anchorDate) ? [anchorDate] : monthDates.slice(0, 1);
  }

  const anchorIndex = Math.max(0, monthDates.indexOf(anchorDate));
  if (view === 'half-month') {
    return anchorIndex < 15 ? monthDates.slice(0, 15) : monthDates.slice(15);
  }

  const start = Math.max(0, anchorIndex - mondayIndex(anchorDate));
  return monthDates.slice(start, start + 7);
}

export function sortShiftStaff({
  staff,
  assignments,
  dates,
  mode,
}: SortShiftStaffInput): Staff[] {
  const next = [...staff];
  if (mode === 'default') return next;
  if (mode === 'name') {
    return next.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }
  if (mode === 'rank') {
    return next.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
  }
  return next.sort(
    (a, b) =>
      staffMonthlyHours(assignments, b.id, dates)
      - staffMonthlyHours(assignments, a.id, dates),
  );
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours}:${String(minutes).padStart(2, '0')}`;
}

interface ShiftDescriptor {
  slot: WorkSlot | 'off';
  label: string;
  time: string | null;
}

export interface ShiftCellModel {
  request: ShiftDescriptor | null;
  assignment: ShiftDescriptor | null;
  note: string | null;
}

export function getShiftCellModel({
  staffId,
  date,
  requests,
  assignments,
  notes,
}: {
  staffId: string;
  date: string;
  requests: ShiftRequest[];
  assignments: Assignment[];
  notes: DayNote[];
}): ShiftCellModel {
  const request = requests.find(
    (item) => item.staffId === staffId && item.date === date,
  );
  const assignment = WORK_SLOTS.find((slot) =>
    assignments.some(
      (item) =>
        item.date === date
        && item.slot === slot
        && item.staffIds.includes(staffId),
    ),
  );
  const note = notes.find(
    (item) => item.staffId === staffId && item.date === date,
  )?.text ?? null;

  return {
    request: request
      ? {
          slot: request.slot,
          label: request.slot === 'off' ? '休み' : SLOT_LABELS[request.slot],
          time: request.slot === 'off' ? null : SLOT_TIMES[request.slot],
        }
      : null,
    assignment: assignment
      ? {
          slot: assignment,
          label: SLOT_LABELS[assignment],
          time: SLOT_TIMES[assignment],
        }
      : null,
    note,
  };
}

export interface DailySummary {
  sales: number;
  workHours: number;
  laborCost: number;
  laborCostRate: number;
  salesPerHour: number;
  rankTotal: number;
}

export function getDailySummary({
  date,
  assignments,
  staff,
  salesTarget,
}: {
  date: string;
  assignments: Assignment[];
  staff: Staff[];
  salesTarget: number;
}): DailySummary {
  const workHours = dailyWorkHours(assignments, date);
  const laborCost = dailyLaborCost(assignments, date);
  return {
    sales: salesTarget,
    workHours,
    laborCost,
    laborCostRate: salesTarget > 0
      ? Math.round((laborCost / salesTarget) * 100)
      : 0,
    salesPerHour: workHours > 0 ? Math.round(salesTarget / workHours) : 0,
    rankTotal: dailyRankTotal(assignments, staff, date),
  };
}
