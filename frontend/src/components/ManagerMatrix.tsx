import { useApp } from '../store/AppContext';
import { getMonthDates } from '../lib/date';
import { getDayRequest } from '../store/requests';
import { isAssigned, countAssigned, fulfillmentLevel } from '../store/assignments';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';
import type { DayRequestValue, WorkSlot } from '../types';

interface ManagerMatrixProps {
  year: number;
  month: number;
}

const REQUEST_MARK: Record<DayRequestValue, string> = {
  none: '', early: '早', late: '遅', both: '早遅', off: '休',
};

export function ManagerMatrix({ year, month }: ManagerMatrixProps) {
  const { staff, requests, assignments, toggleAssignment } = useApp();
  const dates = getMonthDates(year, month);
  const days = dates.map((d) => Number(d.slice(8, 10)));

  return (
    <section className="matrix-wrap">
      <p style={{ color: '#666', fontSize: 14 }}>
        希望（早/遅/休）が色で見えます。希望セルをタップで割り当て・解除できます。
      </p>
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
                return (
                  <td
                    key={date}
                    className={`cell-btn ${assigned ? 'assigned' : ''}`}
                    onClick={() => {
                      if (!targetSlot) return;
                      void toggleAssignment(date, targetSlot, person.id, assigned);
                    }}
                  >
                    {REQUEST_MARK[req]}
                  </td>
                );
              })}
            </tr>
          ))}
          {WORK_SLOTS.map((slot) => (
            <tr key={slot}>
              <td className="staff-name">{SLOT_LABELS[slot]}人数</td>
              {dates.map((date) => {
                const count = countAssigned(assignments, date, slot);
                const level = fulfillmentLevel(count);
                return <td key={date} className={`count ${level}`}>{count}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
