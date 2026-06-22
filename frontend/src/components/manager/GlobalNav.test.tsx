import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GlobalNav, type ManagerSection } from './GlobalNav';

const enabledSections = new Set<ManagerSection>([
  'shift-table',
  'staff-list',
  'staff-registration',
]);

function renderNav(overrides: {
  onHome?: () => void;
  onOpenSection?: (section: ManagerSection) => void;
  onLogout?: () => void;
} = {}) {
  const props = {
    userName: '西村健一',
    enabledSections,
    onHome: vi.fn(),
    onOpenSection: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  };
  render(<GlobalNav {...props} />);
  return props;
}

describe('GlobalNav', () => {
  it('資料と同じ順序で上部メニューを表示する', () => {
    renderNav();

    const labels = screen.getAllByRole('button').map((button) => button.textContent);
    expect(labels.slice(0, 8)).toEqual([
      '暁夢シフト',
      'シフト',
      'スタッフ',
      '計画',
      '労務',
      '組織',
      'データ管理',
      '設定',
    ]);
  });

  it('ドロップダウンは同時に一つだけ開く', async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(screen.getByRole('button', { name: 'シフト' }));
    expect(screen.getByRole('menu', { name: 'シフトメニュー' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'スタッフ' }));
    expect(screen.queryByRole('menu', { name: 'シフトメニュー' })).not.toBeInTheDocument();
    expect(screen.getByRole('menu', { name: 'スタッフメニュー' })).toBeVisible();
  });

  it('ブランドボタンでシフト表へ戻る', async () => {
    const user = userEvent.setup();
    const props = renderNav();

    await user.click(screen.getByRole('button', { name: '暁夢シフト' }));
    expect(props.onHome).toHaveBeenCalledOnce();
  });

  it('有効なメニューだけ画面遷移できる', async () => {
    const user = userEvent.setup();
    const props = renderNav();

    await user.click(screen.getByRole('button', { name: 'スタッフ' }));
    await user.click(screen.getByRole('menuitem', { name: 'スタッフ一覧' }));
    expect(props.onOpenSection).toHaveBeenCalledWith('staff-list');

    await user.click(screen.getByRole('button', { name: '計画' }));
    expect(screen.getByRole('menuitem', { name: '売上計画' })).toBeDisabled();
  });
});
