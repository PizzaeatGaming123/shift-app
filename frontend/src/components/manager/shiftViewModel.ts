import type { Assignment, Staff } from '../../types';
import { staffMonthlyHours } from '../../store/labor';
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
