import type { DayRequestValue } from '../types';

export interface Me {
  id: number;
  name: string;
  role: 'STAFF' | 'MANAGER';
  storeId: number;
}
export interface ApiStore { id: number; name: string; }
export interface ApiStaff { id: number; name: string; employmentType: string; role: string; hourlyWage?: number | null; monthlyHourLimit?: number | null; }
export type ApiRequestStatus =
  | 'DRAFT' | 'SUBMITTED' | 'CHANGE_REQUESTED' | 'CHANGE_APPROVED' | 'CHANGE_REJECTED' | 'CLOSED';
export interface ApiRequest {
  staffId: number;
  date: string;
  slot: 'early' | 'late' | 'off' | 'any';
  startTime?: string | null;
  endTime?: string | null;
  status?: ApiRequestStatus;
}
export interface ApiAssignmentBreak {
  startTime: string;
  endTime: string;
}
export interface ApiAssignment {
  date: string;
  slot: 'early' | 'late';
  staffId: number;
  startTime?: string | null;
  endTime?: string | null;
  tasks?: string[];
  breaks?: ApiAssignmentBreak[];
  workMemo?: string | null;
}
export interface RequestSubmissionEntry {
  date: string;
  value: DayRequestValue;
  startTime?: string | null;
  endTime?: string | null;
  note: string;
}
export interface ApiDayNote { staffId: number; date: string; text: string; }
export interface ApiStoreNote { date: string; text: string; }
export interface ApiRecruitment { date: string; message: string; }
export type ApiShiftPlanStatus =
  | 'DRAFT' | 'ADJUSTING' | 'CONFIRMED' | 'PUBLISHED' | 'CHANGING' | 'REPUBLISHED';
export interface ApiShiftPlan {
  storeId: number;
  month: string;
  status: ApiShiftPlanStatus;
  createdAt: string;
  updatedAt: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Spring が Set-Cookie で配る XSRF-TOKEN を読んで X-XSRF-TOKEN ヘッダにする。 */
function readXsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** 状態変更系の fetch。CSRF トークンと credentials を自動付与する。 */
async function mutate(input: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = readXsrfToken();
  if (token) headers.set('X-XSRF-TOKEN', token);
  return fetch(input, { ...init, credentials: 'include', headers });
}

export const api = {
  async me(): Promise<Me | null> {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.status === 401) return null;
    return json<Me>(res);
  },

  async login(username: string, password: string): Promise<Me> {
    // ログイン前は CSRF トークンを持っていないので mutate ではなく素の fetch を使う。
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
    await mutate('/api/auth/logout', { method: 'POST' });
  },

  async stores(): Promise<ApiStore[]> {
    return json<ApiStore[]>(await fetch('/api/stores', { credentials: 'include' }));
  },

  async staff(storeId: number): Promise<ApiStaff[]> {
    return json<ApiStaff[]>(await fetch(`/api/stores/${storeId}/staff`, { credentials: 'include' }));
  },

  async updateStaff(id: number, hourlyWage?: number | null, monthlyHourLimit?: number | null): Promise<void> {
    await mutate(`/api/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ hourlyWage, monthlyHourLimit }),
    });
  },

  async createStaff(storeId: number, name: string, employmentType: string, role: string, username: string): Promise<void> {
    const res = await mutate(`/api/stores/${storeId}/staff`, {
      method: 'POST',
      body: JSON.stringify({ name, employmentType, role, username }),
    });
    if (!res.ok) {
      // 400 ボディの message を投げる（重複ユーザー名などをトーストで出すため）
      const detail = await res.json().catch(() => ({}));
      throw new Error(typeof detail?.message === 'string' ? detail.message : `createStaff failed (${res.status})`);
    }
  },

  async requests(storeId: number, month: string): Promise<ApiRequest[]> {
    return json<ApiRequest[]>(await fetch(`/api/stores/${storeId}/requests?month=${month}`, { credentials: 'include' }));
  },

  async setRequest(date: string, value: DayRequestValue): Promise<ApiRequest[]> {
    const res = await mutate('/api/requests', {
      method: 'PUT',
      body: JSON.stringify({ date, value }),
    });
    return json<ApiRequest[]>(res);
  },

  async submitRequests(entries: RequestSubmissionEntry[]): Promise<void> {
    const res = await mutate('/api/requests/submission', {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  async assignments(storeId: number, month: string): Promise<ApiAssignment[]> {
    return json<ApiAssignment[]>(await fetch(`/api/stores/${storeId}/assignments?month=${month}`, { credentials: 'include' }));
  },

  async assign(
    storeId: number,
    date: string,
    slot: 'early' | 'late',
    staffId: number,
    startTime?: string | null,
    endTime?: string | null,
    extras?: { tasks?: string[]; breaks?: ApiAssignmentBreak[]; workMemo?: string | null },
  ): Promise<void> {
    // tasks / breaks / workMemo は undefined のときだけ body から省略する。
    // 空配列・空文字を渡されたら「明示クリア」としてサーバに送る。
    const body: Record<string, unknown> = {
      storeId,
      date,
      slot,
      staffId,
      startTime: startTime ?? null,
      endTime: endTime ?? null,
    };
    if (extras?.tasks !== undefined) body.tasks = extras.tasks;
    if (extras?.breaks !== undefined) body.breaks = extras.breaks;
    if (extras?.workMemo !== undefined) body.workMemo = extras.workMemo;
    await mutate('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async unassign(storeId: number, date: string, slot: 'early' | 'late', staffId: number): Promise<void> {
    await mutate('/api/assignments', {
      method: 'DELETE',
      body: JSON.stringify({ storeId, date, slot, staffId }),
    });
  },

  async dayNotes(storeId: number, month: string): Promise<ApiDayNote[]> {
    return json<ApiDayNote[]>(await fetch(`/api/stores/${storeId}/day-notes?month=${month}`, { credentials: 'include' }));
  },

  async setDayNote(date: string, text: string): Promise<void> {
    await mutate('/api/day-notes', {
      method: 'PUT',
      body: JSON.stringify({ date, text }),
    });
  },

  async storeNotes(storeId: number, month: string): Promise<ApiStoreNote[]> {
    return json<ApiStoreNote[]>(await fetch(`/api/stores/${storeId}/store-notes?month=${month}`, { credentials: 'include' }));
  },

  async setStoreNote(storeId: number, date: string, text: string): Promise<void> {
    await mutate(`/api/stores/${storeId}/store-notes`, {
      method: 'PUT',
      body: JSON.stringify({ date, text }),
    });
  },

  async recruitments(storeId: number, month: string): Promise<ApiRecruitment[]> {
    return json<ApiRecruitment[]>(await fetch(`/api/stores/${storeId}/recruitments?month=${month}`, { credentials: 'include' }));
  },

  async setRecruitment(storeId: number, date: string, message: string): Promise<void> {
    await mutate(`/api/stores/${storeId}/recruitments`, {
      method: 'PUT',
      body: JSON.stringify({ date, message }),
    });
  },

  async shiftPlan(storeId: number, month: string): Promise<ApiShiftPlan> {
    return json<ApiShiftPlan>(await fetch(`/api/stores/${storeId}/shift-plans/${month}`, { credentials: 'include' }));
  },

  async setShiftPlanStatus(storeId: number, month: string, status: ApiShiftPlanStatus): Promise<ApiShiftPlan> {
    const res = await mutate(`/api/stores/${storeId}/shift-plans/${month}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return json<ApiShiftPlan>(res);
  },
};
