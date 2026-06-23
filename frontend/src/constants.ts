import type { WorkSlot } from './types';

export const STORAGE_KEY = 'akiyume-shift-app-v1';

export const SLOT_LABELS: Record<WorkSlot, string> = {
  early: '早番',
  late: '遅番',
};

export const SLOT_TIMES: Record<WorkSlot, string> = {
  early: '7:00-16:00',
  late: '15:00-24:00',
};

export const WORK_SLOTS: WorkSlot[] = ['early', 'late'];

/** 各時間帯の必要人数の目安（充足判定に使用。デモ用の仮値） */
export const MIN_STAFF_PER_SLOT = 2;
export const MAX_STAFF_PER_SLOT = 4;

/** 1コマあたりの労働時間（早番 7:00-16:00 / 遅番 15:00-24:00 をデモ用に各9hとみなす） */
export const SLOT_HOURS: Record<WorkSlot, number> = { early: 9, late: 9 };

/** デモ用の仮時給（円）。日次人件費の目安算出に使用 */
export const HOURLY_WAGE = 1100;

/** デモ用の1日あたり売上計画（円）。人件費率の算出に使用 */
export const DAILY_SALES_TARGET = 90000;
