import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setSetting } from '../../lib/settings';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppProvider } from '../../store/AppContext';
import { mockManagerShiftApi } from '../../test/mockShiftApi';
import { ToastProvider } from '../ui/Toast';
import { ManagerShiftScreen } from './ManagerShiftScreen';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  mockManagerShiftApi(vi);
});

it('資料のツールバーで月表示から週表示へ切り替える', async () => {
  const user = userEvent.setup();

  render(
    <ToastProvider>
      <AppProvider>
        <ManagerShiftScreen />
      </AppProvider>
    </ToastProvider>,
  );

  expect(screen.getAllByRole('columnheader')).toHaveLength(32);
  expect(screen.getByRole('button', { name: '一括操作' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '週' }));
  expect(screen.getAllByRole('columnheader')).toHaveLength(8);
});

it('モデルシフトの必要人数設定がシフト表のx/yに反映される', async () => {
  render(
    <ToastProvider>
      <AppProvider>
        <ManagerShiftScreen />
      </AppProvider>
    </ToastProvider>,
  );

  const header = await screen.findByRole('rowheader', { name: '早番 7:00〜16:00' });
  const row = header.closest('tr')!;
  // 既定の必要人数は2、割り当て0なので 0/2
  expect(within(row).getAllByText('0/2').length).toBeGreaterThan(0);

  // モデルシフト設定（ホール/早番=全曜日7）を保存
  act(() => {
    setSetting('akiyume-model:1:ホール', {
      early: Array(7).fill(7),
      late: Array(7).fill(2),
    });
  });

  expect(within(row).getAllByText('0/7').length).toBeGreaterThan(0);
});
