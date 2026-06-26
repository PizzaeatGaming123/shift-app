/**
 * 前月の曜日パターンから今月の各日付に値を割り当てるユーティリティ。
 *
 * - prevItems を曜日（0=Sun..6=Sat）ごとにグループ化し、それぞれの最頻値を選ぶ。
 *   同数の場合は「より新しい日付」の値を優先する（直近の希望/シフトを尊重する）。
 * - targetDates の各日付について、同じ曜日のモード値を返す。該当データが無い
 *   日付は undefined。呼び出し側で「触らない」「skip」などのデフォルト処理を行う。
 *
 * 入力アイテムは `{ date: 'YYYY-MM-DD', ... }` のような形を想定し、`date` フィールド
 * は型 T 上に存在することを利用側が保証する（型エラーを避けるため `any` キャストで読み取り）。
 */
export function previousMonthByWeekday<T>(
  prevItems: T[],
  targetDates: string[],
  getValue: (item: T) => string | null | undefined,
): Record<string, string | undefined> {
  const byWeekday = new Map<number, { date: string; value: string }[]>();
  for (const item of prevItems) {
    const value = getValue(item);
    if (value == null) continue;
    const date = (item as unknown as { date: string }).date;
    if (typeof date !== 'string') continue;
    const weekday = new Date(`${date}T00:00:00`).getDay();
    const list = byWeekday.get(weekday) ?? [];
    list.push({ date, value });
    byWeekday.set(weekday, list);
  }

  const modeByWeekday = new Map<number, string>();
  for (const [weekday, items] of byWeekday) {
    // 新しい日付を先頭に並べる：同数最頻のときに「最新」を選ぶ取り扱いに使う。
    items.sort((a, b) => b.date.localeCompare(a.date));
    const counts = new Map<string, number>();
    for (const it of items) counts.set(it.value, (counts.get(it.value) ?? 0) + 1);
    // 走査は新しい順。最初に「現時点の最大」を上回ったものを採用するので、
    // 同数のときは最初に出現するもの＝最新の日付の値が残る。
    let bestValue = items[0].value;
    let bestCount = 0;
    for (const it of items) {
      const c = counts.get(it.value) ?? 0;
      if (c > bestCount) {
        bestCount = c;
        bestValue = it.value;
      }
    }
    modeByWeekday.set(weekday, bestValue);
  }

  const result: Record<string, string | undefined> = {};
  for (const date of targetDates) {
    const weekday = new Date(`${date}T00:00:00`).getDay();
    result[date] = modeByWeekday.get(weekday);
  }
  return result;
}
