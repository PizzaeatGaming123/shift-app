import { getDayRequest } from '../../store/requests';
import type { ShiftRequest } from '../../types';

export interface RequestSummary {
  total: number;
  submitted: number;
  early: number;
  late: number;
  off: number;
}

export function summarizeRequests(
  requests: ShiftRequest[],
  staffId: string,
  dates: string[],
): RequestSummary {
  let submitted = 0;
  let early = 0;
  let late = 0;
  let off = 0;

  for (const date of dates) {
    const value = getDayRequest(requests, staffId, date);
    if (value === 'none') continue;

    submitted += 1;
    if (value === 'early') early += 1;
    else if (value === 'late') late += 1;
    else if (value === 'off') off += 1;
  }

  return { total: dates.length, submitted, early, late, off };
}

