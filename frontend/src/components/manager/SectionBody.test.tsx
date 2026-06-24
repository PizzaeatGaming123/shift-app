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
  expect(screen.getByLabelText('スタッフ検索')).toBeInTheDocument();
  expect(screen.queryByLabelText('登録する氏名')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'スタッフを登録' })).not.toBeInTheDocument();
});

it('スタッフ登録: 検索欄を出さず登録入力だけを表示する', async () => {
  renderSection('staff-registration');
  expect(await screen.findByRole('form', { name: 'スタッフ登録' })).toBeInTheDocument();
  expect(screen.queryByLabelText('スタッフ検索')).not.toBeInTheDocument();
  expect(screen.getByLabelText('登録区分')).toHaveValue('スタッフ');
  expect(screen.getByLabelText('登録する雇用形態')).toBeInTheDocument();
  expect(screen.getByLabelText('登録する氏名')).toHaveAttribute('placeholder', '例：山田太郎');
  expect(screen.getByRole('button', { name: 'スタッフを登録' })).toBeInTheDocument();
});

it('管理者登録: 管理者登録だけの入力画面を表示する', async () => {
  renderSection('manager-registration');
  expect(await screen.findByRole('form', { name: '管理者登録' })).toBeInTheDocument();
  expect(screen.getByLabelText('登録区分')).toHaveValue('管理者');
  expect(screen.getByRole('button', { name: '管理者を登録' })).toBeInTheDocument();
});

it('ランク・スキル: タブとランク階層S〜Dを表示し、保有者をスキルタブで切り替える', async () => {
  const user = userEvent.setup();
  renderSection('rank-settings');

  expect(await screen.findByText('ランク階層')).toBeInTheDocument();
  expect(screen.getByRole('tablist', { name: 'ランク・スキル切替' })).toBeInTheDocument();
  // ランクタブ: S〜D の行
  expect(screen.getByRole('rowheader', { name: 'S' })).toBeInTheDocument();
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
  expect(screen.getByLabelText('回収状況の対象月')).toBeInTheDocument();
  expect(screen.getAllByText('未提出').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole('button', { name: '未提出者へ一括通知' })).toBeInTheDocument();
});

it('シフト回収設定: 業務設定画面として編集項目と保存ボタンを表示する', async () => {
  renderSection('collection-settings');

  expect(await screen.findByLabelText('対象年月')).toBeInTheDocument();
  expect(screen.getByLabelText('シフト周期')).toBeInTheDocument();
  expect(screen.getByLabelText('受付状態')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'シフト回収設定を保存' })).toBeInTheDocument();
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

it('店舗管理・部門・ポジション・権限: 業務設定画面として表示する', async () => {
  renderSection('store-management');
  expect(await screen.findByLabelText('店舗管理の表示店舗')).toBeInTheDocument();
  expect(screen.getByLabelText('表示店舗の責任者')).toBeInTheDocument();

  renderSection('departments');
  expect(await screen.findByLabelText('新しい部門名')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '部門を追加' })).toBeInTheDocument();

  renderSection('positions');
  expect(await screen.findByLabelText('新しいポジション名')).toBeInTheDocument();
  expect(screen.getByLabelText('ポジションの所属部門')).toBeInTheDocument();

  renderSection('permissions');
  expect(await screen.findByLabelText('権限対象')).toBeInTheDocument();
  expect(screen.getByRole('rowheader', { name: '希望シフトの提出' })).toBeInTheDocument();
});

it('労務状況・勤怠・人時売上高: 予定シフトベースの一覧を表示する', async () => {
  renderSection('labor-status');
  expect(await screen.findByLabelText('労務状況店舗')).toBeInTheDocument();
  expect(screen.getByText('シフト上の確認')).toBeInTheDocument();

  renderSection('attendance');
  expect(await screen.findByText('出勤打刻ではなく、シフト表から見た勤務予定です。')).toBeInTheDocument();
  expect(screen.getAllByText('勤務予定日数').length).toBeGreaterThanOrEqual(1);

  renderSection('sales-per-hour');
  expect(await screen.findByLabelText('人時売上高の対象月')).toBeInTheDocument();
  expect(screen.getAllByText('人時売上高').length).toBeGreaterThanOrEqual(1);
});

it('追加募集: 条件カードと募集一覧を表示する', async () => {
  renderSection('recruitment');

  expect(await screen.findByLabelText('追加募集ポジション')).toBeInTheDocument();
  expect(screen.getByLabelText('追加募集雇用形態')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '募集を追加' })).toBeInTheDocument();
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
