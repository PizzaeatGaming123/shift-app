import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppProvider } from '../../store/AppContext';
import { mockManagerShiftApi } from '../../test/mockShiftApi';
import { ToastProvider } from '../ui/Toast';
import { ManagerLayout } from './ManagerLayout';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  mockManagerShiftApi(vi);
});

function renderLayout() {
  render(
    <ToastProvider>
      <AppProvider>
        <ManagerLayout />
      </AppProvider>
    </ToastProvider>,
  );
}

it('既定ではシフト表を表示し、セクション選択でフルスクリーン画面に切り替える', async () => {
  const user = userEvent.setup();
  renderLayout();
  await screen.findByText(/西村健一/);

  // 既定: シフト表（列ヘッダーがある）
  expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);

  // スタッフ → スタッフ一覧 を開く
  await user.click(screen.getByRole('button', { name: 'スタッフ' }));
  await user.click(screen.getByRole('menuitem', { name: 'スタッフ一覧' }));

  // フルスクリーン画面（モーダルではない）
  expect(screen.getByRole('heading', { name: 'スタッフ一覧' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '← シフト表へ戻る' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(await screen.findByText(/田中太郎/)).toBeInTheDocument();
  // シフト表は隠れている
  expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
});

it('戻るボタンでシフト表へ戻る', async () => {
  const user = userEvent.setup();
  renderLayout();
  await screen.findByText(/西村健一/);

  await user.click(screen.getByRole('button', { name: '計画' }));
  await user.click(screen.getByRole('menuitem', { name: 'モデルシフト' }));
  expect(screen.getByRole('heading', { name: 'モデルシフト' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '← シフト表へ戻る' }));
  expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
});
