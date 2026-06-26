/** 月労働時間上限に対する達成度合いを段階分類した結果。
 *  - 'none'   : 上限が設定されていない（警告なし）
 *  - 'normal' : 80% 未満
 *  - 'soft'   : 80% 以上 95% 未満
 *  - 'medium' : 95% 以上 100% 以下
 *  - 'hard'   : 100% 超過
 */
export type HourLimitLevel = 'none' | 'normal' | 'soft' | 'medium' | 'hard';

/** 月の労働時間と上限から警告レベルを決める。
 *  限度が null/undefined/0以下なら 'none'。 */
export function hourLimitLevel(hours: number, limit: number | null | undefined): HourLimitLevel {
  if (limit == null || limit <= 0) return 'none';
  const ratio = hours / limit;
  if (ratio > 1.0) return 'hard';
  if (ratio >= 0.95) return 'medium';
  if (ratio >= 0.80) return 'soft';
  return 'normal';
}
