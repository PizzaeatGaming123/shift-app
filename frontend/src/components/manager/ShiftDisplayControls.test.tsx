import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShiftDisplayControls } from './ShiftDisplayControls';
import { DEFAULT_SHIFT_LAYERS } from './types';

function renderControls(overrides = {}) {
  const props = {
    position: 'キッチン',
    layers: DEFAULT_SHIFT_LAYERS,
    density: 'standard' as const,
    sortMode: 'default' as const,
    onLayersChange: vi.fn(),
    onDensityChange: vi.fn(),
    onSortChange: vi.fn(),
    onBulkAction: vi.fn(),
    onCopyPast: vi.fn(),
    ...overrides,
  };
  render(<ShiftDisplayControls {...props} />);
  return props;
}

describe('ShiftDisplayControls', () => {
  it('資料と同じ順序で表示項目を並べる', () => {
    renderControls();

    expect(
      screen.getAllByRole('checkbox').map((input) => input.parentElement?.textContent?.trim()),
    ).toEqual([
      '上部固定',
      '出勤者のみ',
      'シフトパターン',
      '希望シフト',
      'タスク',
      '勤務メモ',
      '集計',
    ]);
    expect(screen.getByRole('button', { name: '一括操作' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '過去コピー' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'スタッフ並び替え 標準' })).toBeInTheDocument();
  });

  it('希望シフト表示を切り替える', async () => {
    const user = userEvent.setup();
    const props = renderControls();

    await user.click(screen.getByRole('checkbox', { name: '希望シフト' }));
    expect(props.onLayersChange).toHaveBeenCalledWith({
      ...DEFAULT_SHIFT_LAYERS,
      showRequests: false,
    });
  });

  it('表示サイズと並び順を循環する', async () => {
    const user = userEvent.setup();
    const props = renderControls();

    await user.click(screen.getByRole('button', { name: '縮小/拡大 標準' }));
    await user.click(screen.getByRole('button', { name: 'スタッフ並び替え 標準' }));

    expect(props.onDensityChange).toHaveBeenCalledWith('large');
    expect(props.onSortChange).toHaveBeenCalledWith('name');
  });
});
