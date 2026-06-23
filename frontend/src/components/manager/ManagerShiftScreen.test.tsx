import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
