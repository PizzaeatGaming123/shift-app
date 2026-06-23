import type { RequiredByBand } from './ShiftTableSummaryRows';

/** 曜日ごと（0=日 .. 6=土）の時間帯バンド必要人数モデル（早番/遅番の2バンド）。 */
export interface WeekdayRequired {
  early: number[];
  late: number[];
}

export const DEFAULT_WEEKDAY_REQUIRED: WeekdayRequired = {
  early: Array(7).fill(2),
  late: Array(7).fill(2),
};

/** モデルシフト画面の編集グリッド定義。ラベルは集計行と一致させる。 */
export const MODEL_BANDS: { key: keyof WeekdayRequired; label: string }[] = [
  { key: 'early', label: '早番 7:00〜16:00' },
  { key: 'late', label: '遅番 15:00〜24:00' },
];

/** 表示用の曜日列（月→日）。値は Date.getDay() のインデックス。 */
export const WEEKDAY_COLUMNS: { index: number; label: string }[] = [
  { index: 1, label: '月' },
  { index: 2, label: '火' },
  { index: 3, label: '水' },
  { index: 4, label: '木' },
  { index: 5, label: '金' },
  { index: 6, label: '土' },
  { index: 0, label: '日' },
];

/** 指定日に適用される、その曜日の必要人数を返す。 */
export function requiredForDate(model: WeekdayRequired, date: string): RequiredByBand {
  const wd = new Date(`${date}T00:00:00`).getDay();
  return {
    early: model.early[wd] ?? 0,
    late: model.late[wd] ?? 0,
  };
}
