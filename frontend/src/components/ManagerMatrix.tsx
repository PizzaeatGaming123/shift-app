import { useApp } from '../store/AppContext';
import { getMonthDates } from '../lib/date';
import { getDayRequest } from '../store/requests';
import { isAssigned, countAssigned, fulfillmentLevel } from '../store/assignments';
import { WORK_SLOTS, SLOT_LABELS, MAX_STAFF_PER_SLOT } from '../constants';
import { Legend } from './ui/Legend';
import type { DayRequestValue, WorkSlot } from '../types';

interface ManagerMatrixProps {
  year: number;
  month: number;
}

const REQUEST_MARK: Record<DayRequestValue, string> = {
  none: '', early: '早', late: '遅', both: '早遅', off: '休',
};
const REQUEST_CLASS: Record<DayRequestValue, string> = {
  none: '', early: 'req-early', late: 'req-late', both: 'req-early', off: 'req-off',
};

export function ManagerMatrix({ year, month }: ManagerMatrixProps) {
  const { staff, requests, assignments, toggleAssignment } = useApp();
  const dates = getMonthDates(year, month);
  const days = dates.map((d) => Number(d.slice(8, 10)));

  if (staff.length === 0) {
    return <section className="empty"><p>この店舗のスタッフがいません。</p></section>;
  }

  return (
    <section className="matrix-section">
      <Legend />
      <div className="matrix-wrap">
        <table className="matrix">
        <thead>
          <tr>
            <th className="staff-name">スタッフ</th>
            {days.map((d) => <th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {staff.map((person) => (
            <tr key={person.id}>
              <td className="staff-name">{person.name}</td>
              {dates.map((date) => {
                const req = getDayRequest(requests, person.id, date);
                const targetSlot: WorkSlot | null =
                  req === 'off' || req === 'none' ? null : req === 'late' ? 'late' : 'early';
                const assigned = targetSlot
                  ? isAssigned(assignments, date, targetSlot, person.id) : false;
                const toggle = () => {
                  if (!targetSlot) return;
                  void toggleAssignment(date, targetSlot, person.id, assigned);
                };
                return (
                  <td
                    key={date}
                    className={`cell-btn ${REQUEST_CLASS[req]} ${assigned ? 'assigned' : ''}`}
                    role={targetSlot ? 'button' : undefined}
                    tabIndex={targetSlot ? 0 : undefined}
                    aria-label={targetSlot
                      ? `${person.name} ${date} ${assigned ? '割り当て解除' : '割り当て'}`
                      : undefined}
                    onClick={toggle}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggle();
                      }
                    }}
                  >
                    {REQUEST_MARK[req]}
                  </td>
                );
              })}
            </tr>
          ))}
          {WORK_SLOTS.map((slot) => (
            <tr key={slot} className="count-row">
              <td className="staff-name">{SLOT_LABELS[slot]}人数</td>
              {dates.map((date) => {
                const count = countAssigned(assignments, date, slot);
                const level = fulfillmentLevel(count);
                const pct = Math.min(100, Math.round((count / MAX_STAFF_PER_SLOT) * 100));
                return (
                  <td key={date} className={`count ${level}`}>
                    <span className="count-num">{count}</span>
                    <span className="fill-bar">
                      <span className={`fill ${level}`} style={{ width: `${pct}%` }} />
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </section>
  );
}
