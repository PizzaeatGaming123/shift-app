import type { AppData, DayRequestValue, WorkSlot } from '../types';
import { setDayRequest } from './requests';
import { toggleAssignment } from './assignments';

export type Action =
  | { type: 'SET_DAY_REQUEST'; staffId: string; date: string; value: DayRequestValue }
  | { type: 'TOGGLE_ASSIGNMENT'; date: string; slot: WorkSlot; staffId: string }
  | { type: 'REPLACE_ALL'; data: AppData };

export function appReducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'SET_DAY_REQUEST':
      return {
        ...state,
        requests: setDayRequest(state.requests, action.staffId, action.date, action.value),
      };
    case 'TOGGLE_ASSIGNMENT':
      return {
        ...state,
        assignments: toggleAssignment(state.assignments, action.date, action.slot, action.staffId),
      };
    case 'REPLACE_ALL':
      return action.data;
    default:
      return state;
  }
}
