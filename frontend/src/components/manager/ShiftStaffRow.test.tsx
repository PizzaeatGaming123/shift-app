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
  rank: 3,
  skills: [],
};

const date = '2026-07-01';

describe('ShiftStaffRow', () => {
  it('氏名、月間時間、希望、確定シフト、勤務メモを分けて表示する', () => {
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
    expect(screen.getByText('早番', { selector: '.rk-shift-chip--request' }))
      .toBeInTheDocument();
    expect(screen.getByText('早番', { selector: '.rk-shift-chip--assigned' }))
      .toBeInTheDocument();
  });

  it('希望シフトと勤務メモを個別に非表示にできる', () => {
    render(
      <table>
        <tbody>
          <ShiftStaffRow
            person={person}
            dates={[date]}
            requests={[{ staffId: '1', date, slot: 'early' }]}
            assignments={[]}
            notes={[{ staffId: '1', date, text: '早番大丈夫です！' }]}
            layers={{
              ...DEFAULT_SHIFT_LAYERS,
              showRequests: false,
              showNotes: false,
            }}
            density="standard"
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByText('早番大丈夫です！')).not.toBeInTheDocument();
    expect(screen.queryByText('早番')).not.toBeInTheDocument();
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
    // 1日 × early(9h) = 9h、上限 100 → 9% → normal
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
    // 1日 × early(9h) = 9h、上限 5 → 180% → hard
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
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText('9:00').className).toContain('rk-warn-none');
  });

  it('確定シフトのボタンから割り当て解除を実行する', async () => {
    const user = userEvent.setup();
    const onToggleAssignment = vi.fn();

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
            density="large"
            onToggleAssignment={onToggleAssignment}
          />
        </tbody>
      </table>,
    );

    await user.click(
      screen.getByRole('button', {
        name: '田中太郎 2026-07-01 早番の割り当てを解除',
      }),
    );

    expect(onToggleAssignment).toHaveBeenCalledWith(
      date,
      'early',
      '1',
      true,
      null,
      null,
    );
    expect(screen.getByRole('row')).toHaveClass('rk-shift-staff-row--large');
  });

  it('空セルで onOpenAssignTimeModal を渡せば「＋」ボタンが出てクリックでコールバックされる', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

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
            onToggleAssignment={() => {}}
            onOpenAssignTimeModal={onOpen}
          />
        </tbody>
      </table>,
    );

    await user.click(
      screen.getByRole('button', {
        name: '田中太郎 2026-07-01 に割当を追加',
      }),
    );

    expect(onOpen).toHaveBeenCalledWith('1', '2026-07-01');
  });

  it('空セルでも onOpenAssignTimeModal を渡さなければ「＋」ボタンは出ない', () => {
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
            onToggleAssignment={() => {}}
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByRole('button', { name: /に割当を追加/ })).not.toBeInTheDocument();
  });

  it('時間付き割当は時間ラベルを表示し、解除コールバックに時刻も渡す', async () => {
    const user = userEvent.setup();
    const onToggleAssignment = vi.fn();

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
            onToggleAssignment={onToggleAssignment}
          />
        </tbody>
      </table>,
    );

    await user.click(
      screen.getByRole('button', {
        name: '田中太郎 2026-07-01 09:00-13:00の割り当てを解除',
      }),
    );

    expect(onToggleAssignment).toHaveBeenCalledWith(
      date,
      'early',
      '1',
      true,
      '09:00',
      '13:00',
    );
  });
});
