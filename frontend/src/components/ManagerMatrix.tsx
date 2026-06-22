import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { getMonthDates } from '../lib/date';
import { getDayRequest } from '../store/requests';
import { isAssigned, countAssigned, fulfillmentLevel } from '../store/assignments';
import { dailyWorkHours, dailyLaborCost, staffMonthlyHours } from '../store/labor';
import { WORK_SLOTS, SLOT_LABELS, SLOT_TIMES, MAX_STAFF_PER_SLOT, DAILY_SALES_TARGET } from '../constants';
import type { DayRequestValue, WorkSlot } from '../types';

interface ManagerMatrixProps {
  year: number;
  month: number;
}

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

export function ManagerMatrix({ year, month }: ManagerMatrixProps) {
  const { staff, requests, assignments, dayNotes, storeNotes, toggleAssignment, setStoreNote } = useApp();
  const [showRequests, setShowRequests] = useState(true);
  const [showMemos, setShowMemos] = useState(true);
  const dates = getMonthDates(year, month);

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
        <span className="filter-chip early">早番</span>
        <span className="filter-chip mid">中番</span>
        <span className="filter-chip late">遅番</span>
        <span className="filter-chip off">休み</span>
        <button type="button" className="tb-btn sm">シフト設定</button>
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
                <td key={date} className="summary-cell">{yen(DAILY_SALES_TARGET)}</td>
              ))}
            </tr>
            <tr className="summary-row">
              <td className="row-head sticky-col">総労働時間</td>
              {dates.map((date) => (
                <td key={date} className="summary-cell">{dailyWorkHours(assignments, date).toFixed(2)} h</td>
              ))}
            </tr>
            <tr className="summary-row">
              <td className="row-head sticky-col">人件費(目安)</td>
              {dates.map((date) => {
                const cost = dailyLaborCost(assignments, date);
                const pct = Math.round((cost / DAILY_SALES_TARGET) * 100);
                return (
                  <td key={date} className="summary-cell cost">
                    {yen(cost)}<span className="cost-pct">({pct}%)</span>
                  </td>
                );
              })}
            </tr>
            <tr className="section-row">
              <td className="row-head sticky-col">全体モデルシフト</td>
              {dates.map((date) => <td key={date} className="section-cell" />)}
            </tr>
            {WORK_SLOTS.map((slot) => (
              <tr key={slot} className="count-row">
                <td className="row-head sticky-col indent">
                  <span className="slot-name">{SLOT_LABELS[slot]}</span>
                  <span className="slot-time">{SLOT_TIMES[slot]}</span>
                </td>
                {dates.map((date) => {
                  const count = countAssigned(assignments, date, slot);
                  const level = fulfillmentLevel(count);
                  return (
                    <td key={date} className={`count ${level}`}>
                      {count}/{MAX_STAFF_PER_SLOT}
                    </td>
                  );
                })}
              </tr>
            ))}
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
            {staff.map((person) => {
              const hours = staffMonthlyHours(assignments, person.id, dates);
              return (
                <tr key={person.id} className="staff-row">
                  <td className="row-head sticky-col staff-head">
                    <span className="staff-meta">
                      <span className="staff-name">{person.name}</span>
                      <span className="staff-hours">{hours.toFixed(2)}</span>
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
                        {showRequests && req !== 'none' && (
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
    </section>
  );
}
