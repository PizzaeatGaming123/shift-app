import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { DayTimeline } from './DayTimeline';

it('早番を7時から16時の位置に表示して編集できる', async () => {
  const user = userEvent.setup();
  const onAdjust = vi.fn();

  render(
    <DayTimeline
      date="2026-07-01"
      startHour={7}
      endHour={24}
      staff={[{
        id: '1',
        name: '田中太郎',
        storeId: '1',
        employmentType: '正社員',
        role: 'STAFF',
      }]}
      assignments={[{
        date: '2026-07-01',
        slot: 'early',
        staffIds: ['1'],
      }]}
      onAdjust={onAdjust}
    />,
  );

  const bar = screen.getByRole('button', {
    name: '田中太郎 7:00-16:00を編集',
  });
  expect(bar).toHaveStyle({
    left: `${(0 / 17) * 100}%`,
    width: `${(9 / 17) * 100}%`,
  });

  await user.click(bar);
  expect(onAdjust).toHaveBeenCalledWith('1', '2026-07-01', 'early');
});

it('任意時間（9:00-13:00）が入っていれば、その時間で位置・幅・ラベルを描画する', () => {
  render(
    <DayTimeline
      date="2026-07-01"
      startHour={7}
      endHour={24}
      staff={[{
        id: '1',
        name: '田中太郎',
        storeId: '1',
        employmentType: 'パート',
        role: 'STAFF',
      }]}
      assignments={[{
        date: '2026-07-01',
        slot: 'early',
        staffIds: ['1'],
        startTimes: ['09:00'],
        endTimes: ['13:00'],
      }]}
      onAdjust={() => {}}
    />,
  );

  const bar = screen.getByRole('button', {
    name: '田中太郎 09:00-13:00を編集',
  });
  // 7時〜24時 = 17時間スパン。9時 - 7時 = 2、13時 - 9時 = 4。
  expect(bar).toHaveStyle({
    left: `${(2 / 17) * 100}%`,
    width: `${(4 / 17) * 100}%`,
  });
  expect(bar).toHaveTextContent('09:00-13:00');
  expect(bar).not.toHaveTextContent('早番');
});
