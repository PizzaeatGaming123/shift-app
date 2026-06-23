import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppProvider } from '../store/AppContext';
import { mockManagerShiftApi } from '../test/mockShiftApi';
import { ToastProvider } from './ui/Toast';
import { TopNav } from './TopNav';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  mockManagerShiftApi(vi);
});

function renderTopNav() {
  render(
    <ToastProvider>
      <AppProvider>
        <TopNav />
      </AppProvider>
    </ToastProvider>,
  );
}

it('モデルシフトのメニューが有効で、押すと必要人数の入力が開く', async () => {
  const user = userEvent.setup();
  renderTopNav();
  // me(アカウント名)のロード完了を待つ
  await screen.findByText(/西村健一/);

  await user.click(screen.getByRole('button', { name: '計画' }));
  const item = screen.getByRole('menuitem', { name: 'モデルシフト' });
  expect(item).not.toBeDisabled();

  await user.click(item);
  expect(screen.getByLabelText('09:00 - 14:00')).toBeInTheDocument();
  expect(screen.getByLabelText('14:00 - 19:00')).toBeInTheDocument();
  expect(screen.getByLabelText('19:00 - 23:00')).toBeInTheDocument();
});

it('必要人数を変更すると akiyume-required に保存される', async () => {
  const user = userEvent.setup();
  renderTopNav();
  await screen.findByText(/西村健一/);

  await user.click(screen.getByRole('button', { name: '計画' }));
  await user.click(screen.getByRole('menuitem', { name: 'モデルシフト' }));

  const morning = screen.getByLabelText('09:00 - 14:00');
  await user.clear(morning);
  await user.type(morning, '5');

  const saved = JSON.parse(localStorage.getItem('akiyume-required:1:ホール')!);
  expect(saved.morning).toBe(5);
});

it('追加募集のメニューが有効で、押すと募集フォームが開く', async () => {
  const user = userEvent.setup();
  renderTopNav();
  await screen.findByText(/西村健一/);

  await user.click(screen.getByRole('button', { name: 'シフト' }));
  const item = screen.getByRole('menuitem', { name: '追加募集' });
  expect(item).not.toBeDisabled();

  await user.click(item);
  expect(screen.getByLabelText('募集メッセージ')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '募集を追加' })).toBeInTheDocument();
});

it('募集メッセージを入力して追加すると recruitments へPUTされる', async () => {
  const user = userEvent.setup();
  renderTopNav();
  await screen.findByText(/西村健一/);

  await user.click(screen.getByRole('button', { name: 'シフト' }));
  await user.click(screen.getByRole('menuitem', { name: '追加募集' }));

  await user.type(screen.getByLabelText('募集メッセージ'), '臨時ホール募集');
  await user.click(screen.getByRole('button', { name: '募集を追加' }));

  const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  const putCall = calls.find(([url, init]) =>
    String(url).includes('/recruitments')
    && (init as RequestInit | undefined)?.method === 'PUT');
  expect(putCall).toBeTruthy();
  expect(String((putCall![1] as RequestInit).body)).toContain('臨時ホール募集');
});
