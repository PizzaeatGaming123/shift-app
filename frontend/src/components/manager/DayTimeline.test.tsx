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
