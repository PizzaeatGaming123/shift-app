import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedView } from './SharedView';

const ctx = {
  shiftPlanStatus: 'DRAFT' as
    | 'DRAFT' | 'ADJUSTING' | 'CONFIRMED' | 'PUBLISHED' | 'CHANGING' | 'REPUBLISHED',
};

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
    shiftPlanStatus: ctx.shiftPlanStatus,
    setShiftPlanStatus: vi.fn(),
  }),
}));

describe('SharedView', () => {
  beforeEach(() => {
    localStorage.clear();
    ctx.shiftPlanStatus = 'DRAFT';
  });

  it('公開済みのとき、自分のシフト表（マトリクス）を表示する', () => {
    ctx.shiftPlanStatus = 'PUBLISHED';
    render(<SharedView year={2026} month={7} />);

    expect(screen.getByText('田中太郎')).toBeInTheDocument();
    expect(screen.queryByText('店長が確定したシフトは、公開後に表示されます。')).not.toBeInTheDocument();
  });

  it('未公開のときは案内文を出して表を表示しない', () => {
    ctx.shiftPlanStatus = 'CONFIRMED';
    render(<SharedView year={2026} month={7} />);

    expect(screen.getByText('店長が確定したシフトは、公開後に表示されます。')).toBeInTheDocument();
    expect(screen.queryByText('田中太郎')).not.toBeInTheDocument();
  });
});
