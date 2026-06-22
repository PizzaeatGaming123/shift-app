export type EmploymentType = '正社員' | 'パート';

/** 勤務できる時間帯 */
export type WorkSlot = 'early' | 'mid' | 'late'; // 早番 / 中番 / 遅番

/** 希望の値（none = 未提出, off = 休み希望） */
export type DayRequestValue = 'none' | 'early' | 'mid' | 'late' | 'off';

/** 1レコードの希望スロット（off を含む） */
export type RequestSlot = WorkSlot | 'off';

/** マトリクスで表示する区分のオン/オフ（シフトの種類フィルタ） */
export type SlotVisibility = Record<RequestSlot, boolean>;

export interface Store {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  name: string;
  storeId: string;
  employmentType: EmploymentType;
  rank: number | null;
  skills: string[];
}

export interface ShiftRequest {
  staffId: string;
  date: string; // 'YYYY-MM-DD'
  slot: RequestSlot;
}

export interface Assignment {
  date: string; // 'YYYY-MM-DD'
  slot: WorkSlot;
  staffIds: string[];
}

/** スタッフの日次ひとことメモ */
export interface DayNote {
  staffId: string;
  date: string; // 'YYYY-MM-DD'
  text: string;
}

/** 店長の店舗メモ（日ごと） */
export interface StoreNote {
  date: string; // 'YYYY-MM-DD'
  text: string;
}

export interface AppData {
  stores: Store[];
  staff: Staff[];
  requests: ShiftRequest[];
  assignments: Assignment[];
}
