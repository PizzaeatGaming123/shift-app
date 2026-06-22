import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider } from '../store/AppContext';
import { ManagerMatrix } from './ManagerMatrix';

function mockApi() {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const body = (data: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => data } as Response);
    if (url.includes('/api/auth/me')) return body({ id: 1, name: '山田（店長）', role: 'MANAGER', storeId: 1 });
    if (url.endsWith('/api/stores')) return body([{ id: 1, name: '中島店' }]);
    if (url.includes('/staff')) return body([{ id: 1, name: '山田（店長）', employmentType: '正社員', role: 'MANAGER' }]);
    if (url.includes('/requests')) return body([]);
    if (url.includes('/assignments')) return body([]);
    return body([]);
  });
}

describe('ManagerMatrix', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockApi(); });

  it('集計行（総労働時間・人件費）とスタッフ行を表示する', async () => {
    render(<AppProvider><ManagerMatrix year={2026} month={7} /></AppProvider>);
    await waitFor(() => expect(screen.getByText('山田（店長）')).toBeInTheDocument());
    expect(screen.getByText('総労働時間')).toBeInTheDocument();
    expect(screen.getByText('人件費(目安)')).toBeInTheDocument();
    expect(screen.getByText('早番')).toBeInTheDocument();
    expect(screen.getByText('遅番')).toBeInTheDocument();
  });
});
