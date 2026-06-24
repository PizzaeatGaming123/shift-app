import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppProvider } from '../store/AppContext';
import { ToastProvider } from './ui/Toast';
import { StaffApp } from './StaffApp';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    const response = (data: unknown) => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => data,
    } as Response);

    if (url.includes('/api/auth/me')) {
      return response({ id: 2, name: '田中太郎', role: 'STAFF', storeId: 1 });
    }
    if (url.endsWith('/api/stores')) return response([{ id: 1, name: '中島店' }]);
    if (url.includes('/staff')) {
      return response([{ id: 2, name: '田中太郎', employmentType: '正社員', role: 'STAFF', rank: 3, skills: 'キッチン' }]);
    }
    if (url.includes('/requests')) return response([]);
    if (url.includes('/assignments')) return response([]);
    if (url.includes('/day-notes')) return response([]);
    if (url.includes('/store-notes')) return response([]);
    if (url.includes('/recruitments')) return response([]);
    return response([]);
  });
});

it('スタッフ画面: メッセージタブから店長へ送信できる', async () => {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <AppProvider>
        <StaffApp />
      </AppProvider>
    </ToastProvider>,
  );

  await user.click(await screen.findByRole('button', { name: 'メッセージ' }));
  expect(screen.getByText('店長とのメッセージ')).toBeInTheDocument();

  await user.type(screen.getByLabelText('メッセージを入力'), 'この日、相談したいです');
  await user.click(screen.getByRole('button', { name: '送信' }));

  expect(screen.getByText('この日、相談したいです')).toBeInTheDocument();
  expect(screen.getByText('店長へメッセージを送信しました')).toBeInTheDocument();
});
