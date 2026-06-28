import type { RequestSlot } from '../../types';

export type ManagerView = 'day' | 'week' | 'half-month' | 'month';
export type ShiftTableDensity = 'small' | 'standard' | 'large';
export type StaffSortMode = 'default' | 'name' | 'hours';

export interface ShiftLayerVisibility {
  pinHeader: boolean;
  onlyAssigned: boolean;
  showPatterns: boolean;
  showRequests: boolean;
  showTasks: boolean;
  showNotes: boolean;
  showSummary: boolean;
  visibleSlots: Record<RequestSlot, boolean>;
}

export const DEFAULT_SHIFT_LAYERS: ShiftLayerVisibility = {
  pinHeader: false,
  onlyAssigned: false,
  showPatterns: true,
  showRequests: true,
  showTasks: true,
  showNotes: true,
  showSummary: true,
  visibleSlots: {
    early: true,
    late: true,
    any: true,
    off: true,
  },
};
