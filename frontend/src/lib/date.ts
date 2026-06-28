export function formatDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function daysInMonth(year: number, month: number): number {
  // month は 1-12。Date の day=0 は前月末日を返す
  return new Date(year, month, 0).getDate();
}

export function getMonthDates(year: number, month: number): string[] {
  const total = daysInMonth(year, month);
  const dates: string[] = [];
  for (let day = 1; day <= total; day++) {
    dates.push(formatDate(year, month, day));
  }
  return dates;
}

export function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay(); // 0=Sun ... 6=Sat
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const zeroBased = month - 1 + delta;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = ((zeroBased % 12) + 12) % 12 + 1;
  return { year: newYear, month: newMonth };
}

/**
 * 'YYYY-MM' を受け取り、1か月前の 'YYYY-MM' を返す。
 * 例: '2026-01' → '2025-12'、'2026-06' → '2026-05'
 */
export function previousMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const prev = shiftMonth(year, mon, -1);
  return `${prev.year}-${String(prev.month).padStart(2, '0')}`;
}
