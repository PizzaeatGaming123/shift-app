import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { getMonthDates } from '../lib/date';
import { staffMonthlyHours } from '../store/labor';
import { buildScheduleCsv, downloadCsv } from '../lib/csv';

type ModalKind = 'staff' | 'help' | 'account' | null;

export function TopNav() {
  const { me, logout, stores, staff, assignments, storeId, month } = useApp();
  const { showToast } = useToast();
  const [modal, setModal] = useState<ModalKind>(null);

  const dates = getMonthDates(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
  const storeName = stores.find((s) => String(s.id) === String(storeId))?.name ?? '店舗';

  function exportCsv() {
    const csv = buildScheduleCsv(staff, dates, assignments);
    downloadCsv(`shift_${storeName}_${month}.csv`, csv);
    showToast('CSVを書き出しました ✓');
  }

  const MENUS: { label: string; items: { label: string; onClick?: () => void }[]; align?: 'right' }[] = [
    { label: 'シフト', items: [{ label: '印刷', onClick: () => window.print() }, { label: 'CSVエクスポート', onClick: exportCsv }] },
    { label: 'スタッフ', items: [{ label: 'スタッフ一覧', onClick: () => setModal('staff') }, { label: 'ランク設定' }, { label: 'スキル設定' }] },
    { label: '会計', items: [{ label: '売上計画' }, { label: '人件費' }, { label: '人時売上高' }] },
    { label: '労務', items: [{ label: '労務状況' }, { label: '勤怠' }, { label: '労働時間アラート' }] },
    { label: '組織', items: [{ label: '店舗管理' }, { label: '部門' }, { label: '権限設定' }] },
    { label: 'データ管理', items: [{ label: 'CSVエクスポート', onClick: exportCsv }, { label: 'CSVインポート' }, { label: '連携設定' }] },
    { label: '設定', items: [{ label: '営業時間' }, { label: 'シフト回収設定' }, { label: '通知設定' }] },
  ];

  return (
    <header className="topnav">
      <span className="topnav-brand">暁夢シフト</span>
      <nav className="topnav-menus" aria-label="メインメニュー">
        {MENUS.map((m) => (
          <details className="nav-dd" key={m.label}>
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
        <details className="nav-dd user-dd">
          <summary>{me?.name ?? ''} さん<span className="caret" aria-hidden="true" /></summary>
          <div className="nav-menu right">
            <button type="button" className="nav-menu-item" onClick={() => setModal('account')}>アカウント設定</button>
            <button type="button" className="nav-menu-item" onClick={() => void logout()}>ログアウト</button>
          </div>
        </details>
      </div>

      <Modal open={modal === 'staff'} title="スタッフ一覧" onClose={() => setModal(null)}>
        <ul className="modal-list">
          {staff.map((s) => (
            <li key={s.id}>
              <span className="staff-li-main">
                <span className="staff-li-name">{s.name}<span className="muted-sm">（{s.employmentType}）</span></span>
                <span className="staff-li-sub">
                  {s.rank != null && <span className="rank-badge">ランク{s.rank}</span>}
                  {s.skills.map((sk) => <span key={sk} className="skill-tag">{sk}</span>)}
                </span>
              </span>
              <span className="staff-li-hours">{staffMonthlyHours(assignments, s.id, dates).toFixed(2)} h</span>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal open={modal === 'account'} title="アカウント設定" onClose={() => setModal(null)}>
        <dl>
          <dt>氏名</dt><dd>{me?.name}</dd>
          <dt>権限</dt><dd>{me?.role === 'MANAGER' ? '店長' : 'スタッフ'}</dd>
          <dt>所属店舗</dt><dd>{storeName}</dd>
        </dl>
      </Modal>

      <Modal open={modal === 'help'} title="使い方" onClose={() => setModal(null)}>
        <p>日付をタップして希望を提出し、店長がマトリクスで割り当てます。</p>
        <p>上部の「シフトの種類」で表示する区分を絞り込み、「日/週/半月/月」で表示範囲を切り替えられます。</p>
        <p>「シフト確定」で確定し、「データ管理 → CSVエクスポート」で表を書き出せます。</p>
      </Modal>
    </header>
  );
}
