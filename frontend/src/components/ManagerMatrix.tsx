import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { getMonthDates, sliceByView } from '../lib/date';
import { getDayRequest } from '../store/requests';
import { isAssigned } from '../store/assignments';
import { dailyWorkHours, dailyLaborCost, staffMonthlyHours, dailyRankTotal, maxConsecutiveAssignedDays } from '../store/labor';
import { SLOT_LABELS, DAILY_SALES_TARGET } from '../constants';
import { Modal } from './ui/Modal';
import { useSetting } from '../lib/settings';
import type { Assignment, DayRequestValue, WorkSlot, RequestSlot, SlotVisibility } from '../types';

type BandKey = 'b1' | 'b2' | 'b3';
const BANDS: { key: BandKey; label: string; slots: WorkSlot[] }[] = [
  { key: 'b1', label: '09:00 - 14:00', slots: ['early', 'mid'] },
  { key: 'b2', label: '14:00 - 19:00', slots: ['early', 'mid', 'late'] },
  { key: 'b3', label: '19:00 - 23:00', slots: ['mid', 'late'] },
];
type RequiredByBand = Record<BandKey, number>;
const DEFAULT_REQUIRED: RequiredByBand = { b1: 2, b2: 2, b3: 2 };

interface ManagerMatrixProps {
  year: number;
  month: number;
  view: string;
  visibleSlots: SlotVisibility;
  setVisibleSlots: (v: SlotVisibility) => void;
}

const FILTER_SLOTS: { slot: RequestSlot; label: string }[] = [
  { slot: 'early', label: '早番' },
  { slot: 'mid', label: '中番' },
  { slot: 'late', label: '遅番' },
  { slot: 'off', label: '休み' },
];

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const REQUEST_LABEL: Record<DayRequestValue, string> = {
  none: '', early: '早番', mid: '中番', late: '遅番', off: '休み',
};
const REQUEST_CLASS: Record<DayRequestValue, string> = {
  none: '', early: 'early', mid: 'mid', late: 'late', off: 'off',
};

function dow(date: string): number {
  return new Date(`${date}T00:00:00`).getDay();
}
function dowClass(date: string): string {
  const d = dow(date);
  if (d === 0) return 'dow-sun';
  if (d === 6) return 'dow-sat';
  return '';
}
function yen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`;
}
/** 労働時間を「時:分」形式にする（例: 45 -> 45:00） */
function hm(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}
/** 時間帯バンドを満たす（重なるスロットに割り当てられた）スタッフ数 */
function bandCoverage(assignments: Assignment[], date: string, slots: WorkSlot[]): number {
  const ids = new Set<string>();
  for (const slot of slots) {
    const a = assignments.find((x) => x.date === date && x.slot === slot);
    for (const id of a?.staffIds ?? []) ids.add(id);
  }
  return ids.size;
}

export function ManagerMatrix({ year, month, view, visibleSlots, setVisibleSlots }: ManagerMatrixProps) {
  const { staff, requests, assignments, dayNotes, storeNotes, recruitments, storeId, toggleAssignment, setStoreNote, setRecruitment } = useApp();
  const [showRequests, setShowRequests] = useState(true);
  const [showMemos, setShowMemos] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [required, setRequired] = useState<RequiredByBand>(DEFAULT_REQUIRED);
  const dates = sliceByView(getMonthDates(year, month), view);
  const [salesTarget] = useSetting(`akiyume-sales:${storeId}`, DAILY_SALES_TARGET);
  const [hallMemos, setHallMemos] = useSetting<Record<string, string>>(`akiyume-hallmemo:${storeId}`, {});

  const reqKey = `akiyume-required:${storeId}`;
  useEffect(() => {
    const raw = localStorage.getItem(reqKey);
    if (!raw) { setRequired(DEFAULT_REQUIRED); return; }
    try {
      setRequired({ ...DEFAULT_REQUIRED, ...JSON.parse(raw) });
    } catch {
      setRequired(DEFAULT_REQUIRED);
    }
  }, [reqKey]);

  function saveRequired(next: RequiredByBand) {
    setRequired(next);
    localStorage.setItem(reqKey, JSON.stringify(next));
  }

  if (staff.length === 0) {
    return <section className="empty"><p>この店舗のスタッフがいません。</p></section>;
  }

  return (
    <section className="matrix-section">
      <div className="cat-row">
        <span className="cat-name">ホール</span>
        <label className="cat-check">
          <input type="checkbox" checked={showRequests} onChange={(e) => setShowRequests(e.target.checked)} />
          希望シフトを表示
        </label>
        <label className="cat-check">
          <input type="checkbox" checked={showMemos} onChange={(e) => setShowMemos(e.target.checked)} />
          勤務メモを表示
        </label>
        <span className="cat-bulk">一括操作</span>
        {FILTER_SLOTS.map(({ slot, label }) => (
          <button
            key={slot}
            type="button"
            className={`filter-chip ${slot} ${visibleSlots[slot] ? '' : 'is-off'}`}
            aria-pressed={visibleSlots[slot]}
            onClick={() => setVisibleSlots({ ...visibleSlots, [slot]: !visibleSlots[slot] })}
          >
            {label}
          </button>
        ))}
        <button type="button" className="tb-btn sm" onClick={() => setSettingsOpen(true)}>シフト設定</button>
      </div>

      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="row-head sticky-col">スタッフ並び替え</th>
              {dates.map((date) => (
                <th key={date} className={`date-head ${dowClass(date)}`}>
                  <span className="d-num">{Number(date.slice(8, 10))}</span>
                  <span className="d-dow">{WEEKDAYS[dow(date)]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="summary-row">
              <td className="row-head sticky-col">売上計画</td>
              {dates.map((date) => (
                <td key={date} className="summary-cell">{yen(salesTarget)}</td>
              ))}
            </tr>
            <tr className="summary-row">
              <td className="row-head sticky-col">総労働時間</td>
              {dates.map((date) => (
                <td key={date} className="summary-cell">{dailyWorkHours(assignments, date).toFixed(2)} h</td>
              ))}
            </tr>
            <tr className="summary-row">
              <td className="row-head sticky-col">人件費（時給）</td>
              {dates.map((date) => {
                const cost = dailyLaborCost(assignments, date);
                const pct = salesTarget > 0 ? (cost / salesTarget) * 100 : 0;
                return (
                  <td key={date} className="summary-cell cost">
                    {yen(cost)}<span className="cost-pct">({pct.toFixed(2)}%)</span>
                  </td>
                );
              })}
            </tr>
            <tr className="section-row">
              <td className="row-head sticky-col">全体モデルシフト</td>
              {dates.map((date) => <td key={date} className="section-cell" />)}
            </tr>
            {BANDS.map((band) => (
              <tr key={band.key} className="count-row">
                <td className="row-head sticky-col indent">
                  <span className="slot-name">{band.label}</span>
                </td>
                {dates.map((date) => {
                  const cov = bandCoverage(assignments, date, band.slots);
                  const need = required[band.key];
                  const level = cov < need ? 'low' : cov > need ? 'over' : 'ok';
                  return (
                    <td key={date} className={`count ${level}`}>
                      {cov}/{need}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="count-row">
              <td className="row-head sticky-col indent">ランク計（労働力）</td>
              {dates.map((date) => (
                <td key={date} className="count">{dailyRankTotal(assignments, staff, date)}</td>
              ))}
            </tr>
            <tr className="store-note-row">
              <td className="row-head sticky-col">店舗メモ</td>
              {dates.map((date) => {
                const note = storeNotes.find((n) => n.date === date);
                const current = note?.text ?? '';
                return (
                  <td key={date} className="store-note-cell">
                    <input
                      className="store-note-input"
                      defaultValue={current}
                      key={`${date}:${current}`}
                      maxLength={200}
                      placeholder=""
                      aria-label={`${date} の店舗メモ`}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== current) void setStoreNote(date, v);
                      }}
                    />
                  </td>
                );
              })}
            </tr>
            <tr className="store-note-row">
              <td className="row-head sticky-col">ホールメモ</td>
              {dates.map((date) => {
                const current = hallMemos[date] ?? '';
                return (
                  <td key={date} className="store-note-cell">
                    <input
                      className="store-note-input"
                      defaultValue={current}
                      key={`hall:${date}:${current}`}
                      maxLength={200}
                      placeholder=""
                      aria-label={`${date} のホールメモ`}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v === current) return;
                        const next = { ...hallMemos };
                        if (v) next[date] = v; else delete next[date];
                        setHallMemos(next);
                      }}
                    />
                  </td>
                );
              })}
            </tr>
            <tr className="recruit-row">
              <td className="row-head sticky-col">追加募集</td>
              {dates.map((date) => {
                const rec = recruitments.find((r) => r.date === date);
                const current = rec?.message ?? '';
                return (
                  <td key={date} className={`recruit-cell ${current ? 'has-recruit' : ''}`}>
                    <input
                      className="store-note-input recruit-input"
                      defaultValue={current}
                      key={`rec:${date}:${current}`}
                      maxLength={200}
                      placeholder="募集なし"
                      aria-label={`${date} の追加募集`}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== current) void setRecruitment(date, v);
                      }}
                    />
                  </td>
                );
              })}
            </tr>
            {staff.map((person) => {
              const hours = staffMonthlyHours(assignments, person.id, dates);
              const consec = maxConsecutiveAssignedDays(assignments, person.id, dates);
              const warnings = (consec >= 6 ? 1 : 0) + (hours > 180 ? 1 : 0);
              return (
                <tr key={person.id} className="staff-row">
                  <td className="row-head sticky-col staff-head">
                    <span className="staff-meta">
                      <span className="staff-name">
                        {person.name}
                        {warnings > 0 && <span className="warn-badge" title="労務注意">!{warnings}</span>}
                      </span>
                      <span className="staff-hours">{hm(hours)}</span>
                    </span>
                  </td>
                  {dates.map((date) => {
                    const req = getDayRequest(requests, person.id, date);
                    const targetSlot: WorkSlot | null =
                      req === 'off' || req === 'none' ? null : (req as WorkSlot);
                    const assigned = targetSlot
                      ? isAssigned(assignments, date, targetSlot, person.id) : false;
                    const note = dayNotes.find((n) => n.staffId === person.id && n.date === date);
                    const toggle = () => {
                      if (!targetSlot) return;
                      void toggleAssignment(date, targetSlot, person.id, assigned);
                    };
                    return (
                      <td key={date} className={`shift-cell ${dowClass(date)}`}>
                        {showRequests && req !== 'none' && visibleSlots[req] && (
                          <span
                            className={`chip ${REQUEST_CLASS[req]} ${assigned ? 'assigned' : ''} ${targetSlot ? 'clickable' : ''}`}
                            role={targetSlot ? 'button' : undefined}
                            tabIndex={targetSlot ? 0 : undefined}
                            aria-pressed={targetSlot ? assigned : undefined}
                            aria-label={targetSlot
                              ? `${person.name} ${date} ${SLOT_LABELS[targetSlot]} ${assigned ? '割り当て解除' : '割り当て'}`
                              : undefined}
                            onClick={toggle}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                toggle();
                              }
                            }}
                          >
                            {REQUEST_LABEL[req]}
                          </span>
                        )}
                        {showMemos && note && <span className="cell-memo" title={note.text}>{note.text}</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={settingsOpen} title="シフト設定（モデルシフト必要人数）" onClose={() => setSettingsOpen(false)}>
        <p>時間帯ごとの必要人数を設定します。全体モデルシフトの過不足判定（色）に反映されます。</p>
        <div className="settings-form">
          {BANDS.map((band) => (
            <label key={band.key} className="settings-row">
              <span>{band.label}</span>
              <input
                type="number"
                min={0}
                max={20}
                value={required[band.key]}
                onChange={(e) => saveRequired({ ...required, [band.key]: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          ))}
        </div>
      </Modal>
    </section>
  );
}
