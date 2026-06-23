import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedView } from './SharedView';

vi.mock('../store/AppContext', () => ({
  useApp: () => ({
    me: { id: 2, name: '田中太郎', role: 'STAFF', storeId: 1 },
    storeId: 1,
    staff: [{
      id: '2', name: '田中太郎', storeId: '1', employmentType: 'パート',
      role: 'STAFF', rank: 3, skills: [],
    }],
    assignments: [{
      date: '2026-07-01',
      slot: 'early',
      staffIds: ['2'],
    }],
    requests: [],
    dayNotes: [],
  }),
}));

describe('SharedView', () => {
  beforeEach(() => localStorage.clear());

  it('公開済みのとき、自分のシフト表（マトリクス）を表示する', () => {
    render(<SharedView year={2026} month={7} />);

    // 自分のスタッフ行 (名前は1セルに出る)
    expect(screen.getByText('田中太郎')).toBeInTheDocument();
    // 案内文（公開待ち）が出ていない
    expect(screen.queryByText('店長が確定したシフトは、公開後に表示されます。')).not.toBeInTheDocument();
  });

  it('未公開のときは案内文を出して表を表示しない', () => {
    localStorage.setItem('akiyume-shift-status:1:2026-07', JSON.stringify('CONFIRMED'));
    render(<SharedView year={2026} month={7} />);

    expect(screen.getByText('店長が確定したシフトは、公開後に表示されます。')).toBeInTheDocument();
    expect(screen.queryByText('田中太郎')).not.toBeInTheDocument();
  });
});
