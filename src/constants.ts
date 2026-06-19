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
