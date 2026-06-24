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

it('資料のツールバーで月・半月・週の表示単位を切り替える', async () => {
  const user = userEvent.setup();

  render(
    <ToastProvider>
      <AppProvider>
        <ManagerShiftScreen />
      </AppProvider>
    </ToastProvider>,
  );

  // 既定は半月（1〜15日 ＝ 15日分＋スタッフ列）
  expect(screen.getAllByRole('columnheader')).toHaveLength(16);
  expect(screen.getByRole('button', { name: '一括操作' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '月' }));
  expect(screen.getAllByRole('columnheader')).toHaveLength(32);

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

it('シフトの種類と表示項目設定に業務プリセットのプルダウンを表示する', async () => {
  const user = userEvent.setup();

  render(
    <ToastProvider>
      <AppProvider>
        <ManagerShiftScreen />
      </AppProvider>
    </ToastProvider>,
  );

  await user.click(await screen.findByRole('button', { name: 'シフトの種類' }));
  expect(screen.getByRole('combobox', { name: 'シフト種類プリセット' })).toBeInTheDocument();
  await user.selectOptions(screen.getByRole('combobox', { name: 'シフト種類プリセット' }), 'workOnly');

  await user.click(screen.getByRole('button', { name: '閉じる' }));
  await user.click(screen.getByRole('button', { name: '表示項目設定' }));
  expect(screen.getByRole('combobox', { name: '表示プリセット' })).toBeInTheDocument();
  await user.selectOptions(screen.getByRole('combobox', { name: '表示プリセット' }), 'labor');
});
