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
    expect(screen.getByLabelText('勤務開始時刻 時')).toHaveValue('10');
    expect(screen.getByLabelText('勤務開始時刻 分')).toHaveValue('00');
    expect(screen.getByLabelText('勤務終了時刻 時')).toHaveValue('18');
    expect(screen.getByLabelText('勤務終了時刻 分')).toHaveValue('00');
  });

  it('initial 指定なら既存値を反映する', () => {
    render(
      <ShiftCellEditorModal
        {...defaultProps}
        isEditing
        initial={{ startTime: '09:30', endTime: '17:30', tasks: ['レジ'], breaks: [], workMemo: 'メモ' }}
      />,
    );
    expect(screen.getByLabelText('勤務開始時刻 時')).toHaveValue('09');
    expect(screen.getByLabelText('勤務開始時刻 分')).toHaveValue('30');
    expect(screen.getByLabelText('勤務終了時刻 時')).toHaveValue('17');
    expect(screen.getByLabelText('勤務終了時刻 分')).toHaveValue('30');
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

  it('早番/遅番プリセットボタンが正社員にもパートにも表示される', () => {
    const { rerender } = render(<ShiftCellEditorModal {...defaultProps} employmentType="正社員" />);
    expect(screen.getByRole('button', { name: /早番/, pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /遅番/, pressed: false })).toBeInTheDocument();
    rerender(<ShiftCellEditorModal {...defaultProps} employmentType="パート" />);
    expect(screen.getByRole('button', { name: /早番/, pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /遅番/, pressed: false })).toBeInTheDocument();
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

  it('早番ボタンを押して保存すると mode=preset で時間 null の onSave が呼ばれる', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<ShiftCellEditorModal {...defaultProps} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: /早番/, pressed: false }));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'preset',
      slot: 'early',
      startTime: null,
      endTime: null,
    }));
  });

  it('早番ボタンを押した後に勤務時間を手動変更するとプリセットが解除され time モードで保存される', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<ShiftCellEditorModal {...defaultProps} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: /早番/, pressed: false }));
    await user.selectOptions(screen.getByLabelText('勤務開始時刻 時'), '09');
    await user.selectOptions(screen.getByLabelText('勤務開始時刻 分'), '00');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'time',
      slot: 'early',
      startTime: '09:00',
    }));
  });
});
