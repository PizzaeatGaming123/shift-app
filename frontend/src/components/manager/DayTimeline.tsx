import { SLOT_LABELS } from '../../constants';
import type { Assignment, Staff, WorkSlot } from '../../types';

interface DayTimelineProps {
  date: string;
  startHour: number;
  endHour: number;
  staff: Staff[];
  assignments: Assignment[];
  onAdjust: (staffId: string, date: string, slot: WorkSlot) => void;
}

const SLOT_RANGE: Record<WorkSlot, { start: number; end: number }> = {
  early: { start: 7, end: 16 },
  mid: { start: 11, end: 20 },
  late: { start: 15, end: 24 },
};

function hourLabel(hour: number): string {
  return `${hour}:00`;
}

export function DayTimeline({
  date,
  startHour,
  endHour,
  staff,
  assignments,
  onAdjust,
}: DayTimelineProps) {
  const totalHours = endHour - startHour;

  return (
    <section className="rk-day-timeline" aria-label={`${date}の日別シフト`}>
      <div className="rk-day-timeline__hours" aria-hidden="true">
        <span className="rk-day-timeline__hours-spacer" />
        {Array.from(
          { length: endHour - startHour + 1 },
          (_, index) => (
            <span key={startHour + index}>
              {String(startHour + index).padStart(2, '0')}:00
            </span>
          ),
        )}
      </div>

      {staff.map((person) => {
        const personAssignments = assignments.filter(
          (assignment) =>
            assignment.date === date
            && assignment.staffIds.includes(person.id),
        );

        return (
          <div className="rk-day-timeline__row" key={person.id}>
            <span className="rk-day-timeline__staff">{person.name}</span>
            <div className="rk-day-timeline__track">
              {personAssignments.map((assignment) => {
                const range = SLOT_RANGE[assignment.slot];
                const left = ((range.start - startHour) / totalHours) * 100;
                const width = ((range.end - range.start) / totalHours) * 100;
                const time = `${hourLabel(range.start)}-${hourLabel(range.end)}`;

                return (
                  <button
                    type="button"
                    key={assignment.slot}
                    className={[
                      'rk-day-timeline__bar',
                      `rk-day-timeline__bar--${assignment.slot}`,
                    ].join(' ')}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    aria-label={`${person.name} ${time}を編集`}
                    onClick={() => onAdjust(person.id, date, assignment.slot)}
                  >
                    <span>{SLOT_LABELS[assignment.slot]}</span>
                    <small>{time}</small>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {staff.length === 0 && (
        <p className="rk-day-timeline__empty">表示対象のスタッフがいません</p>
      )}
    </section>
  );
}
