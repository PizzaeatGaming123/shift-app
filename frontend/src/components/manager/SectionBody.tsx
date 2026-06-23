import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { useToast } from '../ui/Toast';
import { useSetting } from '../../lib/settings';
import { getMonthDates } from '../../lib/date';
import {
  dailyWorkHours,
  dailyLaborCost,
  staffMonthlyHours,
  maxConsecutiveAssignedDays,
} from '../../store/labor';
import { isAssigned, countAssigned } from '../../store/assignments';
import { buildScheduleCsv, downloadCsv } from '../../lib/csv';
import {
  WORK_SLOTS,
  SLOT_LABELS,
  SLOT_HOURS,
  HOURLY_WAGE,
  DAILY_SALES_TARGET,
} from '../../constants';
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
  isValidShiftPattern,
  shiftPatternHours,
  shiftPatternSettingKey,
  type ShiftPatterns,
} from '../../lib/shiftPatterns';

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
  attendance: '勤怠',
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

  const [salesTarget, setSalesTarget] = useSetting(`akiyume-sales:${storeId}`, DAILY_SALES_TARGET);
  const [positions, setPositions] = useSetting<string[]>(`akiyume-positions:${storeId}`, ['ホール', 'キッチン']);
  const [openHours, setOpenHours] = useSetting(`akiyume-hours:${storeId}`, { open: '09:00', close: '23:00' });
  const collectionDefaults = createDefaultCollectionSettings(month);
  const [storedCollect, setCollect] = useSetting(
    collectionSettingKey(storeId),
    collectionDefaults,
  );
  const collect = { ...collectionDefaults, ...storedCollect };
  const [notify, setNotify] = useSetting(`akiyume-notify:${storeId}`, { onConfirm: true, onRecruit: true, onChange: false });
  const [integ, setInteg] = useSetting(`akiyume-integ:${storeId}`, { pos: false, attendance: false, payroll: false });
  const [fontSize, setFontSize] = useSetting<'small' | 'standard' | 'large'>(`akiyume-fontsize:${storeId}`, 'standard');
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
  const [storedShiftPatterns, setStoredShiftPatterns] = useSetting<ShiftPatterns>(
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
  const [appNotices, setAppNotices] = useSetting(
    `akiyume-notices:${storeId}`,
    [
      { id: 'publish', title: 'シフト公開', detail: '公開時に対象スタッフへ通知します。', enabled: true },
      { id: 'change', title: '公開済みシフト変更', detail: '変更対象スタッフへ確認依頼を通知します。', enabled: true },
      { id: 'support', title: '応援勤務依頼', detail: '依頼・承認時に対象者へ通知します。', enabled: true },
    ],
  );
  const shiftPatterns = storedShiftPatterns;
  const configuredSlotHours = {
    early: shiftPatternHours(shiftPatterns.early) || SLOT_HOURS.early,
    late: shiftPatternHours(shiftPatterns.late) || SLOT_HOURS.late,
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
  const targetStaff = staff.filter((person) => person.role === 'STAFF');
  const submittedStaffIds = new Set(
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
    (sum, date) => sum + dailyLaborCost(assignments, date, configuredSlotHours),
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
      return (
        <ul className="modal-list">
          {staff.map((s) => {
            const consec = maxConsecutiveAssignedDays(assignments, s.id, dates);
            const hrs = staffMonthlyHours(assignments, s.id, dates, configuredSlotHours);
            const alerts = [consec >= 6 ? `連続${consec}日勤務` : '', hrs > 180 ? '労働時間超過' : ''].filter(Boolean);
            return (
              <li key={s.id}>
                <span className="staff-li-main">
                  <span className="staff-li-name">{s.name}<span className="muted-sm">（{s.employmentType}）</span></span>
                  <span className="staff-li-sub">
                    {s.rank != null && <span className="rank-badge">ランク{s.rank}</span>}
                    {s.skills.map((sk) => <span key={sk} className="skill-tag">{sk}</span>)}
                    {alerts.map((a) => <span key={a} className="alert-tag">労務注意：{a}</span>)}
                  </span>
                </span>
                <span className="staff-li-hours">{hrs.toFixed(2)} h</span>
              </li>
            );
          })}
        </ul>
      );

    case 'staff-registration':
    case 'manager-registration': {
      const isAdmin = section === 'manager-registration';
      return (
        <div className="settings-form">
          <p className="muted-sm">
            {isAdmin ? '管理者（店長）を登録します。' : 'スタッフを登録します。'}
            氏名と雇用形態を入力してください。初期パスワードは「password」です。
          </p>
          <label className="settings-row">
            <span>氏名</span>
            <input className="text-input" value={regName} placeholder="例：山田太郎" onChange={(e) => setRegName(e.target.value)} />
          </label>
          <label className="settings-row">
            <span>雇用形態</span>
            <select value={regType} onChange={(e) => setRegType(e.target.value)}>
              <option value="正社員">正社員</option>
              <option value="パート">パート</option>
              <option value="アルバイト">アルバイト</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void submitRegister(isAdmin ? 'MANAGER' : 'STAFF')}
          >
            {isAdmin ? '管理者を登録' : 'スタッフを登録'}
          </button>
        </div>
      );
    }

    case 'rank-settings':
      return <RankSkillScreen initialTab="rank" />;

    case 'skill-settings':
      return <RankSkillScreen initialTab="skill" />;

    case 'sales-plan':
      return (
        <div className="settings-form">
          <p className="muted-sm">1日あたりの売上計画。人件費率の算出に使われます。</p>
          <label className="settings-row">
            <span>売上計画（円/日）</span>
            <input type="number" min={0} step={1000} value={salesTarget}
              onChange={(e) => setSalesTarget(Math.max(0, Number(e.target.value) || 0))} />
          </label>
          <dl>
            <dt>当月売上計画</dt><dd>{yen(monthSales)}</dd>
            <dt>当月人件費（目安）</dt><dd>{yen(totalCost)}（{costRate}%）</dd>
          </dl>
        </div>
      );

    case 'labor-cost':
      return (
        <dl>
          <dt>当月総労働時間</dt><dd>{totalHours.toFixed(2)} h</dd>
          <dt>仮時給</dt><dd>{yen(HOURLY_WAGE)}</dd>
          <dt>当月人件費（目安）</dt><dd>{yen(totalCost)}</dd>
          <dt>人件費率</dt><dd>{costRate}%</dd>
          {WORK_SLOTS.map((slot) => {
            const cnt = dates.reduce((a, d) => a + countAssigned(assignments, d, slot), 0);
            return (
              <div key={slot}>
                <dt>{SLOT_LABELS[slot]} 延べ人数</dt>
                <dd>{cnt} 人（{yen(cnt * configuredSlotHours[slot] * HOURLY_WAGE)}）</dd>
              </div>
            );
          })}
        </dl>
      );

    case 'sales-per-hour':
      return (
        <dl>
          <dt>当月売上計画</dt><dd>{yen(monthSales)}</dd>
          <dt>当月総労働時間</dt><dd>{totalHours.toFixed(2)} h</dd>
          <dt>人時売上高</dt><dd>{yen(salesPerHour)} / h</dd>
        </dl>
      );

    case 'labor-status':
      return (
        <ul className="modal-list">
          {staff.map((s) => {
            const consec = maxConsecutiveAssignedDays(assignments, s.id, dates);
            const hrs = staffMonthlyHours(assignments, s.id, dates, configuredSlotHours);
            return (
              <li key={s.id}>
                <span className="staff-li-name">{s.name}</span>
                <span className="muted-sm">連続最長 {consec}日 / 月間 {hrs.toFixed(0)}h</span>
              </li>
            );
          })}
        </ul>
      );

    case 'attendance':
      return (
        <div>
          <p className="muted-sm">実績勤怠ではなく、確定シフトから算出した勤務予定です。</p>
          <ul className="modal-list">
          {staff.map((s) => (
            <li key={s.id}>
              <span className="staff-li-name">{s.name}</span>
              <span className="muted-sm">勤務予定 {assignedDays(assignments, s.id, dates)} 日</span>
            </li>
          ))}
          </ul>
        </div>
      );

    case 'labor-alerts': {
      const flagged = staff.filter((s) =>
        maxConsecutiveAssignedDays(assignments, s.id, dates) >= 6
        || staffMonthlyHours(assignments, s.id, dates, configuredSlotHours) > 180);
      return flagged.length === 0
        ? <p>現在、シフト上の予定時間・連続勤務の警告対象はいません。</p>
        : (
          <ul className="modal-list">
            {flagged.map((s) => (
              <li key={s.id}>
                <span className="staff-li-name">{s.name}</span>
                <span className="alert-tag">
                  連続{maxConsecutiveAssignedDays(assignments, s.id, dates)}日 / {staffMonthlyHours(assignments, s.id, dates, configuredSlotHours).toFixed(0)}h
                </span>
              </li>
            ))}
          </ul>
        );
    }

    case 'store-management':
      return (
        <ul className="modal-list">
          {stores.map((s) => (
            <li key={s.id}>
              <span className="staff-li-name">
                {s.name}{String(s.id) === String(storeId) && <span className="muted-sm">（表示中）</span>}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'departments':
    case 'positions':
      return (
        <div className="settings-form">
          <p className="muted-sm">この店舗のポジション（部門）を管理します。</p>
          <ul className="modal-list">
            {positions.map((p) => (
              <li key={p}>
                <span className="staff-li-name">{p}</span>
                <button type="button" className="tb-btn sm" onClick={() => setPositions(positions.filter((x) => x !== p))}>削除</button>
              </li>
            ))}
          </ul>
          <label className="settings-row">
            <input className="text-input" placeholder="新しい部門名" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
            <button
              type="button"
              className="tb-btn"
              onClick={() => {
                const v = newDept.trim();
                if (v && !positions.includes(v)) { setPositions([...positions, v]); setNewDept(''); }
              }}
            >
              追加
            </button>
          </label>
        </div>
      );

    case 'permissions':
      return (
        <div className="settings-form">
          <p className="muted-sm">スタッフに許可する操作を設定します（店長は常に全機能）。</p>
          {([
            ['submit', '希望シフトの提出'],
            ['viewOwn', '自分の確定シフトの閲覧'],
            ['viewOthers', '他スタッフのシフトの閲覧'],
            ['postMemo', 'ひとことメモの投稿'],
            ['viewCost', '人件費の閲覧'],
            ['buildOwnStore', '自店舗のシフト作成'],
            ['publishOwnStore', '自店舗のシフト公開'],
            ['changePublished', '公開後のシフト変更'],
            ['approveChanges', '変更申請の承認'],
            ['manageStaff', 'スタッフ管理'],
            ['manageSkills', 'スキル管理'],
            ['manageRequired', '必要人数設定'],
            ['viewAllStores', '全店舗シフト閲覧'],
            ['manageSupport', '店舗間応援管理'],
            ['csvExport', 'CSV出力'],
          ] as const).map(([key, label]) => (
            <label key={key} className="menu-check">
              <input type="checkbox" checked={perms[key]} onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
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
      return (
        <div className="settings-form">
          <label className="settings-row"><span>開店時刻</span>
            <input type="time" value={openHours.open} onChange={(e) => setOpenHours({ ...openHours, open: e.target.value })} /></label>
          <label className="settings-row"><span>閉店時刻</span>
            <input type="time" value={openHours.close} onChange={(e) => setOpenHours({ ...openHours, close: e.target.value })} /></label>
        </div>
      );

    case 'collection-settings':
    case 'shift-settings':
      return (
        <div className="rk-collection-settings">
          <div className="rk-collection-preview">
            <h3>シフト回収プレビュー</h3>
            <div className="rk-collection-preview__cards">
              <article>
                <strong>{collect.targetMonth.replace('-', '年')}月</strong>
                <span>受付開始 {collect.startAt.replace('T', ' ')}</span>
              </article>
              <span aria-hidden="true">›</span>
              <article>
                <strong>提出期限</strong>
                <span>{collect.deadlineAt.replace('T', ' ')}</span>
              </article>
            </div>
          </div>
          <div className="rk-collection-form">
            <label className="rk-field">
              <span className="rk-field__label">対象年月</span>
              <input
                className="rk-field__input"
                type="month"
                value={collect.targetMonth}
                onChange={(event) => setCollect({ ...collect, targetMonth: event.target.value })}
              />
            </label>

            <fieldset className="rk-field">
              <legend className="rk-field__label">シフト周期</legend>
              <div className="rk-segments" role="radiogroup">
                {([
                  ['month', '1か月'],
                  ['half-month', '半月'],
                ] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    role="radio"
                    aria-checked={collect.cycle === value}
                    className={`rk-segment${collect.cycle === value ? ' is-on' : ''}`}
                    onClick={() => setCollect({ ...collect, cycle: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="rk-field">
              <span className="rk-field__label">提出開始日時</span>
              <input
                className="rk-field__input"
                type="datetime-local"
                value={collect.startAt}
                onChange={(event) => setCollect({ ...collect, startAt: event.target.value })}
              />
            </label>

            <label className="rk-field">
              <span className="rk-field__label">提出期限</span>
              <input
                className="rk-field__input"
                type="datetime-local"
                value={collect.deadlineAt}
                onChange={(event) => setCollect({ ...collect, deadlineAt: event.target.value })}
              />
            </label>

            <label className="rk-field">
              <span className="rk-field__label">シフト公開予定日</span>
              <input
                className="rk-field__input"
                type="datetime-local"
                value={collect.publishAt}
                onChange={(event) => setCollect({ ...collect, publishAt: event.target.value })}
              />
            </label>

            <fieldset className="rk-field">
              <legend className="rk-field__label">受付状態</legend>
              <div className="rk-segments" role="radiogroup">
                {([
                  ['BEFORE', '受付開始前'],
                  ['OPEN', '受付中'],
                  ['CLOSED', '受付終了'],
                ] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    role="radio"
                    aria-checked={collect.status === value}
                    className={`rk-segment${collect.status === value ? ' is-on' : ''}`}
                    onClick={() => setCollect({ ...collect, status: value as CollectionStatus })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="rk-field">
              <legend className="rk-field__label">提出依頼の通知回数</legend>
              <p className="rk-field__hint">提出開始から期限までの間に、未提出スタッフへ送るリマインド数。</p>
              <div className="rk-segments" role="radiogroup">
                {[0, 1, 2, 3, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    role="radio"
                    aria-checked={collect.reminders === value}
                    className={`rk-segment${collect.reminders === value ? ' is-on' : ''}`}
                    onClick={() => setCollect({ ...collect, reminders: value })}
                  >
                    {value === 0 ? '送らない' : `${value} 回`}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      );

    case 'collection':
      return (
        <div className="rk-collection-status">
          <div className="rk-status-metrics">
            <article><span>対象スタッフ</span><strong>{targetStaff.length}</strong></article>
            <article><span>提出済み</span><strong>{submittedStaff.length}</strong></article>
            <article className="is-warning"><span>未提出</span><strong>{unsubmittedStaff.length}</strong></article>
            <article><span>下書き</span><strong>0</strong></article>
            <article><span>変更申請中</span><strong>0</strong></article>
          </div>
          <div className="rk-collection-status__actions">
            <span>対象月 {collect.targetMonth} / 期限 {collect.deadlineAt.replace('T', ' ')}</span>
            <button type="button" className="tb-btn" onClick={() => showToast(`${unsubmittedStaff.length}名へリマインドを送りました`)}>
              未提出者へ一括通知
            </button>
          </div>
          <ul className="modal-list">
            {targetStaff.map((s) => {
              const submitted = submittedStaffIds.has(s.id);
              return (
              <li key={s.id}>
                <span className="staff-li-name">{s.name}</span>
                <span className={submitted ? 'rk-status-tag is-submitted' : 'rk-status-tag is-unsubmitted'}>
                  {submitted ? '提出済み' : '未提出'}
                </span>
                {!submitted && (
                  <button type="button" className="tb-btn sm" onClick={() => showToast(`${s.name}さんへリマインドを送りました`)}>
                    通知
                  </button>
                )}
              </li>
              );
            })}
          </ul>
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
        <div className="settings-form">
          <p className="muted-sm">シフト一覧の文字サイズを変更します。シフトを見るだけのときは「小」が便利です。</p>
          {FONT_SIZES.map((f) => (
            <label key={f.value} className="menu-check">
              <input type="radio" name="fontsize" checked={fontSize === f.value} onChange={() => setFontSize(f.value)} />
              {f.label}
            </label>
          ))}
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
        <div className="settings-form">
          <p className="muted-sm">
            人手が足りない日にメッセージ付きで追加募集を出します。シフト表ツールバーの「追加募集◯件」に反映されます。
          </p>
          <label className="settings-row">
            <span>募集日</span>
            <select aria-label="募集日" value={activeRecruitDate} onChange={(e) => setRecruitDate(e.target.value)}>
              {dates.map((d) => <option key={d} value={d}>{mdLabel(d)}</option>)}
            </select>
          </label>
          <label className="settings-row">
            <span>メッセージ</span>
            <input
              className="text-input"
              aria-label="募集メッセージ"
              placeholder="例：18時以降ホール1名募集"
              value={recruitMsg}
              onChange={(e) => setRecruitMsg(e.target.value)}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={() => void addRecruit()}>募集を追加</button>
          <ul className="modal-list">
            {recruitments.filter((r) => r.message.trim()).length === 0 ? (
              <li><span className="muted-sm">現在この月の追加募集はありません。</span></li>
            ) : (
              recruitments
                .filter((r) => r.message.trim())
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((r) => (
                  <li key={r.date}>
                    <span className="staff-li-name">{mdLabel(r.date)}　{r.message}</span>
                    <button type="button" className="tb-btn sm" onClick={() => void setRecruitment(r.date, '')}>削除</button>
                  </li>
                ))
            )}
          </ul>
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
        <div className="settings-form">
          <p className="muted-sm">チャットではなく、シフトに関するアプリ内通知を管理します。</p>
          <ul className="modal-list">
            {appNotices.map((notice) => (
              <li key={notice.id}>
                <span className="staff-li-main">
                  <span className="staff-li-name">{notice.title}</span>
                  <span className="muted-sm">{notice.detail}</span>
                </span>
                <label className="menu-check">
                  <input
                    type="checkbox"
                    checked={notice.enabled}
                    onChange={(event) => setAppNotices(appNotices.map((item) => (
                      item.id === notice.id ? { ...item, enabled: event.target.checked } : item
                    )))}
                  />
                  有効
                </label>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'fixed-shifts':
      return (
        <div className="settings-form rk-fixed-shifts">
          <p className="muted-sm">繰り返し条件を登録し、対象月の希望またはシフト案へコピーできます。</p>
          <div className="rk-inline-form">
            <label>スタッフ
              <select value={fixedStaffId} onChange={(event) => setFixedStaffId(event.target.value)}>
                <option value="">選択</option>
                {targetStaff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </label>
            <label>周期
              <select value={fixedFrequency} onChange={(event) => setFixedFrequency(event.target.value as typeof fixedFrequency)}>
                <option value="every">毎週</option>
                <option value="second-fourth">第2・第4</option>
              </select>
            </label>
            <label>曜日
              <select value={fixedWeekday} onChange={(event) => setFixedWeekday(Number(event.target.value))}>
                {weekdayLabels.map((label, index) => <option key={label} value={index}>{label}曜日</option>)}
              </select>
            </label>
            <label>勤務
              <select value={fixedValue} onChange={(event) => setFixedValue(event.target.value as typeof fixedValue)}>
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
          <ul className="modal-list">
            {fixedShiftRules.map((rule) => (
              <li key={rule.id}>
                <span className="staff-li-main">
                  <span className="staff-li-name">{staff.find((person) => person.id === rule.staffId)?.name}</span>
                  <span className="muted-sm">
                    {rule.frequency === 'every' ? '毎週' : '第2・第4'}{weekdayLabels[rule.weekday]}曜日 /
                    {rule.value === 'off' ? '休み' : shiftPatterns[rule.value].label}
                  </span>
                </span>
                <button type="button" className="tb-btn sm" onClick={() => setFixedShiftRules(fixedShiftRules.filter((item) => item.id !== rule.id))}>削除</button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary" onClick={() => showToast(`${month}のシフト案へ固定シフトをコピーしました`)}>
            表示月のシフト案へコピー
          </button>
        </div>
      );

    case 'shift-patterns':
      return (
        <div className="rk-pattern-editor">
          <p className="muted-sm">
            ヒアリングで確認した勤務枠です。変更内容はスタッフ提出と予定時間集計へ反映されます。
          </p>
          <table className="rk-pattern-table">
            <thead>
              <tr>
                <th scope="col">シフトパターン</th>
                <th scope="col">開始</th>
                <th scope="col">終了</th>
                <th scope="col">予定時間</th>
              </tr>
            </thead>
            <tbody>
              {(['early', 'late'] as const).map((slot) => {
                const pattern = shiftPatterns[slot];
                const update = (next: Partial<(typeof pattern)>) => {
                  const candidate = { ...pattern, ...next };
                  setStoredShiftPatterns({
                    ...shiftPatterns,
                    [slot]: candidate,
                  });
                };
                return (
                  <tr key={slot}>
                    <td>
                      <input
                        aria-label={`${slot === 'early' ? '早番' : '遅番'}の名称`}
                        value={pattern.label}
                        onChange={(event) => update({ label: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${pattern.label}の開始時刻`}
                        value={pattern.start}
                        inputMode="numeric"
                        onChange={(event) => update({ start: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${pattern.label}の終了時刻`}
                        value={pattern.end}
                        inputMode="numeric"
                        onChange={(event) => update({ end: event.target.value })}
                      />
                    </td>
                    <td>
                      {isValidShiftPattern(pattern)
                        ? `${shiftPatternHours(pattern).toFixed(1)}時間`
                        : <span className="alert-tag">時刻を確認</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="tb-btn"
            onClick={() => setStoredShiftPatterns(DEFAULT_SHIFT_PATTERNS)}
          >
            ヒアリング時の設定へ戻す
          </button>
        </div>
      );

    case 'color-settings':
      return (
        <div className="settings-form">
          <p className="muted-sm">シフト区分の色分け設定（準備中）。次の実装で対応します。</p>
        </div>
      );

    case 'store-help':
      return (
        <div className="settings-form">
          <p className="muted-sm">所属店舗と応援先を分けて管理します。同時間帯の重複は確定前に警告対象となります。</p>
          <div className="rk-inline-form">
            <label>スタッフ
              <select value={supportStaffId} onChange={(event) => setSupportStaffId(event.target.value)}>
                <option value="">選択</option>
                {targetStaff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </label>
            <label>応援先店舗
              <select value={supportStoreId} onChange={(event) => setSupportStoreId(event.target.value)}>
                <option value="">選択</option>
                {stores.filter((store) => String(store.id) !== String(storeId)).map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </label>
            <label>勤務日
              <input type="date" value={supportDate} onChange={(event) => setSupportDate(event.target.value)} />
            </label>
            <label>役割
              <input value={supportRole} onChange={(event) => setSupportRole(event.target.value)} />
            </label>
            <label>備考
              <input value={supportNote} onChange={(event) => setSupportNote(event.target.value)} />
            </label>
            <button
              type="button"
              className="tb-btn"
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
              応援勤務を依頼
            </button>
          </div>
          <ul className="modal-list">
            {supportPlans.map((plan) => (
              <li key={plan.id}>
                <span className="staff-li-main">
                  <span className="staff-li-name">
                    {staff.find((person) => person.id === plan.staffId)?.name} → {stores.find((store) => store.id === plan.destinationStoreId)?.name}
                  </span>
                  <span className="muted-sm">{plan.date} {plan.start}〜{plan.end} / {plan.role} / {plan.note}</span>
                </span>
                <button
                  type="button"
                  className="tb-btn sm"
                  onClick={() => setSupportPlans(supportPlans.map((item) => (
                    item.id === plan.id ? { ...item, status: 'APPROVED' } : item
                  )))}
                >
                  {plan.status === 'APPROVED' ? '承認済み' : '承認'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}
