import { describe, it, expect, beforeEach } from 'vitest';
import { loadData, saveData } from './storage';
import type { AppData } from '../types';

const sample: AppData = {
  stores: [{ id: 's1', name: '中島店' }],
  staff: [{ id: 'p1', name: '田中', storeId: 's1', employmentType: 'パート' }],
  requests: [{ staffId: 'p1', date: '2026-06-01', slot: 'early' }],
  assignments: [{ date: '2026-06-01', slot: 'early', staffIds: ['p1'] }],
};

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing saved', () => {
    expect(loadData()).toBeNull();
  });

  it('round-trips saved data', () => {
    saveData(sample);
    expect(loadData()).toEqual(sample);
  });

  it('returns null for corrupt JSON', () => {
    localStorage.setItem('akiyume-shift-app-v1', '{not json');
    expect(loadData()).toBeNull();
  });
});
