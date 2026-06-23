import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedView } from './SharedView';

vi.mock('../store/AppContext', () => ({
  useApp: () => ({
    storeId: 1,
    staff: [{ id: '2', name: '田中太郎' }],
    assignments: [{
      date: '2026-07-01',
      slot: 'early',
      staffIds: ['2'],
    }],
  }),
}));

describe('SharedView', () => {
  beforeEach(() => localStorage.clear());

  it('shows existing confirmed shifts created before publication status was introduced', () => {
    render(<SharedView year={2026} month={7} />);

    expect(screen.getByText('田中太郎')).toBeInTheDocument();
    expect(screen.queryByText('店長が確定したシフトは、公開後に表示されます。')).not.toBeInTheDocument();
  });

  it('hides a newly confirmed shift until the manager publishes it', () => {
    localStorage.setItem('akiyume-shift-status:1:2026-07', JSON.stringify('CONFIRMED'));
    render(<SharedView year={2026} month={7} />);

    expect(screen.getByText('店長が確定したシフトは、公開後に表示されます。')).toBeInTheDocument();
    expect(screen.queryByText('田中太郎')).not.toBeInTheDocument();
  });
});
