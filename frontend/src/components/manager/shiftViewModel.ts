import {
  SLOT_LABELS,
  SLOT_TIMES,
  WORK_SLOTS,
} from '../../constants';
import {
  dailyLaborCost,
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
  /** 店舗ごとの slot あたりの時間。未指定なら既定の早9h・遅9h で集計する。 */
  slotHours?: Record<WorkSlot, number>;
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

const EMPLOYMENT_ORDER: Record<string, number> = {
  パート: 0,
  正社員: 1,
};

export function sortShiftStaff({
  staff,
  assignments,
  dates,
  mode,
  slotHours,
}: SortShiftStaffInput): Staff[] {
  const next = [...staff];
  if (mode === 'default') {
    return next.sort((a, b) => {
      const orderA = EMPLOYMENT_ORDER[a.employmentType] ?? 99;
      const orderB = EMPLOYMENT_ORDER[b.employmentType] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'ja');
    });
  }
  if (mode === 'name') {
    return next.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }
  return next.sort(
    (a, b) =>
      staffMonthlyHours(assignments, b.id, dates, slotHours)
      - staffMonthlyHours(assignments, a.id, dates, slotHours),
  );
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours}:${String(minutes).padStart(2, '0')}`;
}

interface ShiftDescriptor {
  slot: WorkSlot | 'any' | 'off';
  label: string;
  time: string | null;
}

/**
 * 割当セル用のディスクリプタ。基本は ShiftDescriptor と同じだが、パートの
 * 任意時間割当を表現するため startTime/endTime を保持する。両方セットされていれば
 * 表示は「9:00-13:00」のような時間ラベルを優先する。
 */
export interface AssignmentDescriptor extends ShiftDescriptor {
  startTime: string | null;
  endTime: string | null;
}

export interface ShiftCellModel {
  request: ShiftDescriptor | null;
  assignment: AssignmentDescriptor | null;
  note: string | null;
}

export function getShiftCellModel({
  staffId,
  date,
  requests,
  assignments,
  notes,
  employmentType,
}: {
  staffId: string;
  date: string;
  requests: ShiftRequest[];
  assignments: Assignment[];
  notes: DayNote[];
  /**
   * チップラベルの出し分けに使う。パートは「早番/遅番」のラベルを使わず常に時間表示。
   * 未指定なら 正社員 と同じ挙動（後方互換）。
   */
  employmentType?: '正社員' | 'パート';
}): ShiftCellModel {
  const request = requests.find(
    (item) => item.staffId === staffId && item.date === date,
  );
  // 該当する割当（date + slot + staffIds に staffId を含む）と、staffIds 内の index を取得する。
  // index は startTimes/endTimes（staffIds と並列の配列）から自分の時間を引くために使う。
  let assignmentSlot: WorkSlot | undefined;
  let startTime: string | null = null;
  let endTime: string | null = null;
  for (const slot of WORK_SLOTS) {
    const found = assignments.find(
      (item) => item.date === date && item.slot === slot && item.staffIds.includes(staffId),
    );
    if (found) {
      assignmentSlot = slot;
      const idx = found.staffIds.indexOf(staffId);
      startTime = found.startTimes?.[idx] ?? null;
      endTime = found.endTimes?.[idx] ?? null;
      break;
    }
  }
  const note = notes.find(
    (item) => item.staffId === staffId && item.date === date,
  )?.text ?? null;

  // チップのラベルは employmentType を問わず以下のルール:
  //   任意時間（startTime/endTime）が指定されていれば時間ラベル "HH:MM-HH:MM"
  //   未指定なら早番/遅番ラベル（slot に依存）
  void employmentType; // 現状は employmentType を使わないが、将来の拡張用に受け取る
  return {
    request: request
      ? {
          slot: request.slot,
          label: request.slot === 'off'
            ? '休み'
            : request.slot === 'any'
              ? 'どちらでも'
              : request.startTime && request.endTime
                ? `${request.startTime}-${request.endTime}`
                : SLOT_LABELS[request.slot],
          time: request.slot === 'off' || request.slot === 'any'
            ? null
            : request.startTime && request.endTime
              ? `${request.startTime}-${request.endTime}`
              : SLOT_TIMES[request.slot],
        }
      : null,
    assignment: assignmentSlot
      ? {
          slot: assignmentSlot,
          label: startTime && endTime
            ? `${startTime}-${endTime}`
            : SLOT_LABELS[assignmentSlot],
          time: startTime && endTime
            ? `${startTime}-${endTime}`
            : SLOT_TIMES[assignmentSlot],
          startTime,
          endTime,
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
}

export function getDailySummary({
  date,
  assignments,
  staff,
  salesTarget,
  slotHours,
}: {
  date: string;
  assignments: Assignment[];
  staff: Staff[];
  salesTarget: number;
  slotHours?: Record<WorkSlot, number>;
}): DailySummary {
  const workHours = dailyWorkHours(assignments, date, slotHours);
  const laborCost = dailyLaborCost(assignments, date, slotHours, staff);
  return {
    sales: salesTarget,
    workHours,
    laborCost,
    laborCostRate: salesTarget > 0
      ? Math.round((laborCost / salesTarget) * 100)
      : 0,
    salesPerHour: workHours > 0 ? Math.round(salesTarget / workHours) : 0,
  };
}
