import { useApp } from '../store/AppContext';
import { getMonthDates } from '../lib/date';
import { getDayRequest } from '../store/requests';
import { isAssigned, countAssigned, fulfillmentLevel } from '../store/assignments';
import { dailyWorkHours, dailyLaborCost, staffMonthlyHours } from '../store/labor';
import { WORK_SLOTS, SLOT_LABELS, SLOT_TIMES, MAX_STAFF_PER_SLOT, DAILY_SALES_TARGET } from '../constants';
import { Legend } from './ui/Legend';
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
  const dates = getMonthDates(year, month);

  if (staff.length === 0) {
    return <section className="empty"><p>この店舗のスタッフがいません。</p></section>;
  }

  return (
    <section className="matrix-section">
      <div className="matrix-toolbar">
        <div className="view-tabs" role="tablist" aria-label="表示単位">
          <button type="button" role="tab" aria-selected="false">日</button>
          <button type="button" role="tab" aria-selected="false">週</button>
          <button type="button" role="tab" aria-selected="false">半月</button>
          <button type="button" role="tab" aria-selected="true" className="active">月</button>
        </div>
        <div className="toolbar-actions">
          <span className="alert-badge" aria-label="未収アラート">未収アラート 1件</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨 印刷</button>
        </div>
      </div>

      <Legend />

      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="row-head sticky-col">スタッフ</th>
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
              <td className="row-head sticky-col">💰 売上計画</td>
              {dates.map((date) => (
                <td key={date} className="summary-cell">{yen(DAILY_SALES_TARGET)}</td>
              ))}
            </tr>
            <tr className="summary-row">
              <td className="row-head sticky-col">⏱ 総労働時間</td>
              {dates.map((date) => (
                <td key={date} className="summary-cell">{dailyWorkHours(assignments, date).toFixed(2)} h</td>
              ))}
            </tr>
            <tr className="summary-row">
              <td className="row-head sticky-col">💴 人件費(目安)</td>
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
              <td className="row-head sticky-col">⚙ 全体モデルシフト</td>
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
                      placeholder="—"
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
              const noteCount = dayNotes.filter((n) => n.staffId === person.id).length;
              return (
                <tr key={person.id} className="staff-row">
                  <td className="row-head sticky-col staff-head">
                    <span className="staff-avatar" aria-hidden="true">{person.name.slice(0, 1)}</span>
                    <span className="staff-meta">
                      <span className="staff-name">{person.name}</span>
                      <span className="staff-sub">
                        <span className="staff-hours">{hours.toFixed(2)} h</span>
                        {noteCount > 0 && <span className="staff-notes">💬 {noteCount}</span>}
                      </span>
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
                        {req !== 'none' && (
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
                        {note && <span className="cell-memo" title={note.text}>💬 {note.text}</span>}
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
