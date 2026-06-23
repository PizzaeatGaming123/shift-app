import type { ShiftRequest, DayRequestValue } from '../types';

export function getDayRequest(
  requests: ShiftRequest[],
  staffId: string,
  date: string
): DayRequestValue {
  const slots = requests
    .filter((r) => r.staffId === staffId && r.date === date)
    .map((r) => r.slot);
  if (slots.includes('off')) return 'off';
  if (slots.includes('any')) return 'any';
  if (slots.includes('early')) return 'early';
  if (slots.includes('late')) return 'late';
  return 'none';
}

export function setDayRequest(
  requests: ShiftRequest[],
  staffId: string,
  date: string,
  value: DayRequestValue
): ShiftRequest[] {
  // 対象 staff+date の既存レコードを除去してから付け直す（冪等）
  const others = requests.filter((r) => !(r.staffId === staffId && r.date === date));
  const added: ShiftRequest[] = [];
  if (value === 'early') added.push({ staffId, date, slot: 'early' });
  if (value === 'late') added.push({ staffId, date, slot: 'late' });
  if (value === 'any') added.push({ staffId, date, slot: 'any' });
  if (value === 'off') added.push({ staffId, date, slot: 'off' });
  return [...others, ...added];
}
