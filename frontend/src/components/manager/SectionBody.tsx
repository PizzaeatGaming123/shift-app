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
  'rank-settings': 'ランク設定',
  'skill-settings': 'スキル設定',
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
    stores, staff, assignments, storeId, month,
    updateStaff, createStaff, recruitments, setRecruitment,
  } = useApp();
  const { showToast } = useToast();

  const [importInfo, setImportInfo] = useState<{ count: number; sample: string[] } | null>(null);
  const [regName, setRegName] = useState('');
  const [regType, setRegType] = useState('パート');
  const [newDept, setNewDept] = useState('');
  const [recruitDate, setRecruitDate] = useState('');
  const [recruitMsg, setRecruitMsg] = useState('');

  const [salesTarget, setSalesTarget] = useSetting(`akiyume-sales:${storeId}`, DAILY_SALES_TARGET);
  const [positions, setPositions] = useSetting<string[]>(`akiyume-positions:${storeId}`, ['ホール', 'キッチン']);
  const [openHours, setOpenHours] = useSetting(`akiyume-hours:${storeId}`, { open: '09:00', close: '23:00' });
  const [collect, setCollect] = useSetting(`akiyume-collect:${storeId}`, { deadlineDay: 25, reminders: 2 });
  const [notify, setNotify] = useSetting(`akiyume-notify:${storeId}`, { onConfirm: true, onRecruit: true, onChange: false });
  const [integ, setInteg] = useSetting(`akiyume-integ:${storeId}`, { pos: false, attendance: false, payroll: false });
  const [fontSize, setFontSize] = useSetting<'small' | 'standard' | 'large'>(`akiyume-fontsize:${storeId}`, 'standard');
  const [perms, setPerms] = useSetting(`akiyume-perms:${storeId}`, {
    submit: true, viewOwn: true, viewOthers: false, postMemo: true, viewCost: false,
  });
  const [modelPos, setModelPos] = useState<string>(positions[0] ?? 'ホール');
  const [modelRequired, setModelRequired] = useSetting(
    `akiyume-required:${storeId}:${modelPos}`,
    { morning: 2, afternoon: 2, night: 2 },
  );

  const dates = getMonthDates(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
  const mdLabel = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
  const activeRecruitDate = recruitDate || dates[0] || '';
  const storeName = stores.find((s) => String(s.id) === String(storeId))?.name ?? '店舗';
  const totalHours = dates.reduce((s, d) => s + dailyWorkHours(assignments, d), 0);
  const totalCost = dates.reduce((s, d) => s + dailyLaborCost(assignments, d), 0);
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
            const hrs = staffMonthlyHours(assignments, s.id, dates);
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
      return (
        <div className="settings-form">
          <p className="muted-sm">スタッフごとの労働力ランク（1〜5）を設定します。</p>
          {staff.map((s) => (
            <label key={s.id} className="settings-row">
              <span>{s.name}</span>
              <select
                value={s.rank ?? 3}
                onChange={(e) => void updateStaff(s.id, Number(e.target.value), s.skills)}
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>ランク{n}</option>)}
              </select>
            </label>
          ))}
        </div>
      );

    case 'skill-settings':
      return (
        <div className="settings-form">
          <p className="muted-sm">スキルをカンマ区切りで入力します（例：ホール,キッチン）。</p>
          {staff.map((s) => (
            <label key={s.id} className="settings-row">
              <span>{s.name}</span>
              <input
                className="text-input"
                defaultValue={s.skills.join(',')}
                key={s.skills.join(',')}
                onBlur={(e) => {
                  const next = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
                  if (next.join(',') !== s.skills.join(',')) void updateStaff(s.id, s.rank, next);
                }}
              />
            </label>
          ))}
        </div>
      );

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
                <dd>{cnt} 人（{yen(cnt * SLOT_HOURS[slot] * HOURLY_WAGE)}）</dd>
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
            const hrs = staffMonthlyHours(assignments, s.id, dates);
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
        <ul className="modal-list">
          {staff.map((s) => (
            <li key={s.id}>
              <span className="staff-li-name">{s.name}</span>
              <span className="muted-sm">出勤 {assignedDays(assignments, s.id, dates)} 日</span>
            </li>
          ))}
        </ul>
      );

    case 'labor-alerts': {
      const flagged = staff.filter((s) =>
        maxConsecutiveAssignedDays(assignments, s.id, dates) >= 6
        || staffMonthlyHours(assignments, s.id, dates) > 180);
      return flagged.length === 0
        ? <p>現在、労働時間・連続勤務の警告対象はいません。</p>
        : (
          <ul className="modal-list">
            {flagged.map((s) => (
              <li key={s.id}>
                <span className="staff-li-name">{s.name}</span>
                <span className="alert-tag">
                  連続{maxConsecutiveAssignedDays(assignments, s.id, dates)}日 / {staffMonthlyHours(assignments, s.id, dates).toFixed(0)}h
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
          <p className="muted-sm">外部システムとの連携を設定します。</p>
          {([['pos', 'POS（売上管理）'], ['attendance', '勤怠（打刻）'], ['payroll', '給与']] as const).map(([key, label]) => (
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
        <div className="settings-form">
          <p className="muted-sm">シフトの提出締切と提出依頼の通知回数を設定します。</p>
          <label className="settings-row"><span>提出締切日（毎月）</span>
            <input type="number" min={1} max={31} value={collect.deadlineDay} onChange={(e) => setCollect({ ...collect, deadlineDay: Number(e.target.value) || 1 })} /></label>
          <label className="settings-row"><span>提出依頼の通知回数</span>
            <input type="number" min={0} max={10} value={collect.reminders} onChange={(e) => setCollect({ ...collect, reminders: Number(e.target.value) || 0 })} /></label>
        </div>
      );

    case 'collection':
      return (
        <div className="settings-form">
          <p className="muted-sm">スタッフの希望シフト提出状況です。</p>
          <ul className="modal-list">
            {staff.map((s) => (
              <li key={s.id}>
                <span className="staff-li-name">{s.name}</span>
                <span className="muted-sm">締切 毎月{collect.deadlineDay}日</span>
              </li>
            ))}
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
        <div className="settings-form">
          <p className="muted-sm">
            時間帯ごとの必要人数を設定します。シフト表の「全体モデルシフト」に必要数として反映されます。
          </p>
          <label className="settings-row">
            <span>ポジション</span>
            <select value={modelPos} onChange={(e) => setModelPos(e.target.value)}>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          {([
            ['morning', '09:00 - 14:00'],
            ['afternoon', '14:00 - 19:00'],
            ['night', '19:00 - 23:00'],
          ] as const).map(([key, label]) => (
            <label key={key} className="settings-row">
              <span>{label}</span>
              <input
                type="number"
                min={0}
                max={20}
                value={modelRequired[key]}
                onChange={(e) => setModelRequired({
                  ...modelRequired,
                  [key]: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
                })}
              />
            </label>
          ))}
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
        <div className="settings-form">
          <p className="muted-sm">
            確定済みのシフトはシフト表の「確定シフト」表示で確認できます。上部メニューの「シフト表」から切り替えてください。
          </p>
        </div>
      );

    case 'messages':
      return (
        <div className="settings-form">
          <p className="muted-sm">スタッフとの1対1メッセージ（準備中）。次の実装で対応します。</p>
        </div>
      );

    case 'fixed-shifts':
      return (
        <div className="settings-form">
          <p className="muted-sm">曜日固定の勤務パターン設定（準備中）。次の実装で対応します。</p>
        </div>
      );

    case 'shift-patterns':
      return (
        <div className="settings-form">
          <p className="muted-sm">早番・遅番などの提出枠パターン設定（準備中）。次の実装で対応します。</p>
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
          <p className="muted-sm">他事業所へのヘルプ稼働（準備中）。次の実装で対応します。</p>
        </div>
      );

    default:
      return null;
  }
}
