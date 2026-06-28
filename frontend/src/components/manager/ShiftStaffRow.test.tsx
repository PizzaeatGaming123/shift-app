import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHIFT_LAYERS } from './types';
import { ShiftStaffRow } from './ShiftStaffRow';

const person = {
  id: '1',
  name: '田中太郎',
  storeId: '1',
  employmentType: '正社員' as const,
  role: 'STAFF' as const,
};

const date = '2026-07-01';

describe('ShiftStaffRow', () => {
  it('readonly モードでは点線と確定の両方を <span> で同時表示する', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[{ staffId: '1', date, slot: 'early' }]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[{ staffId: '1', date, text: '早番大丈夫です！' }]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="readonly"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('田中太郎')).toBeInTheDocument();
    expect(screen.getByText('9:00')).toBeInTheDocument();
    expect(screen.getByText('07:00-16:00')).toBeInTheDocument();
    expect(screen.getByText('開店作業')).toBeInTheDocument();
    expect(screen.getByText('早番大丈夫です！')).toBeInTheDocument();
    const requestChip = screen.getByText('早番', { selector: '.rk-shift-chip--request' });
    const assignedChip = screen.getByText('早番', { selector: '.rk-shift-chip--assigned' });
    expect(requestChip.tagName).toBe('SPAN');
    expect(assignedChip.tagName).toBe('SPAN');
  });

  it('shiftMode="assignment" で assignment があれば、それを点線チップで表示する', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[]}
            assignments={[{
              date,
              slot: 'early',
              staffIds: ['1'],
              startTimes: ['09:00'],
              endTimes: ['11:00'],
            }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="assignment"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );
    const chip = screen.getByText('09:00-11:00', { selector: '.rk-shift-chip--request' });
    expect(chip).toBeInTheDocument();
    expect(screen.queryByText('09:00-11:00', { selector: '.rk-shift-chip--assigned' }))
      .not.toBeInTheDocument();
  });

  it('shiftMode="assignment" は点線希望のみ描画し、ベタ塗り割当は出ない', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[{ staffId: '1', date, slot: 'early' }]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="assignment"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText('早番', { selector: '.rk-shift-chip--request' }))
      .toBeInTheDocument();
    expect(screen.queryByText('早番', { selector: '.rk-shift-chip--assigned' }))
      .not.toBeInTheDocument();
  });

  it('shiftMode="confirmed" は希望（点線）と割当（ベタ塗り）を両方描画する', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[{ staffId: '1', date, slot: 'early' }]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="confirmed"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText('早番', { selector: '.rk-shift-chip--request' }))
      .toBeInTheDocument();
    expect(screen.getByText('早番', { selector: '.rk-shift-chip--assigned' }))
      .toBeInTheDocument();
  });

  it('shiftMode="confirmed" は layers.showRequests=false でも希望（点線）を描画する', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[{ staffId: '1', date, slot: 'early' }]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[]}
            layers={{ ...DEFAULT_SHIFT_LAYERS, showRequests: false }}
            density="standard"
            shiftMode="confirmed"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText('早番', { selector: '.rk-shift-chip--request' }))
      .toBeInTheDocument();
    expect(screen.getByText('早番', { selector: '.rk-shift-chip--assigned' }))
      .toBeInTheDocument();
  });

  it('シフトパターンとタスクを個別に非表示にできる', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[]}
            assignments={[{ date, slot: 'late', staffIds: ['1'] }]}
            notes={[]}
            layers={{
              ...DEFAULT_SHIFT_LAYERS,
              showPatterns: false,
              showTasks: false,
            }}
            density="standard"
            shiftMode="confirmed"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('遅番')).toBeInTheDocument();
    expect(screen.queryByText('15:00-24:00')).not.toBeInTheDocument();
    expect(screen.queryByText('閉店作業')).not.toBeInTheDocument();
  });

  it('店舗のシフトパターン設定を表示時間に反映する', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="confirmed"
            shiftPatterns={{
              early: { label: '朝番', start: '06:30', end: '15:30' },
              late: { label: '夜番', start: '15:00', end: '24:00' },
            }}
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('06:30-15:30')).toBeInTheDocument();
  });

  it('月時間が上限80%未満なら時間表示に soft 以上の warn class はつかない', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={{ ...person, monthlyHourLimit: 100 }}
            dates={[date]}
            requests={[]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="confirmed"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );

    const hours = screen.getByText('9:00');
    expect(hours.className).toContain('rk-warn-normal');
    expect(hours.className).not.toMatch(/rk-warn-(soft|medium|hard)/);
  });

  it('月時間が上限100%超なら hard class がつく', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={{ ...person, monthlyHourLimit: 5 }}
            dates={[date]}
            requests={[]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="confirmed"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('9:00').className).toContain('rk-warn-hard');
  });

  it('月上限が null なら warn class は none', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={{ ...person, monthlyHourLimit: null }}
            dates={[date]}
            requests={[]}
            assignments={[{ date, slot: 'early', staffIds: ['1'] }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="confirmed"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('9:00').className).toContain('rk-warn-none');
  });

  it('confirmed モードで割当チップをクリックすると onOpenEditor が既存データつきで呼ばれる', async () => {
    const user = userEvent.setup();
    const onOpenEditor = vi.fn();

    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[]}
            assignments={[{
              date,
              slot: 'early',
              staffIds: ['1'],
              startTimes: ['09:00'],
              endTimes: ['13:00'],
            }]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="confirmed"
            onToggleAssignment={() => {}}
            onOpenEditor={onOpenEditor}
          />
        </tbody>
      </table>,
    );

    await user.click(
      screen.getByRole('button', { name: '田中太郎 2026-07-01 09:00-13:00を編集' }),
    );

    expect(onOpenEditor).toHaveBeenCalledWith({
      staffId: '1',
      date,
      existing: { slot: 'early', startTime: '09:00', endTime: '13:00' },
    });
  });

  it('assignment モードで点線希望をクリックすると onOpenEditor が existing なしで呼ばれる', async () => {
    const user = userEvent.setup();
    const onOpenEditor = vi.fn();

    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[{ staffId: '1', date, slot: 'early' }]}
            assignments={[]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="assignment"
            onToggleAssignment={() => {}}
            onOpenEditor={onOpenEditor}
          />
        </tbody>
      </table>,
    );

    await user.click(screen.getByRole('button', { name: '田中太郎 2026-07-01 早番を編集' }));

    expect(onOpenEditor).toHaveBeenCalledWith({ staffId: '1', date });
  });

  it('assignment モードかつ空セルなら「＋」ボタンが出てクリックで onOpenEditor が呼ばれる', async () => {
    const user = userEvent.setup();
    const onOpenEditor = vi.fn();

    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[]}
            assignments={[]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="assignment"
            onToggleAssignment={() => {}}
            onOpenEditor={onOpenEditor}
          />
        </tbody>
      </table>,
    );

    await user.click(
      screen.getByRole('button', { name: '田中太郎 2026-07-01 に割当を追加' }),
    );

    expect(onOpenEditor).toHaveBeenCalledWith({ staffId: '1', date });
  });

  it('confirmed モードでは空セルに「＋」ボタンが出ない', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[]}
            assignments={[]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="confirmed"
            onToggleAssignment={() => {}}
            onOpenEditor={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByRole('button', { name: /に割当を追加/ })).not.toBeInTheDocument();
  });

  it('readonly モードでは空セルに「＋」ボタンが出ない', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[]}
            assignments={[]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="readonly"
            onToggleAssignment={() => {}}
            onOpenEditor={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByRole('button', { name: /に割当を追加/ })).not.toBeInTheDocument();
  });

  it('onCopyPreviousMonth が渡されると「先月と同じ」ボタンが出てクリックでコールバックされる', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();

    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[]}
            assignments={[]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="assignment"
            onToggleAssignment={() => {}}
            onCopyPreviousMonth={onCopy}
          />
        </tbody>
      </table>,
    );

    await user.click(screen.getByRole('button', { name: /先月と同じ/ }));
    expect(onCopy).toHaveBeenCalledWith('1');
  });

  it('onCopyPreviousMonth を渡さなければ「先月と同じ」ボタンは出ない', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[]}
            assignments={[]}
            notes={[]}
            layers={DEFAULT_SHIFT_LAYERS}
            density="standard"
            shiftMode="assignment"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByRole('button', { name: /先月と同じ/ })).not.toBeInTheDocument();
  });
});
