type SpyApi = {
  spyOn: typeof import('vitest').vi.spyOn;
};

export function mockManagerShiftApi(vi: SpyApi) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    const response = (data: unknown) => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => data,
    } as Response);

    if (url.includes('/api/auth/me')) {
      return response({
        id: 1,
        name: '西村健一',
        role: 'MANAGER',
        storeId: 1,
      });
    }
    if (url.endsWith('/api/stores')) {
      return response([{ id: 1, name: '中島店' }]);
    }
    if (url.includes('/staff')) {
      return response([{
        id: 2,
        name: '田中太郎',
        employmentType: '正社員',
        role: 'STAFF',
        rank: 3,
        skills: 'キッチン',
      }]);
    }
    if (url.includes('/requests')) return response([]);
    if (url.includes('/assignments')) return response([]);
    if (url.includes('/day-notes')) return response([]);
    if (url.includes('/store-notes')) return response([]);
    if (url.includes('/recruitments')) return response([]);
    return response([]);
  });
}
