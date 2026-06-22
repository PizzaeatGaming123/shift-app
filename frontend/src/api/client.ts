import type { DayRequestValue } from '../types';

export interface Me {
  id: number;
  name: string;
  role: 'STAFF' | 'MANAGER';
  storeId: number;
}
export interface ApiStore { id: number; name: string; }
export interface ApiStaff { id: number; name: string; employmentType: string; role: string; rank?: number | null; skills?: string | null; }
export interface ApiRequest { staffId: number; date: string; slot: 'early' | 'mid' | 'late' | 'off'; }
export interface ApiAssignment { date: string; slot: 'early' | 'mid' | 'late'; staffId: number; }
export interface ApiDayNote { staffId: number; date: string; text: string; }
export interface ApiStoreNote { date: string; text: string; }
export interface ApiRecruitment { date: string; message: string; }

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  async me(): Promise<Me | null> {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.status === 401) return null;
    return json<Me>(res);
  },

  async login(username: string, password: string): Promise<Me> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.status === 401) throw new Error('ユーザー名またはパスワードが違います');
    return json<Me>(res);
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  },

  async stores(): Promise<ApiStore[]> {
    return json<ApiStore[]>(await fetch('/api/stores', { credentials: 'include' }));
  },

  async staff(storeId: number): Promise<ApiStaff[]> {
    return json<ApiStaff[]>(await fetch(`/api/stores/${storeId}/staff`, { credentials: 'include' }));
  },

  async updateStaff(id: number, rank: number | null, skills: string): Promise<void> {
    await fetch(`/api/staff/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rank, skills }),
    });
  },

  async requests(storeId: number, month: string): Promise<ApiRequest[]> {
    return json<ApiRequest[]>(await fetch(`/api/stores/${storeId}/requests?month=${month}`, { credentials: 'include' }));
  },

  async setRequest(date: string, value: DayRequestValue): Promise<ApiRequest[]> {
    const res = await fetch('/api/requests', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, value }),
    });
    return json<ApiRequest[]>(res);
  },

  async assignments(storeId: number, month: string): Promise<ApiAssignment[]> {
    return json<ApiAssignment[]>(await fetch(`/api/stores/${storeId}/assignments?month=${month}`, { credentials: 'include' }));
  },

  async assign(storeId: number, date: string, slot: 'early' | 'mid' | 'late', staffId: number): Promise<void> {
    await fetch('/api/assignments', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, date, slot, staffId }),
    });
  },

  async unassign(storeId: number, date: string, slot: 'early' | 'mid' | 'late', staffId: number): Promise<void> {
    await fetch('/api/assignments', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, date, slot, staffId }),
    });
  },

  async dayNotes(storeId: number, month: string): Promise<ApiDayNote[]> {
    return json<ApiDayNote[]>(await fetch(`/api/stores/${storeId}/day-notes?month=${month}`, { credentials: 'include' }));
  },

  async setDayNote(date: string, text: string): Promise<void> {
    await fetch('/api/day-notes', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, text }),
    });
  },

  async storeNotes(storeId: number, month: string): Promise<ApiStoreNote[]> {
    return json<ApiStoreNote[]>(await fetch(`/api/stores/${storeId}/store-notes?month=${month}`, { credentials: 'include' }));
  },

  async setStoreNote(storeId: number, date: string, text: string): Promise<void> {
    await fetch(`/api/stores/${storeId}/store-notes`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, text }),
    });
  },

  async recruitments(storeId: number, month: string): Promise<ApiRecruitment[]> {
    return json<ApiRecruitment[]>(await fetch(`/api/stores/${storeId}/recruitments?month=${month}`, { credentials: 'include' }));
  },

  async setRecruitment(storeId: number, date: string, message: string): Promise<void> {
    await fetch(`/api/stores/${storeId}/recruitments`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, message }),
    });
  },
};
