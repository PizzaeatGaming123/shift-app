import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { api, type Me, type ApiStore, type ApiStaff, type ApiRequest, type ApiAssignment, type ApiDayNote, type ApiStoreNote, type ApiRecruitment } from '../api/client';
import { getDayRequest } from './requests';
import { isAssigned } from './assignments';
import type { ShiftRequest, Assignment, Staff, Store, DayRequestValue, DayNote, StoreNote, Recruitment, WorkSlot } from '../types';

interface AppContextValue {
  me: Me | null;
  loading: boolean;
  stores: Store[];
  staff: Staff[];
  requests: ShiftRequest[];
  assignments: Assignment[];
  dayNotes: DayNote[];
  storeNotes: StoreNote[];
  recruitments: Recruitment[];
  storeId: number | null;
  month: string; // 'YYYY-MM'
  setStoreId: (id: number) => void;
  setMonth: (month: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setDayRequest: (date: string, value: DayRequestValue) => Promise<void>;
  bulkSetRequests: (entries: { date: string; value: DayRequestValue }[]) => Promise<void>;
  toggleAssignment: (date: string, slot: WorkSlot, staffId: string, assigned: boolean) => Promise<void>;
  setDayNote: (date: string, text: string) => Promise<void>;
  setStoreNote: (date: string, text: string) => Promise<void>;
  setRecruitment: (date: string, message: string) => Promise<void>;
  updateStaff: (id: string, rank: number | null, skills: string[]) => Promise<void>;
  createStaff: (name: string, employmentType: string, role: string) => Promise<void>;
  bulkAssignRequested: (dates: string[]) => Promise<number>;
}

const AppContext = createContext<AppContextValue | null>(null);

function toStore(s: ApiStore): Store { return { id: String(s.id), name: s.name }; }
function toStaff(s: ApiStaff, storeId: number): Staff {
  return {
    id: String(s.id),
    name: s.name,
    storeId: String(storeId),
    employmentType: s.employmentType === '正社員' ? '正社員' : 'パート',
    role: s.role === 'MANAGER' ? 'MANAGER' : 'STAFF',
    rank: s.rank ?? null,
    skills: s.skills ? s.skills.split(',').map((t) => t.trim()).filter(Boolean) : [],
  };
}
function toRecruitment(r: ApiRecruitment): Recruitment {
  return { date: r.date, message: r.message };
}
function toRequest(r: ApiRequest): ShiftRequest {
  return { staffId: String(r.staffId), date: r.date, slot: r.slot };
}
function toAssignment(a: ApiAssignment): Assignment {
  return { date: a.date, slot: a.slot, staffIds: [String(a.staffId)] };
}
function toDayNote(n: ApiDayNote): DayNote {
  return { staffId: String(n.staffId), date: n.date, text: n.text };
}
function toStoreNote(n: ApiStoreNote): StoreNote {
  return { date: n.date, text: n.text };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [storeNotes, setStoreNotes] = useState<StoreNote[]>([]);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [month, setMonth] = useState('2026-07');

  // 初回: ログイン状態を確認
  useEffect(() => {
    api.me().then((m) => {
      setMe(m);
      if (m) setStoreId(m.storeId);
    }).finally(() => setLoading(false));
  }, []);

  // ログイン後: 店舗一覧を取得
  useEffect(() => {
    if (!me) return;
    api.stores().then((list) => setStores(list.map(toStore)));
  }, [me]);

  const reloadStoreData = useCallback(async () => {
    if (!storeId) return;
    const [st, rq, as, dn, sn, rc] = await Promise.all([
      api.staff(storeId),
      api.requests(storeId, month),
      api.assignments(storeId, month),
      api.dayNotes(storeId, month),
      api.storeNotes(storeId, month),
      api.recruitments(storeId, month),
    ]);
    setStaff(st.map((s) => toStaff(s, storeId)));
    setRequests(rq.map(toRequest));
    setAssignments(as.map(toAssignment));
    setDayNotes(dn.map(toDayNote));
    setStoreNotes(sn.map(toStoreNote));
    setRecruitments(rc.map(toRecruitment));
  }, [storeId, month]);

  useEffect(() => {
    if (me && storeId) void reloadStoreData();
  }, [me, storeId, month, reloadStoreData]);

  const login = useCallback(async (username: string, password: string) => {
    const m = await api.login(username, password);
    setMe(m);
    setStoreId(m.storeId);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setMe(null);
    setStores([]); setStaff([]); setRequests([]); setAssignments([]);
    setDayNotes([]); setStoreNotes([]); setRecruitments([]);
    setStoreId(null);
  }, []);

  const setDayRequest = useCallback(async (date: string, value: DayRequestValue) => {
    await api.setRequest(date, value);
    await reloadStoreData();
  }, [reloadStoreData]);

  const bulkSetRequests = useCallback(async (entries: { date: string; value: DayRequestValue }[]) => {
    if (entries.length === 0) return;
    await Promise.all(entries.map((e) => api.setRequest(e.date, e.value)));
    await reloadStoreData();
  }, [reloadStoreData]);

  const toggleAssignment = useCallback(
    async (date: string, slot: WorkSlot, staffId: string, assigned: boolean) => {
      if (!storeId) return;
      if (assigned) await api.unassign(storeId, date, slot, Number(staffId));
      else await api.assign(storeId, date, slot, Number(staffId));
      await reloadStoreData();
    }, [storeId, reloadStoreData]);

  const setDayNote = useCallback(async (date: string, text: string) => {
    await api.setDayNote(date, text);
    await reloadStoreData();
  }, [reloadStoreData]);

  const setStoreNote = useCallback(async (date: string, text: string) => {
    if (!storeId) return;
    await api.setStoreNote(storeId, date, text);
    await reloadStoreData();
  }, [storeId, reloadStoreData]);

  const setRecruitment = useCallback(async (date: string, message: string) => {
    if (!storeId) return;
    await api.setRecruitment(storeId, date, message);
    await reloadStoreData();
  }, [storeId, reloadStoreData]);

  const updateStaff = useCallback(async (id: string, rank: number | null, skills: string[]) => {
    await api.updateStaff(Number(id), rank, skills.join(','));
    await reloadStoreData();
  }, [reloadStoreData]);

  const createStaff = useCallback(async (name: string, employmentType: string, role: string) => {
    if (!storeId) return;
    await api.createStaff(storeId, name, employmentType, role);
    await reloadStoreData();
  }, [storeId, reloadStoreData]);

  // 希望（早/中/遅）が出ていて未割り当てのセルを一括で割り当てる。割り当てた件数を返す。
  const bulkAssignRequested = useCallback(async (targetDates: string[]): Promise<number> => {
    if (!storeId) return 0;
    const tasks: Promise<void>[] = [];
    for (const person of staff) {
      for (const date of targetDates) {
        const v = getDayRequest(requests, person.id, date);
        if (v === 'off' || v === 'none') continue;
        const slot = v as WorkSlot;
        if (!isAssigned(assignments, date, slot, person.id)) {
          tasks.push(api.assign(storeId, date, slot, Number(person.id)));
        }
      }
    }
    await Promise.all(tasks);
    if (tasks.length > 0) await reloadStoreData();
    return tasks.length;
  }, [storeId, staff, requests, assignments, reloadStoreData]);

  const value = useMemo<AppContextValue>(() => ({
    me, loading, stores, staff, requests, assignments, dayNotes, storeNotes, recruitments, storeId, month,
    setStoreId, setMonth, login, logout, setDayRequest, bulkSetRequests, toggleAssignment, setDayNote, setStoreNote, setRecruitment, updateStaff, createStaff, bulkAssignRequested,
  }), [me, loading, stores, staff, requests, assignments, dayNotes, storeNotes, recruitments, storeId, month,
       login, logout, setDayRequest, bulkSetRequests, toggleAssignment, setDayNote, setStoreNote, setRecruitment, updateStaff, createStaff, bulkAssignRequested]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
