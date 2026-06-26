import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedView } from './SharedView';

const ctx = {
  shiftPlanStatus: 'DRAFT' as
    | 'DRAFT' | 'ADJUSTING' | 'CONFIRMED' | 'PUBLISHED' | 'CHANGING' | 'REPUBLISHED',
  requests: [] as { staffId: string; date: string; slot: 'early' | 'late' | 'off' | 'any' }[],
};

vi.mock('../store/AppContext', () => ({
  useApp: () => ({
    me: { id: 2, name: '田中太郎', role: 'STAFF', storeId: 1 },
    storeId: 1,
    staff: [{
      id: '2', name: '田中太郎', storeId: '1', employmentType: 'パート',
      role: 'STAFF',
    }],
    assignments: [{
      date: '2026-07-01',
      slot: 'early',
      staffIds: ['2'],
    }],
    requests: ctx.requests,
    dayNotes: [],
    shiftPlanStatus: ctx.shiftPlanStatus,
    setShiftPlanStatus: vi.fn(),
  }),
}));

describe('SharedView', () => {
  beforeEach(() => {
    localStorage.clear();
    ctx.shiftPlanStatus = 'DRAFT';
    ctx.requests = [];
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

  it('割り当ての無い希望日に希望（点線）チップを描画しない', () => {
    ctx.shiftPlanStatus = 'PUBLISHED';
    ctx.requests = [{ staffId: '2', date: '2026-07-02', slot: 'early' }];
    const { container } = render(<SharedView year={2026} month={7} />);

    expect(container.querySelector('.rk-shift-chip--request')).toBeNull();
  });
});
