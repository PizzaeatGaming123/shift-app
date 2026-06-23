export type ShiftPlanStatus =
  | 'DRAFT'
  | 'ADJUSTING'
  | 'CONFIRMED'
  | 'PUBLISHED'
  | 'CHANGING'
  | 'REPUBLISHED';

export function shiftStatusSettingKey(
  storeId: string | number | null,
  month: string,
): string {
  return `akiyume-shift-status:${storeId ?? 'default'}:${month}`;
}
