import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShiftToolbar } from './ShiftToolbar';

function renderToolbar(overrides = {}) {
  const props = {
    stores: [{ id: '1', name: '中島店' }],
    storeId: '1',
    positions: ['ホール', 'キッチン'],
    position: 'ホール',
    view: 'month' as const,
    periodLabel: '2026年7月',
    deadlineLabel: '〜前月末 23:59',
    unconfirmedCount: 3,
    recruitmentCount: 1,
    onStoreChange: vi.fn(),
    onPositionChange: vi.fn(),
    onViewChange: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onConfirm: vi.fn(),
    onPrint: vi.fn(),
    onOpenShiftTypes: vi.fn(),
    onOpenDisplayItems: vi.fn(),
    onOpenRecruitment: vi.fn(),
    ...overrides,
  };
  render(<ShiftToolbar {...props} />);
  return props;
}

describe('ShiftToolbar', () => {
  it('資料と同じ操作を2段で表示する', () => {
    renderToolbar();

    expect(screen.getByRole('combobox', { name: '店舗' })).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: 'ポジション' })).toHaveValue('ホール');
    expect(screen.getByRole('button', { name: 'シフト確定 未確定あり 3件' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '印刷' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'シフトの種類' })).toBeInTheDocument();
    expect(screen.getByText('2026年7月')).toBeInTheDocument();
    expect(screen.getByText('提出期限 〜前月末 23:59')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '追加募集中 1件' })).toBeInTheDocument();
  });

  it('表示単位を切り替える', async () => {
    const user = userEvent.setup();
    const props = renderToolbar();

    await user.click(screen.getByRole('button', { name: '半月' }));
    expect(props.onViewChange).toHaveBeenCalledWith('half-month');
  });

  it('期間移動と確定・印刷を実行する', async () => {
    const user = userEvent.setup();
    const props = renderToolbar();

    await user.click(screen.getByRole('button', { name: '前へ' }));
    await user.click(screen.getByRole('button', { name: '次へ' }));
    await user.click(screen.getByRole('button', { name: /シフト確定/ }));
    await user.click(screen.getByRole('button', { name: '印刷' }));

    expect(props.onPrevious).toHaveBeenCalledOnce();
    expect(props.onNext).toHaveBeenCalledOnce();
    expect(props.onConfirm).toHaveBeenCalledOnce();
    expect(props.onPrint).toHaveBeenCalledOnce();
  });
});
