import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { getMonthDates } from '../lib/date';
import { dailyWorkHours, dailyLaborCost } from '../store/labor';
import { countAssigned } from '../store/assignments';
import { WORK_SLOTS } from '../constants';
import type { RequestSlot, SlotVisibility } from '../types';

interface Props {
  monthTitle: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  tab: 'main' | 'shared';
  setTab: (t: 'main' | 'shared') => void;
  view: string;
  setView: (v: string) => void;
  visibleSlots: SlotVisibility;
  setVisibleSlots: (v: SlotVisibility) => void;
}

const VIEWS = ['日', '週', '半月', '月'];
const TYPE_SLOTS: { slot: RequestSlot; label: string }[] = [
  { slot: 'early', label: '早番' },
  { slot: 'mid', label: '中番' },
  { slot: 'late', label: '遅番' },
  { slot: 'off', label: '休み' },
];

function yen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`;
}

export function ManagerToolbar({
  monthTitle, onPrev, onNext, onToday, tab, setTab, view, setView, visibleSlots, setVisibleSlots,
}: Props) {
  const { stores, storeId, setStoreId, month, assignments } = useApp();
  const { showToast } = useToast();
  const [overviewOpen, setOverviewOpen] = useState(false);

  const confirmKey = `akiyume-confirmed:${storeId}:${month}`;
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    setConfirmed(localStorage.getItem(confirmKey) === '1');
  }, [confirmKey]);

  function confirmShift() {
    localStorage.setItem(confirmKey, '1');
    setConfirmed(true);
    showToast('シフトを確定しました ✓');
    setTab('shared');
  }

  const monthDates = getMonthDates(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
  const totalHours = monthDates.reduce((s, d) => s + dailyWorkHours(assignments, d), 0);
  const totalCost = monthDates.reduce((s, d) => s + dailyLaborCost(assignments, d), 0);
  const totalShifts = monthDates.reduce(
    (s, d) => s + WORK_SLOTS.reduce((a, slot) => a + countAssigned(assignments, d, slot), 0), 0,
  );

  return (
    <div className="mgr-toolbar">
      <div className="mtb-row">
        <select
          className="tb-select"
          value={storeId ?? ''}
          onChange={(e) => setStoreId(Number(e.target.value))}
          aria-label="店舗"
        >
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <details className="tb-dd">
          <summary>ポジション<span className="caret" aria-hidden="true" /></summary>
          <div className="tb-menu">
            <button type="button" className="nav-menu-item">ホール</button>
            <button type="button" className="nav-menu-item">キッチン</button>
          </div>
        </details>
        <button type="button" className="tb-btn primary" onClick={confirmShift}>
          シフト確定<span className="tb-badge">{confirmed ? '確定済み' : '未確定あり'}</span>
        </button>
        <button type="button" className="tb-btn" onClick={() => window.print()}>印刷</button>
        <details className="tb-dd">
          <summary>シフトの種類<span className="caret" aria-hidden="true" /></summary>
          <div className="tb-menu">
            {TYPE_SLOTS.map(({ slot, label }) => (
              <label key={slot} className="menu-check">
                <input
                  type="checkbox"
                  checked={visibleSlots[slot]}
                  onChange={(e) => setVisibleSlots({ ...visibleSlots, [slot]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </details>
        <div className="tb-spacer" />
        <div className="seg2" role="tablist" aria-label="表示シフト">
          <button type="button" className={tab === 'main' ? 'active' : ''} onClick={() => setTab('main')}>希望確認・割り当て</button>
          <button type="button" className={tab === 'shared' ? 'active' : ''} onClick={() => setTab('shared')}>確定シフト</button>
        </div>
      </div>
      <div className="mtb-row">
        <div className="view-tabs" role="tablist" aria-label="表示単位">
          {VIEWS.map((v) => (
            <button key={v} type="button" className={view === v ? 'active' : ''} aria-selected={view === v} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
        <button type="button" className="tb-arrow" onClick={onPrev} aria-label="前の月">‹</button>
        <span className="tb-date">{monthTitle}</span>
        <button type="button" className="tb-arrow" onClick={onNext} aria-label="次の月">›</button>
        <button type="button" className="tb-btn sm" onClick={onToday}>今月</button>
        <span className="tb-period">提出期間 〜前月末 23:59</span>
        <button type="button" className="tb-btn sm" onClick={() => setOverviewOpen(true)}>概要設定</button>
      </div>

      <Modal open={overviewOpen} title={`${monthTitle} の概要`} onClose={() => setOverviewOpen(false)}>
        <dl>
          <dt>割り当て総数</dt><dd>{totalShifts} 件</dd>
          <dt>総労働時間</dt><dd>{totalHours.toFixed(2)} h</dd>
          <dt>人件費（目安）</dt><dd>{yen(totalCost)}</dd>
          <dt>確定状態</dt><dd>{confirmed ? '確定済み' : '未確定'}</dd>
        </dl>
      </Modal>
    </div>
  );
}
