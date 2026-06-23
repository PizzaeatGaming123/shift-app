import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShiftTable } from './ShiftTable';
import { DEFAULT_SHIFT_LAYERS } from './types';

const staff = [
  {
    id: '1',
    name: '田中太郎',
    storeId: '1',
    employmentType: '正社員' as const,
    role: 'STAFF' as const,
    rank: 3,
    skills: [],
  },
  {
    id: '2',
    name: '山田花子',
    storeId: '1',
    employmentType: 'パート' as const,
    role: 'STAFF' as const,
    rank: 2,
    skills: [],
  },
];

const baseProps = {
  dates: ['2026-07-01', '2026-07-02'],
  staff,
  requests: [],
  assignments: [],
  notes: [],
  storeNotes: [],
  positionNotes: {},
  layers: DEFAULT_SHIFT_LAYERS,
  density: 'standard' as const,
  sortMode: 'default' as const,
  salesTarget: 90000,
  requiredByBand: () => ({ morning: 2, afternoon: 2, night: 2 }),
  onToggleAssignment: () => {},
  onStoreNoteChange: () => {},
  onPositionNoteChange: () => {},
  onSortChange: () => {},
};

describe('ShiftTable', () => {
  it('日付と曜日の列見出しを表示する', () => {
    render(<ShiftTable {...baseProps} />);

    expect(screen.getByRole('columnheader', { name: '1(水)' }))
      .toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '2(木)' }))
      .toBeInTheDocument();
  });

  it('集計をオフにすると集計行を描画しない', () => {
    render(
      <ShiftTable
        {...baseProps}
        layers={{ ...DEFAULT_SHIFT_LAYERS, showSummary: false }}
      />,
    );

    expect(screen.queryByText('売上計画')).not.toBeInTheDocument();
  });

  it('出勤者のみの表示とスタッフ並び替え操作を反映する', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(
      <ShiftTable
        {...baseProps}
        assignments={[
          { date: '2026-07-01', slot: 'early', staffIds: ['1'] },
        ]}
        layers={{ ...DEFAULT_SHIFT_LAYERS, onlyAssigned: true }}
        onSortChange={onSortChange}
      />,
    );

    expect(screen.getByText('田中太郎')).toBeInTheDocument();
    expect(screen.queryByText('山田花子')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'スタッフ並び替え 標準' }));
    expect(onSortChange).toHaveBeenCalledWith('name');
  });
});
