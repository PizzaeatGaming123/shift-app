import { describe, it, expect } from 'vitest';
import { appReducer, type Action } from './reducer';
import type { AppData } from '../types';
import { getDayRequest } from './requests';
import { isAssigned } from './assignments';

const base: AppData = {
  stores: [{ id: 's1', name: '中島店' }],
  staff: [{ id: 'p1', name: '田中', storeId: 's1', employmentType: 'パート' }],
  requests: [],
  assignments: [],
};

describe('appReducer', () => {
  it('SET_DAY_REQUEST updates a staff request', () => {
    const action: Action = {
      type: 'SET_DAY_REQUEST',
      staffId: 'p1',
      date: '2026-06-01',
      value: 'both',
    };
    const next = appReducer(base, action);
    expect(getDayRequest(next.requests, 'p1', '2026-06-01')).toBe('both');
  });

  it('TOGGLE_ASSIGNMENT adds and removes', () => {
    const add: Action = { type: 'TOGGLE_ASSIGNMENT', date: '2026-06-01', slot: 'early', staffId: 'p1' };
    const afterAdd = appReducer(base, add);
    expect(isAssigned(afterAdd.assignments, '2026-06-01', 'early', 'p1')).toBe(true);
    const afterRemove = appReducer(afterAdd, add);
    expect(isAssigned(afterRemove.assignments, '2026-06-01', 'early', 'p1')).toBe(false);
  });

  it('REPLACE_ALL swaps the whole dataset', () => {
    const replacement: AppData = { ...base, stores: [{ id: 's9', name: '早島店' }] };
    const next = appReducer(base, { type: 'REPLACE_ALL', data: replacement });
    expect(next.stores[0].name).toBe('早島店');
  });

  it('does not mutate the previous state', () => {
    appReducer(base, { type: 'SET_DAY_REQUEST', staffId: 'p1', date: '2026-06-01', value: 'early' });
    expect(base.requests).toHaveLength(0);
  });
});
