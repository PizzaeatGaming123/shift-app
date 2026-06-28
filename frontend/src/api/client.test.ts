import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './client';

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status,
    json: async () => body,
  } as Response);
}

describe('api.me', () => {
  it('GETs /api/auth/me with credentials', async () => {
    const spy = mockFetch({ id: 1, name: '山田', role: 'MANAGER', storeId: 1 });
    const me = await api.me();
    expect(me?.role).toBe('MANAGER');
    expect(spy).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ credentials: 'include' }));
  });

  it('returns null on 401', async () => {
    mockFetch(null, false, 401);
    expect(await api.me()).toBeNull();
  });
});

describe('api.setRequest', () => {
  it('PUTs /api/requests', async () => {
    const spy = mockFetch([{ staffId: 1, date: '2026-07-01', slot: 'early' }]);
    await api.setRequest('2026-07-01', 'early');
    expect(spy).toHaveBeenCalledWith('/api/requests', expect.objectContaining({ method: 'PUT' }));
  });
});

describe('api.submitRequests', () => {
  it('PUTs the complete submission once', async () => {
    const spy = mockFetch(null);
    await api.submitRequests([{ date: '2026-07-01', value: 'early', note: '午前希望' }]);
    expect(spy).toHaveBeenCalledWith('/api/requests/submission', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({
        entries: [{ date: '2026-07-01', value: 'early', note: '午前希望' }],
      }),
    }));
  });
});
