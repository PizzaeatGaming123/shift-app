import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppProvider } from '../../store/AppContext';
import { mockManagerShiftApi } from '../../test/mockShiftApi';
import { ToastProvider } from '../ui/Toast';
import { SectionBody } from './SectionBody';
import type { ManagerSection } from './GlobalNav';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  mockManagerShiftApi(vi);
});

function renderSection(section: ManagerSection) {
  render(
    <ToastProvider>
      <AppProvider>
        <SectionBody section={section} />
      </AppProvider>
    </ToastProvider>,
  );
}

it('モデルシフト: 必要人数を変更すると akiyume-required に保存される', async () => {
  const user = userEvent.setup();
  renderSection('model-shift');

  const morning = await screen.findByLabelText('09:00 - 14:00');
  await user.clear(morning);
  await user.type(morning, '5');

  const saved = JSON.parse(localStorage.getItem('akiyume-required:1:ホール')!);
  expect(saved.morning).toBe(5);
});

it('追加募集: メッセージを入力して追加すると recruitments へPUTされる', async () => {
  const user = userEvent.setup();
  renderSection('recruitment');

  await user.type(await screen.findByLabelText('募集メッセージ'), '臨時ホール募集');
  await user.click(screen.getByRole('button', { name: '募集を追加' }));

  const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  const putCall = calls.find(([url, init]) =>
    String(url).includes('/recruitments')
    && (init as RequestInit | undefined)?.method === 'PUT');
  expect(putCall).toBeTruthy();
  expect(String((putCall![1] as RequestInit).body)).toContain('臨時ホール募集');
});

it('スタッフ一覧: スタッフ名を表示する', async () => {
  renderSection('staff-list');
  expect(await screen.findByText(/田中太郎/)).toBeInTheDocument();
});
