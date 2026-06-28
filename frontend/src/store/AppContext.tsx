import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { api, type Me, type ApiStore, type ApiStaff, type ApiRequest, type ApiAssignment, type ApiDayNote, type ApiStoreNote, type ApiRecruitment, type ApiShiftPlanStatus } from '../api/client';
import { getDayRequest } from './requests';
import { isAssigned } from './assignments';
import type { ShiftRequest, Assignment, AssignmentDetail, Staff, Store, DayRequestValue, DayNote, StoreNote, Recruitment, WorkSlot } from '../types';
import type { ShiftPlanStatus } from '../lib/shiftStatus';
import { getMonthDates, previousMonth } from '../lib/date';
import { previousMonthByWeekday } from '../lib/previousMonthCopy';
import { getSetting, setSetting } from '../lib/settings';

/** 月選択をブラウザ間で持続させる localStorage キー。 */
const MONTH_STORAGE_KEY = 'akiyume-month';

/** 実機の翌月を 'YYYY-MM' で返す（12 月の翌は翌年 1 月）。 */
export function nextMonthIso(): string {
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
  return `${year}-${String(month).padStart(2, '0')}`;
}

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
  /** AGENTS.md §必須機能9 のシフト計画状態。backend 永続化済み。 */
  shiftPlanStatus: ShiftPlanStatus;
  setShiftPlanStatus: (status: ShiftPlanStatus) => Promise<void>;
  setStoreId: (id: number) => void;
  setMonth: (month: string) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setDayRequest: (date: string, value: DayRequestValue) => Promise<void>;
  bulkSetRequests: (entries: { date: string; value: DayRequestValue }[]) => Promise<void>;
  submitRequests: (entries: {
    date: string;
    value: DayRequestValue;
    startTime?: string | null;
    endTime?: string | null;
    note: string;
  }[]) => Promise<void>;
  toggleAssignment: (
    date: string,
    slot: WorkSlot,
    staffId: string,
    assigned: boolean,
    startTime?: string | null,
    endTime?: string | null,
  ) => Promise<void>;
  /**
   * 参考UI風モーダルから「保存」したときに呼ぶ。
   * tasks / breaks / workMemo は呼び出し時の値で常に上書きされる（空ならクリア）。
   */
  saveAssignmentDetails: (input: {
    date: string;
    slot: WorkSlot;
    staffId: string;
    startTime: string | null;
    endTime: string | null;
    tasks: string[];
    breaks: { startTime: string; endTime: string }[];
    workMemo: string;
  }) => Promise<void>;
  setDayNote: (date: string, text: string) => Promise<void>;
  setStoreNote: (date: string, text: string) => Promise<void>;
  setRecruitment: (date: string, message: string) => Promise<void>;
  updateStaff: (id: string, hourlyWage?: number | null, monthlyHourLimit?: number | null) => Promise<void>;
  createStaff: (name: string, employmentType: string, role: string) => Promise<void>;
  bulkAssignRequested: (dates: string[]) => Promise<number>;
  /**
   * 先月のそのスタッフの割当を曜日パターン化し、今月の同曜日全てに適用する。
   * 今月の既存割当（同スタッフ分）は全削除してから付け直すので、
   * 「先月と同じ」を押せば今月は先月の曜日パターンで完全に塗り直される。
   * 返り値は新規に登録された割当の件数。
   */
  copyPreviousMonthAssignments: (staffId: string) => Promise<number>;
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
    hourlyWage: s.hourlyWage ?? null,
    monthlyHourLimit: s.monthlyHourLimit ?? null,
  };
}
function toRecruitment(r: ApiRecruitment): Recruitment {
  return { date: r.date, message: r.message };
}
function toRequest(r: ApiRequest): ShiftRequest {
  return {
    staffId: String(r.staffId),
    date: r.date,
    slot: r.slot,
    startTime: r.startTime,
    endTime: r.endTime,
  };
}
/** API 行 1 件から、フロントの details スロット 1 要素を作る。 */
function toDetail(a: ApiAssignment): AssignmentDetail {
  return {
    tasks: a.tasks ?? [],
    breaks: a.breaks ?? [],
    workMemo: a.workMemo ?? '',
  };
}

/**
 * バックエンドの行（1スタッフ1レコード）を、フロントの集約形（date+slot で staffIds[]）に
 * まとめる。時間メタデータと details（タスク・休憩・メモ）は staffIds と同じ index で並べる。
 */
function aggregateAssignments(list: ApiAssignment[]): Assignment[] {
  const map = new Map<string, Assignment>();
  for (const a of list) {
    const key = `${a.date}|${a.slot}`;
    const existing = map.get(key);
    if (existing) {
      existing.staffIds.push(String(a.staffId));
      existing.startTimes!.push(a.startTime ?? null);
      existing.endTimes!.push(a.endTime ?? null);
      existing.details!.push(toDetail(a));
    } else {
      map.set(key, {
        date: a.date,
        slot: a.slot,
        staffIds: [String(a.staffId)],
        startTimes: [a.startTime ?? null],
        endTimes: [a.endTime ?? null],
        details: [toDetail(a)],
      });
    }
  }
  return Array.from(map.values());
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
  const [shiftPlanStatus, setShiftPlanStatusState] = useState<ShiftPlanStatus>('DRAFT');
  const reloadSeq = useRef(0);
  // 月の選択は localStorage に保持し、リロードやロゴクリックでもリセットしない。
  // 初回かつ保存値が無い場合だけ実機の現在月を入れる。
  const [month, setMonthState] = useState<string>(() => getSetting(MONTH_STORAGE_KEY, nextMonthIso()));
  const setMonth = useCallback((next: string) => {
    setMonthState(next);
    setSetting(MONTH_STORAGE_KEY, next);
  }, []);

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

  const reloadStoreData = useCallback(async (clearBeforeLoad = false) => {
    if (!storeId) return;
    const requestSeq = ++reloadSeq.current;
    const activeStoreId = storeId;
    if (clearBeforeLoad) {
      setStaff([]);
      setRequests([]);
      setAssignments([]);
      setDayNotes([]);
      setStoreNotes([]);
      setRecruitments([]);
      setShiftPlanStatusState('DRAFT');
    }
    // コア取得：これらが落ちると画面が成立しないので Promise.all で待つ。
    const [st, rq, as, dn, sn, rc] = await Promise.all([
      api.staff(activeStoreId),
      api.requests(activeStoreId, month),
      api.assignments(activeStoreId, month),
      api.dayNotes(activeStoreId, month),
      api.storeNotes(activeStoreId, month),
      api.recruitments(activeStoreId, month),
    ]);
    if (requestSeq !== reloadSeq.current) return;
    setStaff(st.map((s) => toStaff(s, activeStoreId)));
    setRequests(rq.map(toRequest));
    setAssignments(aggregateAssignments(as));
    setDayNotes(dn.map(toDayNote));
    setStoreNotes(sn.map(toStoreNote));
    setRecruitments(rc.map(toRecruitment));
    // ShiftPlan は補助情報。古い DB スキーマで失敗しても他の表示は止めない。
    try {
      const plan = await api.shiftPlan(activeStoreId, month);
      if (requestSeq !== reloadSeq.current) return;
      setShiftPlanStatusState(plan.status as ShiftPlanStatus);
    } catch (error) {
      if (requestSeq !== reloadSeq.current) return;
      console.warn('shiftPlan fetch failed, falling back to DRAFT', error);
      setShiftPlanStatusState('DRAFT');
    }
  }, [storeId, month]);

  useEffect(() => {
    if (me && storeId) void reloadStoreData(true);
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
    setShiftPlanStatusState('DRAFT');
  }, []);

  const setDayRequest = useCallback(async (date: string, value: DayRequestValue) => {
    await api.setRequest(date, value);
    await reloadStoreData();
  }, [reloadStoreData]);

  const bulkSetRequests = useCallback(async (entries: { date: string; value: DayRequestValue }[]) => {
    if (entries.length === 0) return;
    // 1 件失敗しても残りはサーバ側に書かれている可能性があるため、片方失敗時は必ず reload して
    // 部分反映を画面に反映する。
    try {
      await Promise.all(entries.map((e) => api.setRequest(e.date, e.value)));
    } finally {
      await reloadStoreData();
    }
  }, [reloadStoreData]);

  const submitRequests = useCallback(async (
    entries: {
      date: string;
      value: DayRequestValue;
      startTime?: string | null;
      endTime?: string | null;
      note: string;
    }[],
  ) => {
    await api.submitRequests(entries);
    await reloadStoreData();
  }, [reloadStoreData]);

  const toggleAssignment = useCallback(
    async (
      date: string,
      slot: WorkSlot,
      staffId: string,
      assigned: boolean,
      startTime?: string | null,
      endTime?: string | null,
    ) => {
      if (!storeId) return;
      setAssignments((current) => {
        if (assigned) {
          // 既存割当の解除：staffId と並列に並ぶ startTimes/endTimes も同 index で除去する。
          return current
            .map((item) => {
              if (item.date !== date || item.slot !== slot) return item;
              const idx = item.staffIds.indexOf(staffId);
              if (idx < 0) return item;
              const nextIds = item.staffIds.filter((_, i) => i !== idx);
              const nextStartTimes = item.startTimes?.filter((_, i) => i !== idx);
              const nextEndTimes = item.endTimes?.filter((_, i) => i !== idx);
              return {
                ...item,
                staffIds: nextIds,
                startTimes: nextStartTimes,
                endTimes: nextEndTimes,
              };
            })
            .filter((item) => item.staffIds.length > 0);
        }
        const target = current.find((item) => item.date === date && item.slot === slot);
        const start = startTime ?? null;
        const end = endTime ?? null;
        if (!target) {
          return [...current, {
            date,
            slot,
            staffIds: [staffId],
            startTimes: [start],
            endTimes: [end],
          }];
        }
        // 既に該当 staffId が居る場合は時間メタデータだけ上書きする（バックエンドと整合）。
        const existingIdx = target.staffIds.indexOf(staffId);
        if (existingIdx >= 0) {
          const startTimes = [...(target.startTimes ?? target.staffIds.map(() => null))];
          const endTimes = [...(target.endTimes ?? target.staffIds.map(() => null))];
          startTimes[existingIdx] = start;
          endTimes[existingIdx] = end;
          return current.map((item) => (
            item === target ? { ...item, startTimes, endTimes } : item
          ));
        }
        return current.map((item) => (
          item === target ? {
            ...item,
            staffIds: [...item.staffIds, staffId],
            startTimes: [...(item.startTimes ?? item.staffIds.map(() => null)), start],
            endTimes: [...(item.endTimes ?? item.staffIds.map(() => null)), end],
          } : item
        ));
      });
      try {
        if (assigned) await api.unassign(storeId, date, slot, Number(staffId));
        else await api.assign(storeId, date, slot, Number(staffId), startTime ?? null, endTime ?? null);
      } finally {
        await reloadStoreData();
      }
    }, [storeId, reloadStoreData]);

  const saveAssignmentDetails = useCallback(async (input: {
    date: string;
    slot: WorkSlot;
    staffId: string;
    startTime: string | null;
    endTime: string | null;
    tasks: string[];
    breaks: { startTime: string; endTime: string }[];
    workMemo: string;
  }) => {
    if (!storeId) return;
    await api.assign(
      storeId,
      input.date,
      input.slot,
      Number(input.staffId),
      input.startTime,
      input.endTime,
      {
        tasks: input.tasks,
        breaks: input.breaks,
        workMemo: input.workMemo,
      },
    );
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

  const updateStaff = useCallback(async (id: string, hourlyWage?: number | null, monthlyHourLimit?: number | null) => {
    await api.updateStaff(Number(id), hourlyWage, monthlyHourLimit);
    await reloadStoreData();
  }, [reloadStoreData]);

  const createStaff = useCallback(async (name: string, employmentType: string, role: string) => {
    if (!storeId) return;
    await api.createStaff(storeId, name, employmentType, role);
    await reloadStoreData();
  }, [storeId, reloadStoreData]);

  const setShiftPlanStatus = useCallback(async (next: ShiftPlanStatus) => {
    if (!storeId) return;
    const plan = await api.setShiftPlanStatus(storeId, month, next as ApiShiftPlanStatus);
    setShiftPlanStatusState(plan.status as ShiftPlanStatus);
  }, [storeId, month]);

  /**
   * 「先月と同じ」を実装する。動作:
   *   1) 先月の自分の割当を取得（バックエンドの 1 スタッフ 1 レコード形をそのまま使う）。
   *   2) `previousMonthByWeekday` で「曜日 → 最頻 `slot|start|end` 文字列」へ畳む。
   *   3) 今月の自分の既存割当を全削除（unassign）してから、計画分を順に assign する。
   * 順次 await することで API のレース／部分適用を避ける。最後に reload してフロント状態を整合させる。
   */
  const copyPreviousMonthAssignments = useCallback(async (staffId: string): Promise<number> => {
    if (!storeId) return 0;
    const prev = previousMonth(month);
    const [yearStr, monthStr] = month.split('-');
    const targetDates = getMonthDates(Number(yearStr), Number(monthStr));
    const prevList = await api.assignments(storeId, prev);
    const myPrev = prevList.filter((a) => String(a.staffId) === staffId);
    // slot|start|end をシリアライズして previousMonthByWeekday に渡す。null/undefined の時間は '' で表現。
    const serialized = myPrev.map((a) => ({
      date: a.date,
      value: `${a.slot}|${a.startTime ?? ''}|${a.endTime ?? ''}`,
    }));
    const plan = previousMonthByWeekday(serialized, targetDates, (item) => item.value);

    // 今月の既存割当（自分の分）を順次解除。バックエンドは date+slot+staffId 単位の DELETE。
    const myCurrent = assignments.flatMap((a) => (
      a.staffIds.includes(staffId) && targetDates.includes(a.date)
        ? [{ date: a.date, slot: a.slot }]
        : []
    ));
    for (const item of myCurrent) {
      await api.unassign(storeId, item.date, item.slot, Number(staffId));
    }

    let assigned = 0;
    for (const [date, value] of Object.entries(plan)) {
      if (!value) continue;
      const [slot, start, end] = value.split('|');
      if (slot !== 'early' && slot !== 'late') continue; // off は今回は割当に変換しない
      await api.assign(
        storeId,
        date,
        slot,
        Number(staffId),
        start || null,
        end || null,
      );
      assigned += 1;
    }
    await reloadStoreData();
    return assigned;
  }, [storeId, month, assignments, reloadStoreData]);

  // 希望（早/遅/どちらでも可）が出ていて未割り当てのセルを一括で割り当てる。割り当てた件数を返す。
  // - STAFF ロールだけが対象（店長は自分の希望で勝手に割り当てない）
  // - 'any'（どちらでも可）は既定で 'early' に解決する。サーバの WorkSlot は early/late のみのため
  //   キャストで 'any' を渡すと 400 になるので、ここで決定する。
  const bulkAssignRequested = useCallback(async (targetDates: string[]): Promise<number> => {
    if (!storeId) return 0;
    const tasks: Promise<void>[] = [];
    for (const person of staff) {
      if (person.role !== 'STAFF') continue;
      for (const date of targetDates) {
        const v = getDayRequest(requests, person.id, date);
        if (v === 'off' || v === 'none') continue;
        const slot: WorkSlot = v === 'late' ? 'late' : 'early';
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
    shiftPlanStatus, setShiftPlanStatus,
    setStoreId, setMonth, login, logout, setDayRequest, bulkSetRequests, submitRequests, toggleAssignment, saveAssignmentDetails, setDayNote, setStoreNote, setRecruitment, updateStaff, createStaff, bulkAssignRequested, copyPreviousMonthAssignments,
  }), [me, loading, stores, staff, requests, assignments, dayNotes, storeNotes, recruitments, storeId, month,
       shiftPlanStatus, setShiftPlanStatus,
       login, logout, setDayRequest, bulkSetRequests, submitRequests, toggleAssignment, saveAssignmentDetails, setDayNote, setStoreNote, setRecruitment, updateStaff, createStaff, bulkAssignRequested, copyPreviousMonthAssignments]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
