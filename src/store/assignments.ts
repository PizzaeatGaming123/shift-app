import type { Assignment, WorkSlot } from '../types';
import { MIN_STAFF_PER_SLOT, MAX_STAFF_PER_SLOT } from '../constants';

export type FulfillmentLevel = 'low' | 'ok' | 'over';

function find(assignments: Assignment[], date: string, slot: WorkSlot): Assignment | undefined {
  return assignments.find((a) => a.date === date && a.slot === slot);
}

export function isAssigned(
  assignments: Assignment[],
  date: string,
  slot: WorkSlot,
  staffId: string
): boolean {
  return find(assignments, date, slot)?.staffIds.includes(staffId) ?? false;
}

export function toggleAssignment(
  assignments: Assignment[],
  date: string,
  slot: WorkSlot,
  staffId: string
): Assignment[] {
  const existing = find(assignments, date, slot);
  if (!existing) {
    return [...assignments, { date, slot, staffIds: [staffId] }];
  }
  const has = existing.staffIds.includes(staffId);
  const nextIds = has
    ? existing.staffIds.filter((id) => id !== staffId)
    : [...existing.staffIds, staffId];
  return assignments.map((a) =>
    a === existing ? { ...a, staffIds: nextIds } : a
  );
}

export function countAssigned(
  assignments: Assignment[],
  date: string,
  slot: WorkSlot
): number {
  return find(assignments, date, slot)?.staffIds.length ?? 0;
}

export function fulfillmentLevel(count: number): FulfillmentLevel {
  if (count < MIN_STAFF_PER_SLOT) return 'low';
  if (count > MAX_STAFF_PER_SLOT) return 'over';
  return 'ok';
}
