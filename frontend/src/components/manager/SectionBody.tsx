import { useEffect, useState } from 'react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { useToast } from '../ui/Toast';
import { useSetting } from '../../lib/settings';
import { getMonthDates } from '../../lib/date';
import {
  dailyWorkHours,
  dailyLaborCost,
  staffMonthlyHours,
  maxConsecutiveAssignedDays,
} from '../../store/labor';
import { isAssigned } from '../../store/assignments';
import { buildScheduleCsv, downloadCsv } from '../../lib/csv';
import {
  WORK_SLOTS,
  DAILY_SALES_TARGET,
} from '../../constants';
import type { WorkSlot } from '../../types';
import type { ManagerSection } from './GlobalNav';
import {
  DEFAULT_WEEKDAY_REQUIRED,
  MODEL_BANDS,
  WEEKDAY_COLUMNS,
  type WeekdayRequired,
} from './modelShift';
import { RankSkillScreen } from './RankSkillScreen';
import {
  collectionSettingKey,
  createDefaultCollectionSettings,
  type CollectionStatus,
} from '../../lib/collectionSettings';
import {
  DEFAULT_SHIFT_PATTERNS,
  normalizeShiftPatterns,
  shiftPatternHours,
  shiftPatternSettingKey,
  type ShiftPatterns,
} from '../../lib/shiftPatterns';
import { ColorSettingsSection } from './sections/ColorSettingsSection';
import { ShiftPatternsSection } from './sections/ShiftPatternsSection';
import { BusinessHoursSection } from './sections/BusinessHoursSection';

/** 各セクション画面のタイトル（GlobalNav のラベルと一致） */
export const SECTION_TITLES: Partial<Record<ManagerSection, string>> = {
  'shift-settings': 'シフト設定',
  collection: '回収状況',
  recruitment: '追加募集',
  'confirmed-shifts': '確定シフト',
  messages: 'メッセージ',
  'staff-list': 'スタッフ一覧',
  'staff-registration': 'スタッフ登録',
  'manager-registration': '管理者登録',
  'rank-settings': 'ランク・スキル一覧',
  'skill-settings': 'ランク・スキル一覧',
  'fixed-shifts': '固定シフト',
  'sales-plan': '売上計画',
  'labor-cost': '人件費',
  'sales-per-hour': '人時売上高',
  'model-shift': 'モデルシフト',
  'labor-status': '労務状況',
  attendance: 'シフト集計',
  'labor-alerts': '労働時間アラート',
  'store-management': '店舗管理',
  departments: '部門',
  positions: 'ポジション',
  permissions: '権限設定',
  'store-help': '他事業所ヘルプ',
  'csv-export': 'CSVエクスポート',
  'csv-import': 'CSVインポート',
  integrations: '連携設定',
  'display-settings': '表示設定',
  'business-hours': '営業時間',
  'collection-settings': 'シフト回収設定',
  'notification-settings': '通知設定',
  'shift-patterns': 'シフトパターン',
  'color-settings': '色設定',
};

const FONT_SIZES: { value: 'small' | 'standard' | 'large'; label: string }[] = [
  { value: 'small', label: '小（コンパクト）' },
  { value: 'standard', label: '標準' },
  { value: 'large', label: '大（見やすい）' },
];

interface DisplayDefaults {
  initialView: 'day' | 'week' | 'half-month' | 'month';
  showRequests: boolean;
  showNotes: boolean;
  showSummary: boolean;
  tableWidth: 'standard' | 'wide';
}

const DEFAULT_DISPLAY_DEFAULTS: DisplayDefaults = {
  initialView: 'half-month',
  showRequests: true,
  showNotes: true,
  showSummary: false,
  tableWidth: 'wide',
};

interface FixedShiftRule {
  id: string;
  staffId: string;
  weekday: number;
  frequency: 'every' | 'second-fourth';
  value: 'early' | 'late' | 'off';
}

interface StoreSupportPlan {
  id: string;
  staffId: string;
  destinationStoreId: string;
  date: string;
  start: string;
  end: string;
  role: string;
  status: 'REQUESTED' | 'APPROVED';
  note: string;
}

interface MessageItem {
  id: string;
  sender: 'staff' | 'manager' | 'system';
  text: string;
  time: string;
  label?: string;
}

interface MessageThread {
  id: string;
  staffId: string;
  name: string;
  unread: boolean;
  unreadMinutes: number;
  preview: string;
  tags: string[];
  messages: MessageItem[];
}

interface StoreProfile {
  department: string;
  manager: string;
  status: '営業中' | '準備中' | '休業';
  note: string;
}

function yen(n: number): string { return `¥${n.toLocaleString('ja-JP')}`; }

function assignedDays(
  assignments: ReturnType<typeof useApp>['assignments'],
  staffId: string,
  dates: string[],
): number {
  return dates.filter((d) => WORK_SLOTS.some((s) => isAssigned(assignments, d, s, staffId))).length;
}

/** 管理メニューの各セクションをフルスクリーン本文として描画する。 */
export function SectionBody({ section }: { section: ManagerSection }) {
  const {
    stores, staff, requests, assignments, storeId, month,
    createStaff, recruitments, setRecruitment,
  } = useApp();
  const { showToast } = useToast();

  const [importInfo, setImportInfo] = useState<{ count: number; sample: string[] } | null>(null);
  const [regName, setRegName] = useState('');
  const [regType, setRegType] = useState('パート');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | 'STAFF' | 'MANAGER'>('all');
  const [newDept, setNewDept] = useState('');
  const [recruitDate, setRecruitDate] = useState('');
  const [recruitMsg, setRecruitMsg] = useState('');
  const [fixedStaffId, setFixedStaffId] = useState('');
  const [fixedWeekday, setFixedWeekday] = useState(1);
  const [fixedFrequency, setFixedFrequency] = useState<'every' | 'second-fourth'>('every');
  const [fixedValue, setFixedValue] = useState<'early' | 'late' | 'off'>('early');
  const [supportStaffId, setSupportStaffId] = useState('');
  const [supportStoreId, setSupportStoreId] = useState('');
  const [supportDate, setSupportDate] = useState('');
  const [supportRole, setSupportRole] = useState('接客');
  const [supportNote, setSupportNote] = useState('');
  const [salesPlanMonth, setSalesPlanMonth] = useState(month);
  const [laborPeriodStart, setLaborPeriodStart] = useState(`${month}-01`);
  const [laborPeriodEnd, setLaborPeriodEnd] = useState(`${month}-15`);
  const [alertDept, setAlertDept] = useState('未指定');
  const [alertStore, setAlertStore] = useState(String(storeId));
  const [alertEmployment, setAlertEmployment] = useState('未指定');
  const [alertPosition, setAlertPosition] = useState('ホール');
  const [alertType, setAlertType] = useState('未指定');
  const [permissionScope, setPermissionScope] = useState<'staff' | 'manager'>('staff');
  const [recruitmentPosition, setRecruitmentPosition] = useState('ホール');
  const [supportMenu, setSupportMenu] = useState('ヘルプ要請登録');
  const [supportMonth, setSupportMonth] = useState(month);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageUnreadOnly, setMessageUnreadOnly] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('シフトを公開しました。スタッフ画面から確認してください。');

  const [salesTarget, setSalesTarget] = useSetting(`akiyume-sales:${storeId}`, DAILY_SALES_TARGET);
  const [positions, setPositions] = useSetting<string[]>(`akiyume-positions:${storeId}`, ['ホール', 'キッチン']);
  const [departments, setDepartments] = useSetting<string[]>(`akiyume-departments:${storeId}`, ['ホール', 'キッチン', '管理']);
  const [storeProfiles, setStoreProfiles] = useSetting<Record<string, StoreProfile>>(
    'akiyume-store-profiles',
    {},
  );
  const collectionDefaults = createDefaultCollectionSettings(month);
  const [storedCollect, setCollect] = useSetting(
    collectionSettingKey(storeId),
    collectionDefaults,
  );
  const collect = { ...collectionDefaults, ...storedCollect };
  const [notify, setNotify] = useSetting(`akiyume-notify:${storeId}`, { onConfirm: true, onRecruit: true, onChange: false });
  const [integ, setInteg] = useSetting(`akiyume-integ:${storeId}`, { pos: false, attendance: false, payroll: false });
  const [fontSize, setFontSize] = useSetting<'small' | 'standard' | 'large'>(`akiyume-fontsize:${storeId}`, 'standard');
  const [displayDefaults, setDisplayDefaults] = useSetting<DisplayDefaults>(
    `akiyume-display-defaults:${storeId}`,
    DEFAULT_DISPLAY_DEFAULTS,
  );
  const [perms, setPerms] = useSetting(`akiyume-perms:${storeId}`, {
    submit: true, viewOwn: true, viewOthers: false, postMemo: true, viewCost: false,
    buildOwnStore: false, publishOwnStore: false, changePublished: false,
    approveChanges: false, manageStaff: false, manageSkills: false,
    manageRequired: false, viewAllStores: false, manageSupport: false, csvExport: false,
  });
  const [modelPos, setModelPos] = useState<string>(positions[0] ?? 'ホール');
  const [modelRequired, setModelRequired] = useSetting<WeekdayRequired>(
    `akiyume-model:${storeId}:${modelPos}`,
    DEFAULT_WEEKDAY_REQUIRED,
  );
  const [storedShiftPatterns] = useSetting<ShiftPatterns>(
    shiftPatternSettingKey(storeId),
    DEFAULT_SHIFT_PATTERNS,
  );
  const [fixedShiftRules, setFixedShiftRules] = useSetting<FixedShiftRule[]>(
    `akiyume-fixed-shifts:${storeId}`,
    [],
  );
  const [supportPlans, setSupportPlans] = useSetting<StoreSupportPlan[]>(
    `akiyume-store-support:${storeId}`,
    [],
  );
  const [messageReplies, setMessageReplies] = useSetting<Record<string, MessageItem[]>>(
    `akiyume-message-replies:${storeId}`,
    {},
  );
  // 入力フォームの value は編集中も含めた生の値を流し込む必要があるため、
  // 表示は storedShiftPatterns のまま使い、時間計算だけ normalize 後の値を使う。
  // こうしないと、'06:30' のような途中入力が valid 判定に通る瞬間まで毎キーストロークで
  // DEFAULT にスナップし直され、入力できなくなる。
  const shiftPatterns = storedShiftPatterns;
  const normalizedShiftPatterns = normalizeShiftPatterns(storedShiftPatterns);
  const configuredSlotHours: Record<WorkSlot, number> = {
    early: shiftPatternHours(normalizedShiftPatterns.early),
    late: shiftPatternHours(normalizedShiftPatterns.late),
  };

  function setModelCell(band: keyof WeekdayRequired, weekday: number, value: number) {
    const next = Math.min(20, Math.max(0, value || 0));
    const column = [...modelRequired[band]];
    column[weekday] = next;
    setModelRequired({ ...modelRequired, [band]: column });
  }

  const dates = getMonthDates(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
  const mdLabel = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
  const activeRecruitDate = recruitDate || dates[0] || '';
  const storeName = stores.find((s) => String(s.id) === String(storeId))?.name ?? '店舗';
  const activeStoreProfile = storeProfiles[String(storeId)] ?? {
    department: departments[0] ?? 'ホール',
    manager: staff.find((person) => person.role === 'MANAGER')?.name ?? '店長',
    status: '営業中' as const,
    note: 'シフト作成対象店舗',
  };
  const monthOptions = Array.from({ length: 7 }, (_, index) => {
    const base = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + index - 3, 1);
    const value = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: `${base.getFullYear()}年${base.getMonth() + 1}月` };
  });
  const businessUnits = ['未指定', '第一事業部', '事業部未所属'];
  const employmentTypes = ['未指定', ...Array.from(new Set(staff.map((person) => person.employmentType)))];
  const alertTypes = ['未指定', '労働時間', '1日の労働時間', '連続勤務', 'シフト重複', '必要人数不足', '必須スキル不足'];
  const targetStaff = staff.filter((person) => person.role === 'STAFF');
  const managerStaff = staff.filter((person) => person.role === 'MANAGER');
  const messageThreads: MessageThread[] = targetStaff.map((person, index) => {
    const baseMessages: MessageItem[] = [
      {
        id: `${person.id}-staff-1`,
        sender: 'staff',
        text: index % 2 === 0
          ? 'スタッフ画面から希望を提出しました。確認お願いします。'
          : '確定シフトの確認をしました。この日、少し相談できますか？',
        time: '11:12',
      },
      {
        id: `${person.id}-manager-1`,
        sender: 'manager',
        text: '確認しました。変更が必要な場合はこのメッセージで連絡します。',
        time: '11:12',
        label: '一斉送信メッセージ',
      },
      {
        id: `${person.id}-system-1`,
        sender: 'system',
        text: 'シフト公開・変更申請・応援勤務の連絡は、ここに履歴として残ります。',
        time: '今日',
      },
    ];
    const extraMessages = messageReplies[person.id] ?? [];
    const latest = extraMessages[extraMessages.length - 1] ?? baseMessages[baseMessages.length - 1];
    return {
      id: person.id,
      staffId: person.id,
      name: person.name,
      unread: index < 2,
      unreadMinutes: index === 0 ? 1 : index === 1 ? 3 : (index + 1) * 10,
      preview: latest.text,
      tags: person.skills.slice(0, 2),
      messages: [...baseMessages, ...extraMessages],
    };
  });
  const filteredMessageThreads = messageThreads.filter((thread) => {
    const query = messageSearch.trim().toLowerCase();
    const matchesQuery = !query
      || thread.name.toLowerCase().includes(query)
      || thread.preview.toLowerCase().includes(query);
    return matchesQuery && (!messageUnreadOnly || thread.unread);
  });
  const activeMessageThread = filteredMessageThreads.find((thread) => thread.id === selectedMessageId)
    ?? filteredMessageThreads[0]
    ?? messageThreads[0];
  // 回収状況は「シフト設定の対象月」が真値。対象月 ≠ シフト表表示月の場合は
  // AppContext の requests には該当月の希望が無いため、対象月分を別途取得する。
  const [targetMonthSubmitterIds, setTargetMonthSubmitterIds] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!storeId) return;
    if (collect.targetMonth === month) {
      // 表示月と一致するときは追加取得せず、AppContext の requests を使う
      setTargetMonthSubmitterIds(null);
      return;
    }
    let canceled = false;
    void api.requests(storeId, collect.targetMonth).then((list) => {
      if (canceled) return;
      const ids = new Set(list.map((r) => String(r.staffId)));
      setTargetMonthSubmitterIds(ids);
    }).catch(() => {
      if (!canceled) setTargetMonthSubmitterIds(new Set());
    });
    return () => { canceled = true; };
  }, [storeId, collect.targetMonth, month]);

  const submittedStaffIds = targetMonthSubmitterIds ?? new Set(
    requests
      .filter((request) => request.date.startsWith(collect.targetMonth))
      .map((request) => request.staffId),
  );
  const submittedStaff = targetStaff.filter((person) => submittedStaffIds.has(person.id));
  const unsubmittedStaff = targetStaff.filter((person) => !submittedStaffIds.has(person.id));
  const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
  const totalHours = dates.reduce(
    (sum, date) => sum + dailyWorkHours(assignments, date, configuredSlotHours),
    0,
  );
  const totalCost = dates.reduce(
    (sum, date) => sum + dailyLaborCost(assignments, date, configuredSlotHours, staff),
    0,
  );
  const monthSales = salesTarget * dates.length;
  const salesPerHour = totalHours > 0 ? Math.round(monthSales / totalHours) : 0;
  const costRate = monthSales > 0 ? Math.round((totalCost / monthSales) * 100) : 0;

  async function submitRegister(role: 'STAFF' | 'MANAGER') {
    const name = regName.trim();
    if (!name) { showToast('氏名を入力してください'); return; }
    await createStaff(name, regType, role);
    showToast(`${role === 'MANAGER' ? '管理者' : 'スタッフ'}「${name}」を登録しました ✓`);
    setRegName('');
  }

  async function addRecruit() {
    const msg = recruitMsg.trim();
    if (!activeRecruitDate) { showToast('募集日を選択してください'); return; }
    if (!msg) { showToast('募集メッセージを入力してください'); return; }
    await setRecruitment(activeRecruitDate, msg);
    showToast(`${mdLabel(activeRecruitDate)} の追加募集を登録しました ✓`);
    setRecruitMsg('');
  }

  function exportCsv() {
    downloadCsv(`shift_${storeName}_${month}.csv`, buildScheduleCsv(staff, dates, assignments));
    showToast('CSVを書き出しました ✓');
  }

  function updateStoreProfile(id: string | number, patch: Partial<StoreProfile>) {
    const key = String(id);
    const current = storeProfiles[key] ?? {
      department: departments[0] ?? 'ホール',
      manager: staff.find((person) => person.role === 'MANAGER')?.name ?? '店長',
      status: '営業中' as const,
      note: '',
    };
    setStoreProfiles({
      ...storeProfiles,
      [key]: { ...current, ...patch },
    });
  }

  function sendMessage() {
    const text = messageDraft.trim();
    if (!text || !activeMessageThread) return;
    const nextMessage: MessageItem = {
      id: `${activeMessageThread.id}-${Date.now()}`,
      sender: 'manager',
      text,
      time: '今',
    };
    setMessageReplies({
      ...messageReplies,
      [activeMessageThread.id]: [
        ...(messageReplies[activeMessageThread.id] ?? []),
        nextMessage,
      ],
    });
    setMessageDraft('');
    showToast(`${activeMessageThread.name}さんへメッセージを送信しました`);
  }

  function sendBroadcastMessage() {
    const text = broadcastText.trim();
    if (!text || messageThreads.length === 0) return;
    const sentAt = Date.now();
    const nextReplies = { ...messageReplies };
    messageThreads.forEach((thread, index) => {
      nextReplies[thread.id] = [
        ...(nextReplies[thread.id] ?? []),
        {
          id: `${thread.id}-broadcast-${sentAt}-${index}`,
          sender: 'manager',
          text,
          time: '今',
          label: '一斉送信メッセージ',
        },
      ];
    });
    setMessageReplies(nextReplies);
    setBroadcastOpen(false);
    showToast(`${messageThreads.length}名へ一斉送信しました`);
  }

  function renderStaffManagement(initialRole: 'all' | 'STAFF' | 'MANAGER') {
    const effectiveRole = initialRole === 'all' ? staffRoleFilter : initialRole;
    const query = staffSearch.trim().toLowerCase();
    const visibleMembers = staff.filter((person) => {
      const matchesRole = effectiveRole === 'all' || person.role === effectiveRole;
      const matchesQuery = !query
        || person.name.toLowerCase().includes(query)
        || person.employmentType.toLowerCase().includes(query)
        || person.skills.some((skill) => skill.toLowerCase().includes(query));
      return matchesRole && matchesQuery;
    });
    const staffCount = staff.filter((person) => person.role === 'STAFF').length;
    const managerCount = staff.filter((person) => person.role === 'MANAGER').length;
    return (
      <div className="rk-reference-panel rk-staff-management">
        <div className="rk-status-metrics rk-staff-management__metrics">
          <article><span>スタッフ</span><strong>{staffCount}</strong></article>
          <article><span>管理者</span><strong>{managerCount}</strong></article>
          <article><span>未提出</span><strong>{unsubmittedStaff.length}</strong></article>
          <article><span>登録候補</span><strong>{visibleMembers.length}</strong></article>
        </div>

        <div className="rk-filter-card rk-staff-management__filters">
          <label>
            <span>氏名検索</span>
            <input
              aria-label="スタッフ検索"
              value={staffSearch}
              onChange={(event) => setStaffSearch(event.target.value)}
              placeholder="氏名・雇用形態・スキル"
            />
          </label>
          <label>
            <span>表示区分</span>
            <select
              aria-label="スタッフ表示区分"
              value={effectiveRole}
              disabled={initialRole !== 'all'}
              onChange={(event) => setStaffRoleFilter(event.target.value as typeof staffRoleFilter)}
            >
              <option value="all">すべて</option>
              <option value="STAFF">スタッフ</option>
              <option value="MANAGER">管理者</option>
            </select>
          </label>
        </div>

        <div className="rk-table-scroll">
          <table className="rk-reference-table rk-compact-table">
            <thead>
              <tr>
                <th scope="col">氏名</th>
                <th scope="col">区分</th>
                <th scope="col">雇用形態</th>
                <th scope="col">ランク</th>
                <th scope="col">スキル</th>
                <th scope="col">予定時間</th>
                <th scope="col">提出状態</th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((person) => {
                const hrs = staffMonthlyHours(assignments, person.id, dates, configuredSlotHours);
                const submitted = person.role === 'MANAGER' || submittedStaffIds.has(person.id);
                return (
                  <tr key={person.id}>
                    <th scope="row">{person.name}</th>
                    <td>{person.role === 'MANAGER' ? '管理者' : 'スタッフ'}</td>
                    <td>{person.employmentType}</td>
                    <td>{person.rank != null ? `ランク${person.rank}` : '未設定'}</td>
                    <td>
                      <span className="rk-staff-management__skills">
                        {person.skills.length > 0
                          ? person.skills.map((skill) => <span key={skill} className="skill-tag">{skill}</span>)
                          : <span className="muted-sm">未設定</span>}
                      </span>
                    </td>
                    <td>{hrs.toFixed(1)} h</td>
                    <td>
                      <span className={submitted ? 'rk-status-tag is-submitted' : 'rk-status-tag is-unsubmitted'}>
                        {submitted ? '提出済み' : '未提出'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderStaffRegistration(role: 'STAFF' | 'MANAGER') {
    const title = role === 'MANAGER' ? '管理者登録' : 'スタッフ登録';
    const roleLabel = role === 'MANAGER' ? '管理者' : 'スタッフ';
    const registeredCount = staff.filter((person) => person.role === role).length;
    return (
      <div className="rk-reference-panel rk-staff-registration">
        <div className="rk-status-metrics rk-staff-registration__metrics">
          <article><span>登録先店舗</span><strong>{storeName}</strong></article>
          <article><span>登録区分</span><strong>{roleLabel}</strong></article>
          <article><span>登録済み</span><strong>{registeredCount}</strong></article>
        </div>

        <form
          className="rk-registration-form"
          aria-label={title}
          onSubmit={(event) => {
            event.preventDefault();
            void submitRegister(role);
          }}
        >
          <div className="rk-registration-form__title">
            <h3>{title}</h3>
            <p>新しく登録する人の情報だけを入力してください。</p>
          </div>

          <label>
            <span>登録区分</span>
            <input aria-label="登録区分" value={roleLabel} readOnly />
          </label>

          <label>
            <span>雇用形態</span>
            <select
              aria-label="登録する雇用形態"
              value={regType}
              onChange={(event) => setRegType(event.target.value)}
            >
              <option value="正社員">正社員</option>
              <option value="パート">パート</option>
              <option value="アルバイト">アルバイト</option>
            </select>
          </label>

          <label className="rk-registration-form__wide">
            <span>氏名</span>
            <input
              aria-label="登録する氏名"
              value={regName}
              placeholder="例：山田太郎"
              onChange={(event) => setRegName(event.target.value)}
              autoComplete="name"
            />
          </label>

          <button type="submit" className="tb-btn rk-registration-form__submit">
            {role === 'MANAGER' ? '管理者を登録' : 'スタッフを登録'}
          </button>
        </form>
      </div>
    );
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const count = Math.max(0, lines.length - 1);
    setImportInfo({ count, sample: lines.slice(1, 4) });
    showToast(`${count}行を読み込みました ✓`);
  }

  switch (section) {
    case 'staff-list':
      return renderStaffManagement('all');

    case 'staff-registration':
      return renderStaffRegistration('STAFF');

    case 'manager-registration':
      return renderStaffRegistration('MANAGER');

    case 'rank-settings':
      return <RankSkillScreen initialTab="rank" />;

    case 'skill-settings':
      return <RankSkillScreen initialTab="skill" />;

    case 'sales-plan':
      return (
        <div className="rk-reference-panel rk-sales-plan">
          <div className="rk-ref-toolbar">
            <label>
              <span>売上計画</span>
              <select
                aria-label="売上計画の対象月"
                value={salesPlanMonth}
                onChange={(event) => setSalesPlanMonth(event.target.value)}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{monthOptions.find((option) => option.value === salesPlanMonth)?.label ?? '対象月'}固定人件費</span>
              <input type="number" min={0} step={10000} defaultValue={1000000} aria-label="固定人件費" />
              <b>円</b>
            </label>
          </div>

          <div className="rk-plan-editor">
            <div className="rk-plan-editor__total">
              <span>合計</span>
              <strong>{yen(salesTarget * dates.length)}</strong>
              <span>円</span>
            </div>
            <div className="rk-plan-editor__rows">
              {dates.slice(0, 15).map((date, index) => (
                <label key={date} className={index % 7 === 6 ? 'is-sunday' : ''}>
                  <span>{mdLabel(date)}({weekdayLabels[new Date(date).getDay()]})</span>
                  <input
                    aria-label={`${mdLabel(date)}の売上計画`}
                    type="number"
                    min={0}
                    step={1000}
                    value={salesTarget}
                    onChange={(event) => setSalesTarget(Math.max(0, Number(event.target.value) || 0))}
                  />
                  <b>円</b>
                </label>
              ))}
            </div>
            <div className="rk-ref-actions">
              <button type="button" className="tb-btn">キャンセル</button>
              <button type="button" className="tb-btn primary" onClick={() => showToast('売上計画を保存しました')}>保存</button>
            </div>
          </div>
        </div>
      );

    case 'labor-cost':
      return (
        <div className="rk-reference-panel">
          <div className="rk-ref-toolbar">
            <label>
              <span>表示する期間</span>
              <input
                type="date"
                aria-label="人件費表示開始日"
                value={laborPeriodStart}
                onChange={(event) => setLaborPeriodStart(event.target.value)}
              />
              <em>〜</em>
              <input
                type="date"
                aria-label="人件費表示終了日"
                value={laborPeriodEnd}
                onChange={(event) => setLaborPeriodEnd(event.target.value)}
              />
            </label>
          </div>
          <div className="rk-table-scroll">
            <table className="rk-reference-table">
              <thead>
                <tr>
                  <th scope="col">店舗</th>
                  <th scope="col">売上計画</th>
                  <th scope="col">人件費（人件費率）</th>
                  <th scope="col">人時売上高</th>
                  <th scope="col">総労働時間</th>
                </tr>
              </thead>
              <tbody>
                <tr className="is-group">
                  <th scope="row">第一事業部</th>
                  <td>{yen(monthSales)}</td>
                  <td>{yen(totalCost)} ({costRate}%)</td>
                  <td>{yen(salesPerHour)}</td>
                  <td>{totalHours.toFixed(2)} h</td>
                </tr>
                {stores.map((store, index) => {
                  const plannedSales = Math.round(monthSales / Math.max(1, stores.length));
                  const plannedCost = Math.round(totalCost / Math.max(1, stores.length));
                  const storeHours = totalHours / Math.max(1, stores.length);
                  const diff = index === 0 ? '+100,000' : '-100,000';
                  return (
                    <tr key={store.id}>
                      <th scope="row">{store.name}</th>
                      <td>{yen(plannedSales)}</td>
                      <td>{yen(plannedCost)} ({costRate}%) <span className={index === 0 ? 'is-up' : 'is-down'}>({diff})</span></td>
                      <td>{yen(storeHours > 0 ? Math.round(plannedSales / storeHours) : 0)}</td>
                      <td>{storeHours.toFixed(2)} h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted-sm">予定シフトから計算した概算です。実績勤怠・給与計算ではありません。</p>
        </div>
      );

    case 'sales-per-hour':
      return (
        <div className="rk-reference-panel rk-sales-per-hour">
          <div className="rk-ref-toolbar">
            <label>
              <span>対象月</span>
              <select aria-label="人時売上高の対象月" value={salesPlanMonth} onChange={(event) => setSalesPlanMonth(event.target.value)}>
                {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>店舗</span>
              <select aria-label="人時売上高の店舗" value={alertStore} onChange={(event) => setAlertStore(event.target.value)}>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </label>
          </div>
          <div className="rk-status-metrics">
            <article><span>売上計画</span><strong>{yen(monthSales)}</strong></article>
            <article><span>総労働時間</span><strong>{totalHours.toFixed(2)} h</strong></article>
            <article><span>人時売上高</span><strong>{yen(salesPerHour)} / h</strong></article>
            <article><span>人件費率</span><strong>{costRate}%</strong></article>
          </div>
          <div className="rk-table-scroll">
            <table className="rk-reference-table rk-compact-table">
              <thead>
                <tr>
                  <th scope="col">日付</th>
                  <th scope="col">売上計画</th>
                  <th scope="col">予定労働時間</th>
                  <th scope="col">人時売上高</th>
                  <th scope="col">状態</th>
                </tr>
              </thead>
              <tbody>
                {dates.slice(0, 15).map((date) => {
                  const hours = dailyWorkHours(assignments, date, configuredSlotHours);
                  const value = hours > 0 ? Math.round(salesTarget / hours) : 0;
                  return (
                    <tr key={date}>
                      <th scope="row">{mdLabel(date)}({weekdayLabels[new Date(date).getDay()]})</th>
                      <td>{yen(salesTarget)}</td>
                      <td>{hours.toFixed(2)} h</td>
                      <td>{hours > 0 ? `${yen(value)} / h` : '未配置'}</td>
                      <td>{value >= 3500 ? '目標内' : hours > 0 ? '確認' : 'シフト未配置'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted-sm">予定シフトを基にした管理指標です。実績勤怠ではありません。</p>
        </div>
      );

    case 'labor-status':
      return (
        <div className="rk-reference-panel rk-labor-status">
          <div className="rk-filter-card">
            <label>
              <span>開始日</span>
              <input type="date" aria-label="労務状況開始日" value={laborPeriodStart} onChange={(event) => setLaborPeriodStart(event.target.value)} />
            </label>
            <label>
              <span>終了日</span>
              <input type="date" aria-label="労務状況終了日" value={laborPeriodEnd} onChange={(event) => setLaborPeriodEnd(event.target.value)} />
            </label>
            <label>
              <span>店舗</span>
              <select aria-label="労務状況店舗" value={alertStore} onChange={(event) => setAlertStore(event.target.value)}>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </label>
            <label>
              <span>雇用形態</span>
              <select aria-label="労務状況雇用形態" value={alertEmployment} onChange={(event) => setAlertEmployment(event.target.value)}>
                {employmentTypes.map((employment) => <option key={employment} value={employment}>{employment}</option>)}
              </select>
            </label>
            <button type="button" className="tb-btn rk-filter-card__submit" onClick={() => showToast('労務状況を更新しました')}>
              上記の条件で表示
            </button>
          </div>
          <div className="rk-table-scroll">
            <table className="rk-reference-table rk-compact-table">
              <thead>
                <tr>
                  <th scope="col">スタッフ</th>
                  <th scope="col">雇用形態</th>
                  <th scope="col">予定時間</th>
                  <th scope="col">勤務予定日数</th>
                  <th scope="col">連続勤務</th>
                  <th scope="col">シフト上の確認</th>
                </tr>
              </thead>
              <tbody>
                {targetStaff.map((person) => {
                  const consec = maxConsecutiveAssignedDays(assignments, person.id, dates);
                  const hrs = staffMonthlyHours(assignments, person.id, dates, configuredSlotHours);
                  const days = assignedDays(assignments, person.id, dates);
                  const warning = consec >= 6 || hrs > 180;
                  return (
                    <tr key={person.id} className={warning ? 'is-attention-row' : undefined}>
                      <th scope="row">{person.name}</th>
                      <td>{person.employmentType}</td>
                      <td>{hrs.toFixed(1)} h</td>
                      <td>{days} 日</td>
                      <td>{consec} 日</td>
                      <td>{warning ? '予定上の確認あり' : '確認なし'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'attendance':
      return (
        <div className="rk-reference-panel rk-attendance-plan">
          <div className="rk-ref-toolbar">
            <label>
              <span>対象月</span>
              <select aria-label="勤務予定の対象月" value={salesPlanMonth} onChange={(event) => setSalesPlanMonth(event.target.value)}>
                {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <span className="rk-settings-note">出勤打刻ではなく、シフト表から見た勤務予定です。</span>
          </div>
          <div className="rk-table-scroll">
            <table className="rk-reference-table rk-compact-table">
              <thead>
                <tr>
                  <th scope="col">スタッフ</th>
                  <th scope="col">勤務予定日数</th>
                  <th scope="col">予定時間</th>
                  <th scope="col">早番</th>
                  <th scope="col">遅番</th>
                  <th scope="col">休日数</th>
                </tr>
              </thead>
              <tbody>
                {targetStaff.map((person) => {
                  const earlyCount = dates.filter((date) => isAssigned(assignments, date, 'early', person.id)).length;
                  const lateCount = dates.filter((date) => isAssigned(assignments, date, 'late', person.id)).length;
                  const days = assignedDays(assignments, person.id, dates);
                  return (
                    <tr key={person.id}>
                      <th scope="row">{person.name}</th>
                      <td>{days} 日</td>
                      <td>{staffMonthlyHours(assignments, person.id, dates, configuredSlotHours).toFixed(1)} h</td>
                      <td>{earlyCount} 回</td>
                      <td>{lateCount} 回</td>
                      <td>{Math.max(0, dates.length - days)} 日</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'labor-alerts': {
      const flagged = staff.filter((s) =>
        maxConsecutiveAssignedDays(assignments, s.id, dates) >= 6
        || staffMonthlyHours(assignments, s.id, dates, configuredSlotHours) > 180);
      return (
        <div className="rk-reference-panel rk-labor-alerts">
          <div className="rk-filter-card">
            <label>
              <span>開始日</span>
              <input
                type="date"
                aria-label="労務アラート開始日"
                value={laborPeriodStart}
                onChange={(event) => setLaborPeriodStart(event.target.value)}
              />
            </label>
            <label>
              <span>終了日</span>
              <input
                type="date"
                aria-label="労務アラート終了日"
                value={laborPeriodEnd}
                onChange={(event) => setLaborPeriodEnd(event.target.value)}
              />
            </label>
            <label>
              <span>事業部</span>
              <select aria-label="事業部" value={alertDept} onChange={(event) => setAlertDept(event.target.value)}>
                {businessUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label>
              <span>店舗</span>
              <select aria-label="店舗" value={alertStore} onChange={(event) => setAlertStore(event.target.value)}>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </label>
            <label>
              <span>雇用形態</span>
              <select aria-label="雇用形態" value={alertEmployment} onChange={(event) => setAlertEmployment(event.target.value)}>
                {employmentTypes.map((employment) => <option key={employment} value={employment}>{employment}</option>)}
              </select>
            </label>
            <label>
              <span>ポジション表示</span>
              <select aria-label="ポジション表示" value={alertPosition} onChange={(event) => setAlertPosition(event.target.value)}>
                {positions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>アラート項目</span>
              <select aria-label="アラート項目" value={alertType} onChange={(event) => setAlertType(event.target.value)}>
                {alertTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <button type="button" className="tb-btn rk-filter-card__submit" onClick={() => showToast('労務アラートを検索しました')}>
              上記の条件で検索
            </button>
          </div>

          <table className="rk-alert-table">
            <tbody>
              {flagged.length === 0 ? (
                <tr className="is-empty">
                  <th scope="row">{mdLabel(dates[0] ?? `${month}-01`)}</th>
                  <td>シフト上の予定時間・連続勤務の警告対象はいません。</td>
                </tr>
              ) : flagged.map((person) => (
                <tr key={person.id} className="is-warning">
                  <th scope="row">{mdLabel(dates[0] ?? `${month}-01`)}</th>
                  <td>
                    <strong>{person.name}</strong>
                    予定シフト上で 連続{maxConsecutiveAssignedDays(assignments, person.id, dates)}日 /
                    月間{staffMonthlyHours(assignments, person.id, dates, configuredSlotHours).toFixed(0)}h です
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'store-management':
      return (
        <div className="rk-reference-panel rk-store-management">
          <div className="rk-filter-card">
            <label>
              <span>表示店舗</span>
              <select aria-label="店舗管理の表示店舗" value={String(storeId)} onChange={(event) => showToast(`${event.target.options[event.target.selectedIndex].text}を確認中です`)}>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
              </select>
            </label>
            <label>
              <span>事業部</span>
              <select
                aria-label="表示店舗の事業部"
                value={activeStoreProfile.department}
                onChange={(event) => updateStoreProfile(String(storeId ?? ''), { department: event.target.value })}
              >
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </label>
            <label>
              <span>責任者</span>
              <input
                aria-label="表示店舗の責任者"
                value={activeStoreProfile.manager}
                onChange={(event) => updateStoreProfile(String(storeId ?? ''), { manager: event.target.value })}
              />
            </label>
            <label>
              <span>状態</span>
              <select
                aria-label="表示店舗の状態"
                value={activeStoreProfile.status}
                onChange={(event) => updateStoreProfile(String(storeId ?? ''), { status: event.target.value as StoreProfile['status'] })}
              >
                <option value="営業中">営業中</option>
                <option value="準備中">準備中</option>
                <option value="休業">休業</option>
              </select>
            </label>
            <button type="button" className="tb-btn rk-filter-card__submit" onClick={() => showToast('店舗設定を保存しました')}>
              店舗設定を保存
            </button>
          </div>
          <div className="rk-table-scroll">
            <table className="rk-reference-table rk-compact-table">
              <thead>
                <tr>
                  <th scope="col">店舗名</th>
                  <th scope="col">事業部</th>
                  <th scope="col">責任者</th>
                  <th scope="col">状態</th>
                  <th scope="col">対象スタッフ</th>
                  <th scope="col">メモ</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => {
                  const profile = storeProfiles[String(store.id)] ?? {
                    department: departments[0] ?? 'ホール',
                    manager: managerStaff[0]?.name ?? '店長',
                    status: '営業中' as const,
                    note: String(store.id) === String(storeId) ? '表示中' : '登録済み',
                  };
                  return (
                    <tr key={store.id} className={String(store.id) === String(storeId) ? 'is-group' : undefined}>
                      <th scope="row">{store.name}</th>
                      <td>{profile.department}</td>
                      <td>{profile.manager}</td>
                      <td>{profile.status}</td>
                      <td>{staff.filter((person) => String(person.storeId) === String(store.id)).length} 名</td>
                      <td>{profile.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'departments': {
      const addDepartment = () => {
        const value = newDept.trim();
        if (!value) return;
        if (!departments.includes(value)) setDepartments([...departments, value]);
        setNewDept('');
      };
      return (
        <div className="rk-reference-panel rk-master-page">
          <div className="rk-ref-toolbar">
            <label>
              <span>部門名</span>
              <input aria-label="新しい部門名" value={newDept} onChange={(event) => setNewDept(event.target.value)} />
            </label>
            <button type="button" className="tb-btn" onClick={addDepartment}>部門を追加</button>
          </div>
          <table className="rk-reference-table rk-compact-table">
            <thead>
              <tr>
                <th scope="col">部門</th>
                <th scope="col">利用店舗</th>
                <th scope="col">ポジション数</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department}>
                  <th scope="row">{department}</th>
                  <td>{storeName}</td>
                  <td>{positions.length}</td>
                  <td>
                    <button type="button" className="tb-btn sm" onClick={() => setDepartments(departments.filter((item) => item !== department))}>
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'positions': {
      const addPosition = () => {
        const value = newDept.trim();
        if (!value) return;
        if (!positions.includes(value)) setPositions([...positions, value]);
        setNewDept('');
      };
      return (
        <div className="rk-reference-panel rk-master-page">
          <div className="rk-ref-toolbar">
            <label>
              <span>ポジション名</span>
              <input aria-label="新しいポジション名" value={newDept} onChange={(event) => setNewDept(event.target.value)} />
            </label>
            <label>
              <span>所属部門</span>
              <select aria-label="ポジションの所属部門" defaultValue={departments[0] ?? 'ホール'}>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </label>
            <button type="button" className="tb-btn" onClick={addPosition}>ポジションを追加</button>
          </div>
          <table className="rk-reference-table rk-compact-table">
            <thead>
              <tr>
                <th scope="col">ポジション</th>
                <th scope="col">必要人数設定</th>
                <th scope="col">シフト表表示</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((positionName) => (
                <tr key={positionName}>
                  <th scope="row">{positionName}</th>
                  <td>モデルシフトで設定</td>
                  <td>表示する</td>
                  <td>
                    <button type="button" className="tb-btn sm" onClick={() => setPositions(positions.filter((item) => item !== positionName))}>
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'permissions':
      return (
        <div className="rk-reference-panel rk-permission-page">
          <div className="rk-ref-toolbar">
            <label>
              <span>権限対象</span>
              <select aria-label="権限対象" value={permissionScope} onChange={(event) => setPermissionScope(event.target.value as typeof permissionScope)}>
                <option value="staff">スタッフ</option>
                <option value="manager">管理者</option>
              </select>
            </label>
            <span>スタッフは給与単価・他スタッフ情報を初期状態では閲覧できません。</span>
          </div>
          <table className="rk-reference-table rk-permission-table">
            <thead>
              <tr>
                <th scope="col">権限</th>
                <th scope="col">説明</th>
                <th scope="col">許可</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['submit', '希望シフトの提出', '本人の希望シフトを下書き・提出できます'],
                ['viewOwn', '自分の確定シフトの閲覧', '公開済みの自分の予定だけを確認できます'],
                ['viewOthers', '他スタッフのシフトの閲覧', '他スタッフの予定表示を許可します'],
                ['postMemo', 'ひとことメモの投稿', '希望や相談メモを送れます'],
                ['viewCost', '人件費の閲覧', '予定人件費と単価情報を閲覧できます'],
                ['buildOwnStore', '自店舗のシフト作成', '自店舗のシフト案を編集できます'],
                ['publishOwnStore', '自店舗のシフト公開', '確定シフトをスタッフへ公開できます'],
                ['changePublished', '公開後のシフト変更', '公開済みシフトの変更を記録できます'],
                ['approveChanges', '変更申請の承認', '期限後の変更申請を承認できます'],
                ['manageStaff', 'スタッフ管理', 'スタッフ情報を登録・編集できます'],
                ['manageSkills', 'スキル管理', 'ランク・スキルを編集できます'],
                ['manageRequired', '必要人数設定', 'モデルシフトや必要人数を編集できます'],
                ['viewAllStores', '全店舗シフト閲覧', '複数店舗の予定を閲覧できます'],
                ['manageSupport', '店舗間応援管理', 'ヘルプ勤務を依頼・承認できます'],
                ['csvExport', 'CSV出力', 'シフト予定のCSVを書き出せます'],
              ] as const).map(([key, label, description]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{description}</td>
                  <td>
                    <label className="rk-plain-check">
                      <input
                        type="checkbox"
                        checked={permissionScope === 'manager' || perms[key]}
                        disabled={permissionScope === 'manager'}
                        onChange={(event) => setPerms({ ...perms, [key]: event.target.checked })}
                      />
                      {permissionScope === 'manager' ? '常に許可' : '許可'}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'csv-import':
      return (
        <div className="settings-form">
          <p className="muted-sm">スタッフや希望シフトのCSVを読み込みます（1行目はヘッダー）。</p>
          <input type="file" accept=".csv,text/csv" onChange={onImportFile} />
          {importInfo && (
            <dl>
              <dt>読み込み行数</dt><dd>{importInfo.count} 行</dd>
              <dt>プレビュー</dt><dd>{importInfo.sample.map((r, i) => <div key={i} className="muted-sm">{r}</div>)}</dd>
            </dl>
          )}
        </div>
      );

    case 'csv-export':
      return (
        <div className="settings-form">
          <p className="muted-sm">表示中の月の確定シフトをCSVファイルに書き出します。</p>
          <button type="button" className="btn btn-primary" onClick={exportCsv}>CSVをダウンロード</button>
        </div>
      );

    case 'integrations':
      return (
        <div className="settings-form">
          <p className="muted-sm">外部システムとの将来連携を設定します。打刻・給与計算は今回の対象外です。</p>
          {([['pos', 'POS（売上計画）'], ['attendance', '外部LINE通知（将来対応）'], ['payroll', '本社データ連携（将来対応）']] as const).map(([key, label]) => (
            <label key={key} className="menu-check">
              <input type="checkbox" checked={integ[key]} onChange={(e) => setInteg({ ...integ, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      );

    case 'business-hours':
      return <BusinessHoursSection storeId={storeId} />;

    case 'collection-settings':
    case 'shift-settings':
      return (
        <div className="rk-reference-panel rk-collection-settings">
          <div className="rk-status-metrics rk-collection-settings__metrics">
            <article><span>対象年月</span><strong>{collect.targetMonth.replace('-', '/')}</strong></article>
            <article><span>受付状態</span><strong>{collect.status === 'OPEN' ? '受付中' : collect.status === 'BEFORE' ? '開始前' : '終了'}</strong></article>
            <article><span>提出済み</span><strong>{submittedStaff.length}</strong></article>
            <article className="is-warning"><span>未提出</span><strong>{unsubmittedStaff.length}</strong></article>
          </div>

          <div className="rk-filter-card rk-collection-settings__form">
            <label>
              <span>対象年月</span>
              <input
                aria-label="対象年月"
                type="month"
                value={collect.targetMonth}
                onChange={(event) => setCollect({ ...collect, targetMonth: event.target.value })}
              />
            </label>
            <label>
              <span>シフト周期</span>
              <select aria-label="シフト周期" value={collect.cycle} onChange={(event) => setCollect({ ...collect, cycle: event.target.value as typeof collect.cycle })}>
                <option value="month">1か月</option>
                <option value="half-month">半月</option>
              </select>
            </label>
            <label>
              <span>受付状態</span>
              <select aria-label="受付状態" value={collect.status} onChange={(event) => setCollect({ ...collect, status: event.target.value as CollectionStatus })}>
                <option value="BEFORE">受付開始前</option>
                <option value="OPEN">受付中</option>
                <option value="CLOSED">受付終了</option>
              </select>
            </label>
            <label>
              <span>通知回数</span>
              <select aria-label="提出依頼の通知回数" value={collect.reminders} onChange={(event) => setCollect({ ...collect, reminders: Number(event.target.value) })}>
                {[0, 1, 2, 3, 5].map((value) => (
                  <option key={value} value={value}>{value === 0 ? '送らない' : `${value} 回`}</option>
                ))}
              </select>
            </label>
            <label>
              <span>提出開始日時</span>
              <input
                aria-label="提出開始日時"
                type="datetime-local"
                value={collect.startAt}
                onChange={(event) => setCollect({ ...collect, startAt: event.target.value })}
              />
            </label>
            <label>
              <span>提出期限</span>
              <input
                aria-label="提出期限"
                type="datetime-local"
                value={collect.deadlineAt}
                onChange={(event) => setCollect({ ...collect, deadlineAt: event.target.value })}
              />
            </label>
            <label>
              <span>公開予定日</span>
              <input
                aria-label="シフト公開予定日"
                type="datetime-local"
                value={collect.publishAt}
                onChange={(event) => setCollect({ ...collect, publishAt: event.target.value })}
              />
            </label>
            <button type="button" className="tb-btn rk-filter-card__submit" onClick={() => showToast('シフト回収設定を保存しました')}>
              シフト回収設定を保存
            </button>
          </div>

          <div className="rk-table-scroll">
            <table className="rk-reference-table rk-compact-table">
              <thead>
                <tr>
                  <th scope="col">設定項目</th>
                  <th scope="col">現在値</th>
                  <th scope="col">スタッフ画面での扱い</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">提出期間</th>
                  <td>{collect.startAt.replace('T', ' ')} 〜 {collect.deadlineAt.replace('T', ' ')}</td>
                  <td>受付中・期限までの日数を表示</td>
                </tr>
                <tr>
                  <th scope="row">公開予定</th>
                  <td>{collect.publishAt.replace('T', ' ')}</td>
                  <td>公開後に確定シフトを表示</td>
                </tr>
                <tr>
                  <th scope="row">リマインド</th>
                  <td>{collect.reminders === 0 ? '送らない' : `${collect.reminders} 回`}</td>
                  <td>未提出者へ通知</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'collection':
      return (
        <div className="rk-reference-panel rk-collection-status">
          <div className="rk-status-metrics">
            <article><span>対象スタッフ</span><strong>{targetStaff.length}</strong></article>
            <article><span>提出済み</span><strong>{submittedStaff.length}</strong></article>
            <article className="is-warning"><span>未提出</span><strong>{unsubmittedStaff.length}</strong></article>
            <article><span>下書き</span><strong>0</strong></article>
            <article><span>変更申請中</span><strong>0</strong></article>
          </div>
          <div className="rk-ref-toolbar rk-collection-status__actions">
            <label>
              <span>対象月</span>
              <input aria-label="回収状況の対象月" type="month" value={collect.targetMonth} onChange={(event) => setCollect({ ...collect, targetMonth: event.target.value })} />
            </label>
            <span>期限 {collect.deadlineAt.replace('T', ' ')}</span>
            <button type="button" className="tb-btn" onClick={() => showToast(`${unsubmittedStaff.length}名へリマインドを送りました`)}>
              未提出者へ一括通知
            </button>
          </div>
          <div className="rk-table-scroll">
            <table className="rk-reference-table rk-compact-table">
              <thead>
                <tr>
                  <th scope="col">スタッフ</th>
                  <th scope="col">雇用形態</th>
                  <th scope="col">提出状態</th>
                  <th scope="col">提出対象</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {targetStaff.map((person) => {
                  const submitted = submittedStaffIds.has(person.id);
                  const latestRequest = requests
                    .filter((request) => request.staffId === person.id && request.date.startsWith(collect.targetMonth))
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  return (
                    <tr key={person.id}>
                      <th scope="row">{person.name}</th>
                      <td>{person.employmentType}</td>
                      <td>
                        <span className={submitted ? 'rk-status-tag is-submitted' : 'rk-status-tag is-unsubmitted'}>
                          {submitted ? '提出済み' : '未提出'}
                        </span>
                      </td>
                      <td>{latestRequest ? `${mdLabel(latestRequest.date)} まで確認` : collect.targetMonth}</td>
                      <td>
                        {!submitted ? (
                          <button type="button" className="tb-btn sm" onClick={() => showToast(`${person.name}さんへリマインドを送りました`)}>
                            通知
                          </button>
                        ) : (
                          <button type="button" className="tb-btn sm" onClick={() => showToast(`${person.name}さんの提出内容を確認しました`)}>
                            確認
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'notification-settings':
      return (
        <div className="settings-form">
          {([['onConfirm', 'シフト確定時に通知'], ['onRecruit', '追加募集時に通知'], ['onChange', '確定後の変更を通知']] as const).map(([key, label]) => (
            <label key={key} className="menu-check">
              <input type="checkbox" checked={notify[key]} onChange={(e) => setNotify({ ...notify, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      );

    case 'display-settings':
      return (
        <div className="rk-reference-panel rk-settings-page">
          <div className="rk-ref-toolbar">
            <label>
              <span>初期表示</span>
              <select
                aria-label="シフト表の初期表示"
                value={displayDefaults.initialView}
                onChange={(event) => setDisplayDefaults({
                  ...displayDefaults,
                  initialView: event.target.value as DisplayDefaults['initialView'],
                })}
              >
                <option value="day">日</option>
                <option value="week">週</option>
                <option value="half-month">半月</option>
                <option value="month">月</option>
              </select>
            </label>
            <label>
              <span>表の幅</span>
              <select
                aria-label="シフト表の幅"
                value={displayDefaults.tableWidth}
                onChange={(event) => setDisplayDefaults({
                  ...displayDefaults,
                  tableWidth: event.target.value as DisplayDefaults['tableWidth'],
                })}
              >
                <option value="wide">広め</option>
                <option value="standard">標準</option>
              </select>
            </label>
          </div>

          <div className="rk-settings-split">
            <div className="rk-settings-box">
              <h3>文字サイズ</h3>
              <p className="muted-sm">店長が見やすい大きさに切り替えます。現在の設定を標準にしています。</p>
              {FONT_SIZES.map((f) => (
                <label key={f.value} className="rk-plain-check">
                  <input type="radio" name="fontsize" checked={fontSize === f.value} onChange={() => setFontSize(f.value)} />
                  {f.label}
                </label>
              ))}
            </div>

            <div className="rk-settings-box">
              <h3>初期表示項目</h3>
              {([
                ['showRequests', '希望シフトを表示'],
                ['showNotes', '勤務メモを表示'],
                ['showSummary', '売上・人件費などの集計行を表示'],
              ] as const).map(([key, label]) => (
                <label key={key} className="rk-plain-check">
                  <input
                    type="checkbox"
                    checked={displayDefaults[key]}
                    onChange={(event) => setDisplayDefaults({ ...displayDefaults, [key]: event.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className={`rk-display-preview rk-display-preview--${fontSize}`}>
            <div className="rk-display-preview__head">
              <span>プレビュー</span>
              <strong>{displayDefaults.initialView === 'half-month' ? '半月' : displayDefaults.initialView === 'month' ? '月' : displayDefaults.initialView === 'week' ? '週' : '日'}表示</strong>
            </div>
            <table>
              <tbody>
                <tr>
                  <th>田中太郎</th>
                  <td><span className="rk-preview-chip is-early">早番</span></td>
                  <td><span className="rk-preview-chip is-late">遅番</span></td>
                  <td><span className="rk-preview-chip is-off">休み</span></td>
                </tr>
                {displayDefaults.showRequests && (
                  <tr>
                    <th>希望</th>
                    <td>早番希望</td>
                    <td>どちらでも可</td>
                    <td>休み希望</td>
                  </tr>
                )}
                {displayDefaults.showNotes && (
                  <tr>
                    <th>メモ</th>
                    <td colSpan={3}>早番大丈夫です。閉店作業は応援依頼中。</td>
                  </tr>
                )}
                {displayDefaults.showSummary && (
                  <tr>
                    <th>集計</th>
                    <td>27.0h</td>
                    <td>¥29,700</td>
                    <td>不足なし</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'model-shift':
      return (
        <div className="rk-model-editor">
          <p className="muted-sm">
            指定の時間帯に、曜日ごとの必要人数を事前設定します。シフト表の「全体モデルシフト」に
            各日の必要数（x/<strong>y</strong>）として反映されます。
          </p>
          <label className="settings-row rk-model-editor__pos">
            <span>ポジション</span>
            <select value={modelPos} onChange={(e) => setModelPos(e.target.value)}>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <table className="rk-model-grid">
            <thead>
              <tr>
                <th scope="col">時間帯</th>
                {WEEKDAY_COLUMNS.map((col) => (
                  <th
                    scope="col"
                    key={col.index}
                    className={col.index === 0 ? 'is-sun' : col.index === 6 ? 'is-sat' : ''}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODEL_BANDS.map((band) => (
                <tr key={band.key}>
                  <th scope="row">{band.label}</th>
                  {WEEKDAY_COLUMNS.map((col) => (
                    <td key={col.index}>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        aria-label={`${band.label} ${col.label}曜の必要人数`}
                        value={modelRequired[band.key][col.index]}
                        onChange={(e) => setModelCell(band.key, col.index, Number(e.target.value))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'recruitment':
      return (
        <div className="rk-reference-panel rk-recruitment-page">
          <p className="muted-sm">
            人手が足りない日にメッセージ付きで追加募集を出します。シフト表ツールバーの「追加募集◯件」に反映されます。
          </p>
          <div className="rk-filter-card">
            <label>
              <span>募集日</span>
              <select aria-label="募集日" value={activeRecruitDate} onChange={(event) => setRecruitDate(event.target.value)}>
                {dates.map((date) => <option key={date} value={date}>{mdLabel(date)}({weekdayLabels[new Date(date).getDay()]})</option>)}
              </select>
            </label>
            <label>
              <span>ポジション</span>
              <select aria-label="追加募集ポジション" value={recruitmentPosition} onChange={(event) => setRecruitmentPosition(event.target.value)}>
                {positions.map((positionName) => <option key={positionName} value={positionName}>{positionName}</option>)}
              </select>
            </label>
            <label>
              <span>雇用形態</span>
              <select aria-label="追加募集雇用形態" value={alertEmployment} onChange={(event) => setAlertEmployment(event.target.value)}>
                {employmentTypes.map((employment) => <option key={employment} value={employment}>{employment}</option>)}
              </select>
            </label>
            <label className="rk-filter-card__wide">
              <span>メッセージ</span>
              <input
                aria-label="募集メッセージ"
                placeholder="例：18時以降ホール1名募集"
                value={recruitMsg}
                onChange={(event) => setRecruitMsg(event.target.value)}
              />
            </label>
            <button type="button" className="tb-btn rk-filter-card__submit" onClick={() => void addRecruit()}>
              募集を追加
            </button>
          </div>

          <div className="rk-table-scroll">
            <table className="rk-reference-table rk-compact-table">
              <thead>
                <tr>
                  <th scope="col">募集日</th>
                  <th scope="col">ポジション</th>
                  <th scope="col">募集内容</th>
                  <th scope="col">表示状態</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {recruitments.filter((item) => item.message.trim()).length === 0 ? (
                  <tr>
                    <td>{mdLabel(activeRecruitDate)}</td>
                    <td>{recruitmentPosition}</td>
                    <td>現在この月の追加募集はありません。</td>
                    <td>未掲載</td>
                    <td>—</td>
                  </tr>
                ) : (
                  recruitments
                    .filter((item) => item.message.trim())
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((item) => (
                      <tr key={item.date}>
                        <th scope="row">{mdLabel(item.date)}({weekdayLabels[new Date(item.date).getDay()]})</th>
                        <td>{recruitmentPosition}</td>
                        <td>{item.message}</td>
                        <td>掲載中</td>
                        <td>
                          <button type="button" className="tb-btn sm" onClick={() => void setRecruitment(item.date, '')}>
                            削除
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'confirmed-shifts':
      return (
        <div className="rk-info-panel">
          <h3>確定と公開は別の操作です</h3>
          <ol>
            <li>シフト表で内容を調整します。</li>
            <li>「シフト確定」で編集案を確定します。この時点ではスタッフへ表示されません。</li>
            <li>「スタッフへ公開」で初めてスタッフ画面へ反映されます。</li>
          </ol>
        </div>
      );

    case 'messages':
      return (
        <div className="rk-message-screen">
          <div className="rk-message-screen__top">
            <h3>メッセージ</h3>
            <button
              type="button"
              className="tb-btn primary"
              onClick={() => setBroadcastOpen(true)}
            >
              一斉送信作成
            </button>
          </div>

          <div className="rk-message-board" aria-label="アプリ内メッセージ">
            <aside className="rk-message-list" aria-label="メッセージ一覧">
              <div className="rk-message-list__tools">
                <label className="rk-message-search">
                  <span className="sr-only">氏名で検索</span>
                  <input
                    aria-label="氏名で検索"
                    value={messageSearch}
                    placeholder="氏名で検索"
                    onChange={(event) => setMessageSearch(event.target.value)}
                  />
                </label>
                <button type="button" className="tb-btn">絞り込み</button>
              </div>
              <label className="rk-message-unread">
                <input
                  type="checkbox"
                  checked={messageUnreadOnly}
                  onChange={(event) => setMessageUnreadOnly(event.target.checked)}
                />
                未読のみ
              </label>

              <div className="rk-message-list__items">
                {filteredMessageThreads.map((thread) => (
                  <button
                    type="button"
                    key={thread.id}
                    className={`rk-message-thread${activeMessageThread?.id === thread.id ? ' is-active' : ''}`}
                    onClick={() => setSelectedMessageId(thread.id)}
                  >
                    <span className="rk-message-avatar" aria-hidden="true">名</span>
                    <span className="rk-message-thread__body">
                      <span className="rk-message-thread__name">{thread.name}</span>
                      <span className="rk-message-thread__preview">{thread.preview}</span>
                    </span>
                    <span className="rk-message-thread__meta">
                      {thread.unread && <span className="rk-message-unread-dot" aria-label="未読" />}
                      <span>{thread.unreadMinutes}分前</span>
                    </span>
                  </button>
                ))}
                {filteredMessageThreads.length === 0 && (
                  <p className="rk-message-empty">条件に一致するメッセージはありません。</p>
                )}
              </div>
            </aside>

            <section className="rk-message-chat" aria-label="会話">
              {activeMessageThread ? (
                <>
                  <header className="rk-message-chat__head">
                    <h4>{activeMessageThread.name}</h4>
                    <div className="rk-message-chat__tags">
                      <span>個別</span>
                      {activeMessageThread.tags.map((tag) => <span key={tag}>{tag}</span>)}
                      <span>履歴</span>
                    </div>
                  </header>
                  <div className="rk-message-chat__timeline">
                    <div className="rk-message-day">昨日</div>
                    {activeMessageThread.messages.map((message) => {
                      const self = message.sender === 'manager';
                      return (
                        <div
                          key={message.id}
                          className={`rk-message-bubble-row ${self ? 'is-self' : 'is-other'} is-${message.sender}`}
                        >
                          {self ? (
                            <>
                              <time>{message.time}</time>
                              <div className="rk-message-bubble">
                                {message.label && <span className="rk-message-bubble__label">{message.label}</span>}
                                <p>{message.text}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="rk-message-avatar sm" aria-hidden="true">名</span>
                              <div className="rk-message-bubble">
                                {message.label && <span className="rk-message-bubble__label">{message.label}</span>}
                                <p>{message.text}</p>
                              </div>
                              <time>{message.time}</time>
                            </>
                          )}
                        </div>
                      );
                    })}
                    <div className="rk-message-day">今日</div>
                  </div>
                  <div className="rk-message-input">
                    <button type="button" aria-label="添付" className="rk-message-attach">＋</button>
                    <input
                      aria-label="メッセージを入力"
                      placeholder="メッセージを入力"
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') sendMessage();
                      }}
                    />
                    <button type="button" className="rk-message-send" onClick={sendMessage} disabled={!messageDraft.trim()}>
                      送信
                    </button>
                  </div>
                </>
              ) : (
                <p className="rk-message-empty">スタッフが登録されるとメッセージを表示できます。</p>
              )}
            </section>
          </div>
          {broadcastOpen && (
            <div className="rk-broadcast-dialog" role="dialog" aria-modal="true" aria-label="一斉送信作成">
              <div className="rk-broadcast-dialog__box">
                <header>
                  <h4>一斉送信作成</h4>
                  <button type="button" aria-label="閉じる" onClick={() => setBroadcastOpen(false)}>×</button>
                </header>
                <label>
                  <span>送信先</span>
                  <select aria-label="一斉送信先" defaultValue="all">
                    <option value="all">全スタッフ</option>
                    <option value="unsubmitted">未提出者</option>
                    <option value="selected">表示中のスタッフ</option>
                  </select>
                </label>
                <label>
                  <span>本文</span>
                  <textarea
                    aria-label="一斉送信本文"
                    value={broadcastText}
                    onChange={(event) => setBroadcastText(event.target.value)}
                  />
                </label>
                <div className="rk-broadcast-dialog__actions">
                  <button type="button" className="tb-btn" onClick={() => setBroadcastOpen(false)}>キャンセル</button>
                  <button type="button" className="tb-btn primary" onClick={sendBroadcastMessage} disabled={!broadcastText.trim()}>
                    送信
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );

    case 'fixed-shifts':
      return (
        <div className="rk-reference-panel rk-fixed-shifts">
          <div className="rk-status-metrics rk-fixed-shifts__metrics">
            <article><span>固定条件</span><strong>{fixedShiftRules.length}</strong></article>
            <article><span>対象スタッフ</span><strong>{targetStaff.length}</strong></article>
            <article><span>表示月</span><strong>{month.replace('-', '/')}</strong></article>
            <article><span>勤務枠</span><strong>早/遅/休</strong></article>
          </div>
          <p className="muted-sm">繰り返し条件を登録し、対象月の希望またはシフト案へコピーできます。</p>
          <div className="rk-filter-card rk-fixed-shifts__form">
            <label>
              <span>スタッフ</span>
              <select aria-label="スタッフ" value={fixedStaffId} onChange={(event) => setFixedStaffId(event.target.value)}>
                <option value="">選択</option>
                {targetStaff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </label>
            <label>
              <span>周期</span>
              <select aria-label="固定シフト周期" value={fixedFrequency} onChange={(event) => setFixedFrequency(event.target.value as typeof fixedFrequency)}>
                <option value="every">毎週</option>
                <option value="second-fourth">第2・第4</option>
              </select>
            </label>
            <label>
              <span>曜日</span>
              <select aria-label="曜日" value={fixedWeekday} onChange={(event) => setFixedWeekday(Number(event.target.value))}>
                {weekdayLabels.map((label, index) => <option key={label} value={index}>{label}曜日</option>)}
              </select>
            </label>
            <label>
              <span>勤務</span>
              <select aria-label="固定シフト勤務" value={fixedValue} onChange={(event) => setFixedValue(event.target.value as typeof fixedValue)}>
                <option value="early">{shiftPatterns.early.label}</option>
                <option value="late">{shiftPatterns.late.label}</option>
                <option value="off">休み</option>
              </select>
            </label>
            <button
              type="button"
              className="tb-btn"
              onClick={() => {
                if (!fixedStaffId) { showToast('スタッフを選択してください'); return; }
                setFixedShiftRules([...fixedShiftRules, {
                  id: `${Date.now()}`,
                  staffId: fixedStaffId,
                  weekday: fixedWeekday,
                  frequency: fixedFrequency,
                  value: fixedValue,
                }]);
              }}
            >
              固定シフトを追加
            </button>
          </div>
          <div className="rk-table-scroll">
            <table className="rk-reference-table rk-compact-table">
              <thead>
                <tr>
                  <th scope="col">スタッフ</th>
                  <th scope="col">周期</th>
                  <th scope="col">曜日</th>
                  <th scope="col">勤務</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {fixedShiftRules.length === 0 ? (
                  <tr>
                    <td>未登録</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>上の条件から登録できます</td>
                  </tr>
                ) : fixedShiftRules.map((rule) => (
                  <tr key={rule.id}>
                    <th scope="row">{staff.find((person) => person.id === rule.staffId)?.name}</th>
                    <td>{rule.frequency === 'every' ? '毎週' : '第2・第4'}</td>
                    <td>{weekdayLabels[rule.weekday]}曜日</td>
                    <td>{rule.value === 'off' ? '休み' : shiftPatterns[rule.value].label}</td>
                    <td>
                      <button type="button" className="tb-btn sm" onClick={() => setFixedShiftRules(fixedShiftRules.filter((item) => item.id !== rule.id))}>
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="tb-btn rk-fixed-shifts__copy" onClick={() => showToast(`${month}のシフト案へ固定シフトをコピーしました`)}>
            表示月のシフト案へコピー
          </button>
        </div>
      );

    case 'shift-patterns':
      return <ShiftPatternsSection storeId={storeId} />;

    case 'color-settings':
      return <ColorSettingsSection storeId={storeId} />;

    case 'store-help':
      return (
        <div className="rk-reference-panel rk-support-page">
          <div className="rk-support-page__mode">
            <select aria-label="ヘルプ機能" value={supportMenu} onChange={(event) => setSupportMenu(event.target.value)}>
              <option value="ヘルプ要請登録">ヘルプ要請登録</option>
              <option value="ヘルプ勤務一覧">ヘルプ勤務一覧</option>
            </select>
            <select aria-label="ヘルプ表示月" value={supportMonth} onChange={(event) => setSupportMonth(event.target.value)}>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <span>ヘルプ勤務を登録・確認します。</span>
          </div>

          <p className="muted-sm">所属店舗と応援先を分けて管理します。同時間帯の重複は確定前に警告対象となります。</p>
          <div className="rk-filter-card rk-filter-card--support">
            <label>
              <span>ヘルプ先所属事業部</span>
              <select aria-label="ヘルプ先所属事業部" value={alertDept} onChange={(event) => setAlertDept(event.target.value)}>
                {businessUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label>
              <span>ヘルプ先店舗</span>
              <select aria-label="ヘルプ先店舗" value={supportStoreId} onChange={(event) => setSupportStoreId(event.target.value)}>
                <option value="">選択</option>
                {stores.filter((store) => String(store.id) !== String(storeId)).map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>スタッフ</span>
              <select aria-label="ヘルプスタッフ" value={supportStaffId} onChange={(event) => setSupportStaffId(event.target.value)}>
                <option value="">選択</option>
                {targetStaff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </label>
            <label>
              <span>勤務日</span>
              <input type="date" value={supportDate} onChange={(event) => setSupportDate(event.target.value)} />
            </label>
            <label>
              <span>ポジション名</span>
              <select aria-label="ヘルプポジション" value={supportRole} onChange={(event) => setSupportRole(event.target.value)}>
                {positions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>備考</span>
              <input value={supportNote} onChange={(event) => setSupportNote(event.target.value)} />
            </label>
            <button
              type="button"
              className="tb-btn rk-filter-card__submit"
              onClick={() => {
                if (!supportStaffId || !supportStoreId || !supportDate) {
                  showToast('スタッフ・応援先・勤務日を入力してください');
                  return;
                }
                setSupportPlans([...supportPlans, {
                  id: `${Date.now()}`,
                  staffId: supportStaffId,
                  destinationStoreId: supportStoreId,
                  date: supportDate,
                  start: shiftPatterns.early.start,
                  end: shiftPatterns.early.end,
                  role: supportRole.trim() || '接客',
                  status: 'REQUESTED',
                  note: supportNote.trim(),
                }]);
                setSupportNote('');
              }}
            >
              上記の条件で登録
            </button>
          </div>
          <div className="rk-table-scroll">
            <table className="rk-reference-table rk-support-table">
              <thead>
                <tr>
                  <th scope="col">ヘルプ勤務日</th>
                  <th scope="col">ヘルプ可能時間</th>
                  <th scope="col">氏名</th>
                  <th scope="col">ヘルプ先店舗</th>
                  <th scope="col">ポジション</th>
                  <th scope="col">状態</th>
                  <th scope="col">備考</th>
                </tr>
              </thead>
              <tbody>
                {supportPlans.length === 0 ? (
                  <tr>
                    <td>{mdLabel(dates[0] ?? `${month}-01`)}</td>
                    <td>{shiftPatterns.early.start}〜{shiftPatterns.early.end}</td>
                    <td>未登録</td>
                    <td>{stores.find((store) => String(store.id) !== String(storeId))?.name ?? 'ヘルプ先'}</td>
                    <td>{positions[0] ?? 'ホール'}</td>
                    <td>未依頼</td>
                    <td>上の条件から登録できます</td>
                  </tr>
                ) : supportPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td>{mdLabel(plan.date)}</td>
                    <td>{plan.start}〜{plan.end}</td>
                    <td>{staff.find((person) => person.id === plan.staffId)?.name}</td>
                    <td>{stores.find((store) => store.id === plan.destinationStoreId)?.name}</td>
                    <td>{plan.role}</td>
                    <td>
                      <button
                        type="button"
                        className="tb-btn sm"
                        onClick={() => setSupportPlans(supportPlans.map((item) => (
                          item.id === plan.id ? { ...item, status: 'APPROVED' } : item
                        )))}
                      >
                        {plan.status === 'APPROVED' ? '承認済み' : '承認'}
                      </button>
                    </td>
                    <td>{plan.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    default:
      return null;
  }
}
