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

it('モデルシフト: 曜日ごとの必要人数を変更すると akiyume-model に保存される', async () => {
  const user = userEvent.setup();
  renderSection('model-shift');

  const monMorning = await screen.findByLabelText('09:00 - 14:00 月曜の必要人数');
  await user.clear(monMorning);
  await user.type(monMorning, '5');

  const saved = JSON.parse(localStorage.getItem('akiyume-model:1:ホール')!);
  // 月曜 = getDay 1
  expect(saved.morning[1]).toBe(5);
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

it('ランク・スキル: タブとランク階層S〜Dを表示し、保有者をスキルタブで切り替える', async () => {
  const user = userEvent.setup();
  renderSection('rank-settings');

  // ランクタブ: S〜D の行
  expect(await screen.findByRole('rowheader', { name: 'S' })).toBeInTheDocument();
  expect(screen.getByRole('rowheader', { name: 'D' })).toBeInTheDocument();
  // 田中太郎(rank3=B)がBランクの保有者
  const bRow = screen.getByRole('rowheader', { name: 'B' }).closest('tr')!;
  expect(bRow.textContent).toContain('田中太郎');

  // スキルタブへ
  await user.click(screen.getByRole('tab', { name: 'スキル' }));
  expect(await screen.findByRole('rowheader', { name: 'キッチン' })).toBeInTheDocument();
});
