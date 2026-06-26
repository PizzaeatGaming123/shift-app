export type EmploymentType = '正社員' | 'パート';

/** 勤務できる時間帯 */
export type WorkSlot = 'early' | 'late'; // 早番 / 遅番

/** 希望の値（none = 未提出, off = 休み希望, any = 早番/遅番どちらでも可） */
export type DayRequestValue = 'none' | 'early' | 'late' | 'any' | 'off';

/** 1レコードの希望スロット（off, any を含む） */
export type RequestSlot = WorkSlot | 'any' | 'off';

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
  role: 'STAFF' | 'MANAGER';
  rank: number | null;
  skills: string[];
  /** 時給（円）。一般スタッフのビューでは権限分離のため null/省略。 */
  hourlyWage?: number | null;
  /** 月の労働時間上限（時間）。null = 制限なし。扶養範囲などの警告に使う。 */
  monthlyHourLimit?: number | null;
}

export interface ShiftRequest {
  staffId: string;
  date: string; // 'YYYY-MM-DD'
  slot: RequestSlot;
  startTime?: string | null;
  endTime?: string | null;
}

export interface Assignment {
  date: string; // 'YYYY-MM-DD'
  slot: WorkSlot;
  staffIds: string[];
  /** staffIds と同じ index で対応する開始時刻 'HH:MM'。未指定なら slot の既定時間。 */
  startTimes?: (string | null)[];
  /** staffIds と同じ index で対応する終了時刻 'HH:MM'。未指定なら slot の既定時間。 */
  endTimes?: (string | null)[];
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

/** 追加募集（日ごと・メッセージ付き） */
export interface Recruitment {
  date: string; // 'YYYY-MM-DD'
  message: string;
}

export interface AppData {
  stores: Store[];
  staff: Staff[];
  requests: ShiftRequest[];
  assignments: Assignment[];
}
