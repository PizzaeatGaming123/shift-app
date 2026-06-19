export type EmploymentType = '正社員' | 'パート';

/** 勤務できる時間帯 */
export type WorkSlot = 'early' | 'late'; // 早番 / 遅番

/** 希望の値（none = 未提出, both = 早番+遅番, off = 休み希望） */
export type DayRequestValue = 'none' | 'early' | 'late' | 'both' | 'off';

/** 1レコードの希望スロット（off を含む） */
export type RequestSlot = WorkSlot | 'off';

export interface Store {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  name: string;
  storeId: string;
  employmentType: EmploymentType;
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

export interface AppData {
  stores: Store[];
  staff: Staff[];
  requests: ShiftRequest[];
  assignments: Assignment[];
}
