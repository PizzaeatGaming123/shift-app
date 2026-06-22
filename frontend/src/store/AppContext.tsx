import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { api, type Me, type ApiStore, type ApiStaff, type ApiRequest, type ApiAssignment, type ApiDayNote, type ApiStoreNote } from '../api/client';
import type { ShiftRequest, Assignment, Staff, Store, DayRequestValue, DayNote, StoreNote, WorkSlot } from '../types';

interface AppContextValue {
  me: Me | null;
  loading: boolean;
  stores: Store[];
  staff: Staff[];
  requests: ShiftRequest[];
  assignments: Assignment[];
  dayNotes: DayNote[];
  storeNotes: StoreNote[];
  storeId: number | null;
  month: string; // 'YYYY-MM'
  setStoreId: (id: number) => void;
  setMonth: (month: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setDayRequest: (date: string, value: DayRequestValue) => Promise<void>;
  toggleAssignment: (date: string, slot: WorkSlot, staffId: string, assigned: boolean) => Promise<void>;
  setDayNote: (date: string, text: string) => Promise<void>;
  setStoreNote: (date: string, text: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function toStore(s: ApiStore): Store { return { id: String(s.id), name: s.name }; }
function toStaff(s: ApiStaff, storeId: number): Staff {
  return {
    id: String(s.id),
    name: s.name,
    storeId: String(storeId),
    employmentType: s.employmentType === '正社員' ? '正社員' : 'パート',
  };
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
    const [st, rq, as, dn, sn] = await Promise.all([
      api.staff(storeId),
      api.requests(storeId, month),
      api.assignments(storeId, month),
      api.dayNotes(storeId, month),
      api.storeNotes(storeId, month),
    ]);
    setStaff(st.map((s) => toStaff(s, storeId)));
    setRequests(rq.map(toRequest));
    setAssignments(as.map(toAssignment));
    setDayNotes(dn.map(toDayNote));
    setStoreNotes(sn.map(toStoreNote));
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
    setDayNotes([]); setStoreNotes([]);
    setStoreId(null);
  }, []);

  const setDayRequest = useCallback(async (date: string, value: DayRequestValue) => {
    await api.setRequest(date, value);
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

  const value = useMemo<AppContextValue>(() => ({
    me, loading, stores, staff, requests, assignments, dayNotes, storeNotes, storeId, month,
    setStoreId, setMonth, login, logout, setDayRequest, toggleAssignment, setDayNote, setStoreNote,
  }), [me, loading, stores, staff, requests, assignments, dayNotes, storeNotes, storeId, month,
       login, logout, setDayRequest, toggleAssignment, setDayNote, setStoreNote]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
