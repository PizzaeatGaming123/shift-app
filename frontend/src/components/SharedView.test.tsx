import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedView } from './SharedView';

const toggleAssignment = vi.fn();

const ctx = {
  shiftPlanStatus: 'DRAFT' as
    | 'DRAFT' | 'ADJUSTING' | 'CONFIRMED' | 'PUBLISHED' | 'CHANGING' | 'REPUBLISHED',
  requests: [] as { staffId: string; date: string; slot: 'early' | 'late' | 'off' | 'any' }[],
  staff: [
    { id: '2', name: '田中太郎', storeId: '1', employmentType: 'パート', role: 'STAFF' },
  ] as Array<{ id: string; name: string; storeId: string; employmentType: string; role: string }>,
  assignments: [
    { date: '2026-07-01', slot: 'early' as const, staffIds: ['2'] },
  ] as Array<{ date: string; slot: 'early' | 'late'; staffIds: string[] }>,
};

vi.mock('../store/AppContext', () => ({
  useApp: () => ({
    me: { id: 2, name: '田中太郎', role: 'STAFF', storeId: 1 },
    storeId: 1,
    staff: ctx.staff,
    assignments: ctx.assignments,
    requests: ctx.requests,
    dayNotes: [],
    shiftPlanStatus: ctx.shiftPlanStatus,
    setShiftPlanStatus: vi.fn(),
    toggleAssignment,
  }),
}));

describe('SharedView', () => {
  beforeEach(() => {
    localStorage.clear();
    toggleAssignment.mockReset();
    ctx.shiftPlanStatus = 'DRAFT';
    ctx.requests = [];
    ctx.staff = [
      { id: '2', name: '田中太郎', storeId: '1', employmentType: 'パート', role: 'STAFF' },
    ];
    ctx.assignments = [
      { date: '2026-07-01', slot: 'early', staffIds: ['2'] },
    ];
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

  it('他人の行のシフトチップは <span> でクリックしてもハンドラを呼ばない', async () => {
    const user = userEvent.setup();
    ctx.shiftPlanStatus = 'PUBLISHED';
    ctx.staff = [
      { id: '2', name: '田中太郎', storeId: '1', employmentType: 'パート', role: 'STAFF' },
      { id: '3', name: '山田花子', storeId: '1', employmentType: 'パート', role: 'STAFF' },
    ];
    ctx.assignments = [
      { date: '2026-07-01', slot: 'early', staffIds: ['3'] },
    ];

    render(<SharedView year={2026} month={7} />);

    const chips = screen.getAllByText('早番', { selector: '.rk-shift-chip--assigned' });
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(chip.tagName).toBe('SPAN');
    }
    await user.click(chips[0]);
    expect(toggleAssignment).not.toHaveBeenCalled();
  });
});
