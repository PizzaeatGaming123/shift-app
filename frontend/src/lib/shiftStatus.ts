import { useApp } from '../store/AppContext';

export type ShiftPlanStatus =
  | 'DRAFT'
  | 'ADJUSTING'
  | 'CONFIRMED'
  | 'PUBLISHED'
  | 'CHANGING'
  | 'REPUBLISHED';

/** 状態が「ロック（編集不可）」に該当するか。スタッフ提出画面の閉じ判定で使う。 */
export function isLockedStatus(status: ShiftPlanStatus): boolean {
  return status === 'CONFIRMED' || status === 'PUBLISHED' || status === 'REPUBLISHED';
}

/** 状態が「公開済み（スタッフへ可視）」に該当するか。 */
export function isPublishedStatus(status: ShiftPlanStatus): boolean {
  return status === 'PUBLISHED' || status === 'REPUBLISHED';
}

/**
 * backend 永続化されたシフト計画状態を返す。setter は API に同期書き込みする。
 * 旧 localStorage ベースのフックを置き換えるため、引数 (storeId/month/assignments)
 * は受け付けるが、現在のストアコンテキストに対する状態しか返さない。
 */
export function useEffectiveShiftStatus(
  _storeId: string | number | null,
  _month: string,
  _assignments: unknown[],
): [ShiftPlanStatus, (next: ShiftPlanStatus) => void] {
  const { shiftPlanStatus, setShiftPlanStatus } = useApp();
  const set = (next: ShiftPlanStatus) => {
    void setShiftPlanStatus(next);
  };
  return [shiftPlanStatus, set];
}
