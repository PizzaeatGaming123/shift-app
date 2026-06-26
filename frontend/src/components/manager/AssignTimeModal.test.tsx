import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHIFT_PATTERNS } from '../../lib/shiftPatterns';
import { AssignTimeModal } from './AssignTimeModal';

describe('AssignTimeModal', () => {
  it('正社員には早番・遅番のプリセットボタンが出る', () => {
    render(
      <AssignTimeModal
        open
        staffName="田中太郎"
        employmentType="正社員"
        patterns={DEFAULT_SHIFT_PATTERNS}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /早番/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /遅番/ })).toBeInTheDocument();
  });

  it('パートにはプリセットボタンは出ない', () => {
    render(
      <AssignTimeModal
        open
        staffName="山田花子"
        employmentType="パート"
        patterns={DEFAULT_SHIFT_PATTERNS}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: /早番/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /遅番/ })).not.toBeInTheDocument();
  });

  it('開始/終了時刻の入力欄を常に表示する', () => {
    render(
      <AssignTimeModal
        open
        staffName="山田花子"
        employmentType="パート"
        patterns={DEFAULT_SHIFT_PATTERNS}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByLabelText('開始')).toBeInTheDocument();
    expect(screen.getByLabelText('終了')).toBeInTheDocument();
  });

  it('保存ボタンで開始時刻に応じた slot と入力時刻が onSave に渡る', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <AssignTimeModal
        open
        staffName="山田花子"
        employmentType="パート"
        patterns={DEFAULT_SHIFT_PATTERNS}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    await user.clear(screen.getByLabelText('開始'));
    await user.type(screen.getByLabelText('開始'), '09:00');
    await user.clear(screen.getByLabelText('終了'));
    await user.type(screen.getByLabelText('終了'), '13:00');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(onSave).toHaveBeenCalledWith({ slot: 'early', startTime: '09:00', endTime: '13:00' });
  });

  it('正社員の早番ボタンは slot=early・時刻null で onSave', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <AssignTimeModal
        open
        staffName="田中太郎"
        employmentType="正社員"
        patterns={DEFAULT_SHIFT_PATTERNS}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /早番/ }));
    expect(onSave).toHaveBeenCalledWith({ slot: 'early', startTime: null, endTime: null });
  });

  it('正社員の遅番ボタンは slot=late・時刻null で onSave', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <AssignTimeModal
        open
        staffName="田中太郎"
        employmentType="正社員"
        patterns={DEFAULT_SHIFT_PATTERNS}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /遅番/ }));
    expect(onSave).toHaveBeenCalledWith({ slot: 'late', startTime: null, endTime: null });
  });

  it('open=false なら何もレンダーされない', () => {
    render(
      <AssignTimeModal
        open={false}
        staffName="田中太郎"
        employmentType="正社員"
        patterns={DEFAULT_SHIFT_PATTERNS}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByLabelText('開始')).not.toBeInTheDocument();
  });
});
