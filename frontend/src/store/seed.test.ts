import { describe, it, expect } from 'vitest';
import { createSeedData } from './seed';

describe('createSeedData', () => {
  it('creates the three Akiyume stores', () => {
    const data = createSeedData();
    const names = data.stores.map((s) => s.name);
    expect(names).toEqual(['中島店', '新田店', '早島店']);
  });

  it('assigns several staff to every store', () => {
    const data = createSeedData();
    for (const store of data.stores) {
      const count = data.staff.filter((s) => s.storeId === store.id).length;
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });

  it('gives every staff a unique id', () => {
    const data = createSeedData();
    const ids = data.staff.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts with no requests or assignments', () => {
    const data = createSeedData();
    expect(data.requests).toEqual([]);
    expect(data.assignments).toEqual([]);
  });
});
