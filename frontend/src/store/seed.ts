import type { AppData, Staff, Store, EmploymentType } from '../types';

const STORES: Store[] = [
  { id: 's-nakashima', name: '中島店' },
  { id: 's-nitta', name: '新田店' },
  { id: 's-hayashima', name: '早島店' },
];

// 各店のサンプル要員（正社員1〜2 + パート数名）。デモが見やすい最小構成。
const STAFF_BY_STORE: Record<string, Array<{ name: string; type: EmploymentType }>> = {
  's-nakashima': [
    { name: '山田（店長）', type: '正社員' },
    { name: '佐藤', type: '正社員' },
    { name: '鈴木', type: 'パート' },
    { name: '高橋', type: 'パート' },
    { name: '田中', type: 'パート' },
  ],
  's-nitta': [
    { name: '伊藤（店長）', type: '正社員' },
    { name: '渡辺', type: '正社員' },
    { name: '中村', type: 'パート' },
    { name: '小林', type: 'パート' },
    { name: '加藤', type: 'パート' },
  ],
  's-hayashima': [
    { name: '吉田（店長）', type: '正社員' },
    { name: '山本', type: '正社員' },
    { name: '松本', type: 'パート' },
    { name: '井上', type: 'パート' },
    { name: '木村', type: 'パート' },
  ],
};

export function createSeedData(): AppData {
  const staff: Staff[] = [];
  for (const store of STORES) {
    STAFF_BY_STORE[store.id].forEach((person, index) => {
      staff.push({
        id: `${store.id}-p${index + 1}`,
        name: person.name,
        storeId: store.id,
        employmentType: person.type,
      });
    });
  }
  return { stores: STORES, staff, requests: [], assignments: [] };
}
