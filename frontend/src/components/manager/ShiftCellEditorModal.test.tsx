import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHIFT_PATTERNS } from '../../lib/shiftPatterns';
import { ShiftCellEditorModal } from './ShiftCellEditorModal';

const defaultProps = {
  open: true,
  staffName: '田中太郎',
  storeName: '中島店',
  position: 'ホール',
  dateLabel: '7/1(水)',
  employmentType: '正社員' as const,
  patterns: DEFAULT_SHIFT_PATTERNS,
  taskOptions: ['開店作業', '閉店作業', 'レジ'],
  isEditing: false,
  onSave: () => {},
  onClose: () => {},
};

describe('ShiftCellEditorModal', () => {
  it('open=false なら何もレンダーされない', () => {
    render(<ShiftCellEditorModal {...defaultProps} open={false} />);
    expect(screen.queryByLabelText('勤務開始時刻')).not.toBeInTheDocument();
  });

  it('initial 未指定なら 10:00-18:00 の初期値が入る', () => {
    render(<ShiftCellEditorModal {...defaultProps} />);
    expect(screen.getByLabelText('勤務開始時刻')).toHaveValue('10:00');
    expect(screen.getByLabelText('勤務終了時刻')).toHaveValue('18:00');
  });

  it('initial 指定なら既存値を反映する', () => {
    render(
      <ShiftCellEditorModal
        {...defaultProps}
        isEditing
        initial={{ startTime: '09:30', endTime: '17:30', tasks: ['レジ'], breaks: [], workMemo: 'メモ' }}
      />,
    );
    expect(screen.getByLabelText('勤務開始時刻')).toHaveValue('09:30');
    expect(screen.getByLabelText('勤務終了時刻')).toHaveValue('17:30');
    expect(screen.getByLabelText('レジ')).toBeChecked();
    expect(screen.getByDisplayValue('メモ')).toBeInTheDocument();
  });

  it('「休み」タブで保存すると mode=off で onSave が呼ばれる', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<ShiftCellEditorModal {...defaultProps} onSave={onSave} />);
    await user.click(screen.getByRole('tab', { name: '休み' }));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).toHaveBeenCalledWith({ mode: 'off', tasks: [], breaks: [], workMemo: '' });
  });

  it('正社員には「シフトパターン入力」タブが出る', () => {
    render(<ShiftCellEditorModal {...defaultProps} employmentType="正社員" />);
    expect(screen.getByRole('tab', { name: 'シフトパターン入力' })).toBeInTheDocument();
  });

  it('パートには「シフトパターン入力」タブが出ない', () => {
    render(<ShiftCellEditorModal {...defaultProps} employmentType="パート" />);
    expect(screen.queryByRole('tab', { name: 'シフトパターン入力' })).not.toBeInTheDocument();
  });

  it('isEditing=true かつ onDelete 指定で「削除」ボタンが出る', () => {
    render(<ShiftCellEditorModal {...defaultProps} isEditing onDelete={() => {}} />);
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('保存ボタンを押すと現在の時刻と slot で onSave が呼ばれる', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<ShiftCellEditorModal {...defaultProps} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'time',
      slot: 'early',
      startTime: '10:00',
      endTime: '18:00',
    }));
  });
});
