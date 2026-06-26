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
      return response([
        { id: 1, name: '中島店' },
        { id: 2, name: '新田店' },
      ]);
    }
    if (url.includes('/api/stores/2/staff')) {
      return response([{
        id: 12,
        name: '新田一郎',
        employmentType: '正社員',
        role: 'STAFF',
      }]);
    }
    if (url.includes('/staff')) {
      return response([{
        id: 2,
        name: '田中太郎',
        employmentType: '正社員',
        role: 'STAFF',
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
