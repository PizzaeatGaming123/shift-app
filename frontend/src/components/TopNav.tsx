import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { useSetting } from '../lib/settings';
import { getMonthDates } from '../lib/date';
import { dailyWorkHours, dailyLaborCost, staffMonthlyHours, maxConsecutiveAssignedDays } from '../store/labor';
import { isAssigned, countAssigned } from '../store/assignments';
import { buildScheduleCsv, downloadCsv } from '../lib/csv';
import { WORK_SLOTS, SLOT_LABELS, SLOT_HOURS, HOURLY_WAGE, DAILY_SALES_TARGET } from '../constants';

type ModalKind =
  | null | 'staff' | 'rank' | 'skills' | 'sales' | 'cost' | 'sph'
  | 'laborStatus' | 'attendance' | 'hoursAlert' | 'stores' | 'dept' | 'perm'
  | 'import' | 'integ' | 'hours' | 'collect' | 'notify' | 'display' | 'help' | 'account';

const TITLES: Record<Exclude<ModalKind, null>, string> = {
  staff: 'スタッフ一覧', rank: 'ランク設定', skills: 'スキル設定', sales: '売上計画',
  cost: '人件費', sph: '人時売上高', laborStatus: '労務状況', attendance: '勤怠',
  hoursAlert: '労働時間アラート', stores: '店舗管理', dept: '部門', perm: '権限設定',
  import: 'CSVインポート', integ: '連携設定', hours: '営業時間', collect: 'シフト回収設定',
  notify: '通知設定', display: '表示設定', help: '使い方', account: 'アカウント設定',
};

const FONT_SIZES: { value: 'small' | 'standard' | 'large'; label: string }[] = [
  { value: 'small', label: '小（コンパクト）' },
  { value: 'standard', label: '標準' },
  { value: 'large', label: '大（見やすい）' },
];

function yen(n: number): string { return `¥${n.toLocaleString('ja-JP')}`; }
function assignedDays(assignments: ReturnType<typeof useApp>['assignments'], staffId: string, dates: string[]): number {
  return dates.filter((d) => WORK_SLOTS.some((s) => isAssigned(assignments, d, s, staffId))).length;
}

export function TopNav({ onHome }: { onHome?: () => void }) {
  const { me, logout, stores, staff, assignments, storeId, month, updateStaff } = useApp();
  const { showToast } = useToast();
  const [modal, setModal] = useState<ModalKind>(null);
  const [importInfo, setImportInfo] = useState<{ count: number; sample: string[] } | null>(null);

  const [salesTarget, setSalesTarget] = useSetting(`akiyume-sales:${storeId}`, DAILY_SALES_TARGET);
  const [positions, setPositions] = useSetting<string[]>(`akiyume-positions:${storeId}`, ['ホール', 'キッチン']);
  const [openHours, setOpenHours] = useSetting(`akiyume-hours:${storeId}`, { open: '09:00', close: '23:00' });
  const [collect, setCollect] = useSetting(`akiyume-collect:${storeId}`, { deadlineDay: 25, reminders: 2 });
  const [notify, setNotify] = useSetting(`akiyume-notify:${storeId}`, { onConfirm: true, onRecruit: true, onChange: false });
  const [integ, setInteg] = useSetting(`akiyume-integ:${storeId}`, { pos: false, attendance: false, payroll: false });
  const [fontSize, setFontSize] = useSetting<'small' | 'standard' | 'large'>(`akiyume-fontsize:${storeId}`, 'standard');
  const [newDept, setNewDept] = useState('');

  const dates = getMonthDates(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
  const storeName = stores.find((s) => String(s.id) === String(storeId))?.name ?? '店舗';
  const totalHours = dates.reduce((s, d) => s + dailyWorkHours(assignments, d), 0);
  const totalCost = dates.reduce((s, d) => s + dailyLaborCost(assignments, d), 0);
  const monthSales = salesTarget * dates.length;
  const salesPerHour = totalHours > 0 ? Math.round(monthSales / totalHours) : 0;
  const costRate = monthSales > 0 ? Math.round((totalCost / monthSales) * 100) : 0;

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

  const MENUS: { label: string; items: { label: string; onClick: () => void }[] }[] = [
    { label: 'シフト', items: [{ label: '印刷', onClick: () => window.print() }, { label: 'CSVエクスポート', onClick: exportCsv }] },
    { label: 'スタッフ', items: [{ label: 'スタッフ一覧', onClick: () => setModal('staff') }, { label: 'ランク設定', onClick: () => setModal('rank') }, { label: 'スキル設定', onClick: () => setModal('skills') }] },
    { label: '会計', items: [{ label: '売上計画', onClick: () => setModal('sales') }, { label: '人件費', onClick: () => setModal('cost') }, { label: '人時売上高', onClick: () => setModal('sph') }] },
    { label: '労務', items: [{ label: '労務状況', onClick: () => setModal('laborStatus') }, { label: '勤怠', onClick: () => setModal('attendance') }, { label: '労働時間アラート', onClick: () => setModal('hoursAlert') }] },
    { label: '組織', items: [{ label: '店舗管理', onClick: () => setModal('stores') }, { label: '部門', onClick: () => setModal('dept') }, { label: '権限設定', onClick: () => setModal('perm') }] },
    { label: 'データ管理', items: [{ label: 'CSVエクスポート', onClick: exportCsv }, { label: 'CSVインポート', onClick: () => setModal('import') }, { label: '連携設定', onClick: () => setModal('integ') }] },
    { label: '設定', items: [{ label: '表示設定', onClick: () => setModal('display') }, { label: '営業時間', onClick: () => setModal('hours') }, { label: 'シフト回収設定', onClick: () => setModal('collect') }, { label: '通知設定', onClick: () => setModal('notify') }] },
  ];

  return (
    <header className="topnav">
      <button type="button" className="topnav-brand" onClick={() => onHome?.()}>暁夢シフト</button>
      <nav className="topnav-menus" aria-label="メインメニュー">
        {MENUS.map((m) => (
          <details className="nav-dd" name="topnav" key={m.label}>
            <summary>{m.label}<span className="caret" aria-hidden="true" /></summary>
            <div className="nav-menu">
              {m.items.map((it) => (
                <button type="button" key={it.label} className="nav-menu-item" onClick={it.onClick}>{it.label}</button>
              ))}
            </div>
          </details>
        ))}
      </nav>
      <div className="topnav-right">
        <button type="button" className="topnav-icon" aria-label="ヘルプ" onClick={() => setModal('help')}>?</button>
        <button type="button" className="topnav-icon bell" aria-label="通知"><span className="bell-dot" /></button>
        <details className="nav-dd user-dd" name="topnav">
          <summary>{me?.name ?? ''} さん<span className="caret" aria-hidden="true" /></summary>
          <div className="nav-menu right">
            <button type="button" className="nav-menu-item" onClick={() => setModal('account')}>アカウント設定</button>
            <button type="button" className="nav-menu-item" onClick={() => void logout()}>ログアウト</button>
          </div>
        </details>
      </div>

      <Modal open={modal !== null} title={modal ? TITLES[modal] : ''} onClose={() => setModal(null)}>
        {modal === 'staff' && (
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
        )}

        {modal === 'rank' && (
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
        )}

        {modal === 'skills' && (
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
        )}

        {modal === 'sales' && (
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
        )}

        {modal === 'cost' && (
          <dl>
            <dt>当月総労働時間</dt><dd>{totalHours.toFixed(2)} h</dd>
            <dt>仮時給</dt><dd>{yen(HOURLY_WAGE)}</dd>
            <dt>当月人件費（目安）</dt><dd>{yen(totalCost)}</dd>
            <dt>人件費率</dt><dd>{costRate}%</dd>
            {WORK_SLOTS.map((slot) => {
              const cnt = dates.reduce((a, d) => a + countAssigned(assignments, d, slot), 0);
              return (<><dt key={`${slot}-l`}>{SLOT_LABELS[slot]} 延べ人数</dt><dd key={`${slot}-v`}>{cnt} 人（{yen(cnt * SLOT_HOURS[slot] * HOURLY_WAGE)}）</dd></>);
            })}
          </dl>
        )}

        {modal === 'sph' && (
          <dl>
            <dt>当月売上計画</dt><dd>{yen(monthSales)}</dd>
            <dt>当月総労働時間</dt><dd>{totalHours.toFixed(2)} h</dd>
            <dt>人時売上高</dt><dd>{yen(salesPerHour)} / h</dd>
          </dl>
        )}

        {modal === 'laborStatus' && (
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
        )}

        {modal === 'attendance' && (
          <ul className="modal-list">
            {staff.map((s) => (
              <li key={s.id}>
                <span className="staff-li-name">{s.name}</span>
                <span className="muted-sm">出勤 {assignedDays(assignments, s.id, dates)} 日</span>
              </li>
            ))}
          </ul>
        )}

        {modal === 'hoursAlert' && (() => {
          const flagged = staff.filter((s) => maxConsecutiveAssignedDays(assignments, s.id, dates) >= 6 || staffMonthlyHours(assignments, s.id, dates) > 180);
          return flagged.length === 0
            ? <p>現在、労働時間・連続勤務の警告対象はいません。</p>
            : (
              <ul className="modal-list">
                {flagged.map((s) => (
                  <li key={s.id}>
                    <span className="staff-li-name">{s.name}</span>
                    <span className="alert-tag">連続{maxConsecutiveAssignedDays(assignments, s.id, dates)}日 / {staffMonthlyHours(assignments, s.id, dates).toFixed(0)}h</span>
                  </li>
                ))}
              </ul>
            );
        })()}

        {modal === 'stores' && (
          <ul className="modal-list">
            {stores.map((s) => (
              <li key={s.id}>
                <span className="staff-li-name">{s.name}{String(s.id) === String(storeId) && <span className="muted-sm">（表示中）</span>}</span>
              </li>
            ))}
          </ul>
        )}

        {modal === 'dept' && (
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
              <button type="button" className="tb-btn" onClick={() => { const v = newDept.trim(); if (v && !positions.includes(v)) { setPositions([...positions, v]); setNewDept(''); } }}>追加</button>
            </label>
          </div>
        )}

        {modal === 'perm' && (
          <dl>
            <dt>店長</dt><dd>全機能（割り当て・確定・設定・スタッフ管理）</dd>
            <dt>スタッフ</dt><dd>希望シフトの提出のみ</dd>
            <dt>店舗の閲覧範囲</dt><dd>自分の所属店舗のみ</dd>
          </dl>
        )}

        {modal === 'import' && (
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
        )}

        {modal === 'integ' && (
          <div className="settings-form">
            <p className="muted-sm">外部システムとの連携を設定します。</p>
            {([['pos', 'POS（売上管理）'], ['attendance', '勤怠（打刻）'], ['payroll', '給与']] as const).map(([key, label]) => (
              <label key={key} className="menu-check">
                <input type="checkbox" checked={integ[key]} onChange={(e) => setInteg({ ...integ, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        )}

        {modal === 'hours' && (
          <div className="settings-form">
            <label className="settings-row"><span>開店時刻</span>
              <input type="time" value={openHours.open} onChange={(e) => setOpenHours({ ...openHours, open: e.target.value })} /></label>
            <label className="settings-row"><span>閉店時刻</span>
              <input type="time" value={openHours.close} onChange={(e) => setOpenHours({ ...openHours, close: e.target.value })} /></label>
          </div>
        )}

        {modal === 'collect' && (
          <div className="settings-form">
            <label className="settings-row"><span>提出締切日（毎月）</span>
              <input type="number" min={1} max={31} value={collect.deadlineDay} onChange={(e) => setCollect({ ...collect, deadlineDay: Number(e.target.value) || 1 })} /></label>
            <label className="settings-row"><span>提出依頼の通知回数</span>
              <input type="number" min={0} max={10} value={collect.reminders} onChange={(e) => setCollect({ ...collect, reminders: Number(e.target.value) || 0 })} /></label>
          </div>
        )}

        {modal === 'notify' && (
          <div className="settings-form">
            {([['onConfirm', 'シフト確定時に通知'], ['onRecruit', '追加募集時に通知'], ['onChange', '確定後の変更を通知']] as const).map(([key, label]) => (
              <label key={key} className="menu-check">
                <input type="checkbox" checked={notify[key]} onChange={(e) => setNotify({ ...notify, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        )}

        {modal === 'display' && (
          <div className="settings-form">
            <p className="muted-sm">シフト一覧の文字サイズを変更します。シフトを見るだけのときは「小」が便利です。</p>
            {FONT_SIZES.map((f) => (
              <label key={f.value} className="menu-check">
                <input type="radio" name="fontsize" checked={fontSize === f.value} onChange={() => setFontSize(f.value)} />
                {f.label}
              </label>
            ))}
          </div>
        )}

        {modal === 'help' && (
          <>
            <p>日付をタップして希望を提出し、店長がマトリクスで割り当てます。</p>
            <p>上部の「シフトの種類」で表示する区分を絞り込み、「日/週/半月/月」で表示範囲を切り替えられます。</p>
            <p>「シフト確定」で確定し、「データ管理 → CSVエクスポート」で表を書き出せます。</p>
          </>
        )}

        {modal === 'account' && (
          <dl>
            <dt>氏名</dt><dd>{me?.name}</dd>
            <dt>権限</dt><dd>{me?.role === 'MANAGER' ? '店長' : 'スタッフ'}</dd>
            <dt>所属店舗</dt><dd>{storeName}</dd>
          </dl>
        )}
      </Modal>
    </header>
  );
}
