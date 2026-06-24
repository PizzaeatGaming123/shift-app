import { fireEvent, render, screen, within } from '@testing-library/react';
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
  renderSection('model-shift');

  const monEarly = await screen.findByLabelText('早番 7:00〜16:00 月曜の必要人数');
  fireEvent.change(monEarly, { target: { value: '5' } });

  const saved = JSON.parse(localStorage.getItem('akiyume-model:1:ホール')!);
  // 月曜 = getDay 1
  expect(saved.early[1]).toBe(5);
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

it('シフトパターン: 早番と遅番の時刻を店舗ごとに保存する', async () => {
  const user = userEvent.setup();
  renderSection('shift-patterns');

  const earlyStart = await screen.findByLabelText('早番の開始時刻');
  expect(earlyStart).toHaveValue('07:00');
  await user.clear(earlyStart);
  await user.type(earlyStart, '06:30');

  const saved = JSON.parse(localStorage.getItem('akiyume-shift-patterns:1')!);
  expect(saved.early.start).toBe('06:30');
  expect(saved.late.end).toBe('24:00');
});

it('表示設定: 初期表示と文字サイズと表示項目を保存する', async () => {
  const user = userEvent.setup();
  renderSection('display-settings');

  await user.selectOptions(await screen.findByLabelText('シフト表の初期表示'), 'month');
  await user.click(screen.getByLabelText('大（見やすい）'));
  await user.click(screen.getByLabelText('売上・人件費などの集計行を表示'));

  const saved = JSON.parse(localStorage.getItem('akiyume-display-defaults:1')!);
  expect(saved.initialView).toBe('month');
  expect(saved.showSummary).toBe(true);
  expect(localStorage.getItem('akiyume-fontsize:1')).toBe('"large"');
  expect(screen.getByText('プレビュー')).toBeInTheDocument();
});

it('営業時間: 曜日別の営業時刻を保存する', async () => {
  const user = userEvent.setup();
  renderSection('business-hours');

  const mondayOpen = await screen.findByLabelText('月曜日の開店時刻');
  await user.clear(mondayOpen);
  await user.type(mondayOpen, '08:30');
  await user.click(screen.getByLabelText('日曜日を営業日にする'));

  const saved = JSON.parse(localStorage.getItem('akiyume-business-hours:1')!);
  expect(saved.days[1].open).toBe('08:30');
  expect(saved.days[0].enabled).toBe(true);
});

it('色設定: シフト区分の色を保存して標準色へ戻せる', async () => {
  const user = userEvent.setup();
  renderSection('color-settings');

  fireEvent.change(await screen.findByLabelText('早番の背景色'), { target: { value: '#ffeeee' } });
  let saved = JSON.parse(localStorage.getItem('akiyume-shift-colors:1')!);
  expect(saved.earlyBg).toBe('#ffeeee');

  await user.click(screen.getByRole('button', { name: '標準色へ戻す' }));
  saved = JSON.parse(localStorage.getItem('akiyume-shift-colors:1')!);
  expect(saved.earlyBg).toBe('#fff0f0');
});

it('回収状況: 提出済みと未提出を集計して表示する', async () => {
  renderSection('collection');

  expect(await screen.findByText('対象スタッフ')).toBeInTheDocument();
  expect(screen.getAllByText('未提出')).toHaveLength(2);
  expect(screen.getByRole('button', { name: '未提出者へ一括通知' })).toBeInTheDocument();
});

it('固定シフト: 曜日ルールを店舗設定へ保存する', async () => {
  const user = userEvent.setup();
  renderSection('fixed-shifts');

  await user.selectOptions(await screen.findByLabelText('スタッフ'), '2');
  await user.selectOptions(screen.getByLabelText('曜日'), '6');
  await user.click(screen.getByRole('button', { name: '固定シフトを追加' }));

  const saved = JSON.parse(localStorage.getItem('akiyume-fixed-shifts:1')!);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ staffId: '2', weekday: 6, value: 'early' });
});

it('売上計画: 資料画像の月選択と日別入力を表示する', async () => {
  renderSection('sales-plan');

  expect(await screen.findByLabelText('売上計画の対象月')).toBeInTheDocument();
  expect(screen.getByLabelText('固定人件費')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
});

it('労務アラート: 画像と同じ条件プルダウンを表示する', async () => {
  renderSection('labor-alerts');

  expect(await screen.findByLabelText('事業部')).toBeInTheDocument();
  expect(screen.getByLabelText('店舗')).toBeInTheDocument();
  expect(screen.getByLabelText('雇用形態')).toBeInTheDocument();
  expect(screen.getByLabelText('ポジション表示')).toBeInTheDocument();
  expect(screen.getByLabelText('アラート項目')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '上記の条件で検索' })).toBeInTheDocument();
});

it('他事業所ヘルプ: 上段切替とヘルプ先条件を表示する', async () => {
  renderSection('store-help');

  expect(await screen.findByLabelText('ヘルプ機能')).toBeInTheDocument();
  expect(screen.getByLabelText('ヘルプ表示月')).toBeInTheDocument();
  expect(screen.getByLabelText('ヘルプ先所属事業部')).toBeInTheDocument();
  expect(screen.getByLabelText('ヘルプ先店舗')).toBeInTheDocument();
  expect(screen.getByLabelText('ヘルプポジション')).toBeInTheDocument();
});

it('メッセージ: 画像と同じ一覧・会話・送信欄を表示して送信できる', async () => {
  const user = userEvent.setup();
  renderSection('messages');

  expect(await screen.findByRole('button', { name: '一斉送信作成' })).toBeInTheDocument();
  expect(screen.getByLabelText('氏名で検索')).toBeInTheDocument();
  expect(screen.getByLabelText('未読のみ')).toBeInTheDocument();
  expect(screen.getByLabelText('メッセージを入力')).toBeInTheDocument();

  await user.type(screen.getByLabelText('メッセージを入力'), '確認しました');
  await user.click(screen.getByRole('button', { name: '送信' }));

  expect(screen.getAllByText('確認しました').length).toBeGreaterThanOrEqual(1);

  await user.click(screen.getByRole('button', { name: '一斉送信作成' }));
  const dialog = screen.getByRole('dialog', { name: '一斉送信作成' });
  expect(dialog).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: '送信' }));
  expect(screen.getByText(/名へ一斉送信しました/)).toBeInTheDocument();
});
