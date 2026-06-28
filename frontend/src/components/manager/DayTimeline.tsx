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
  late: { start: 15, end: 24 },
};

function hourLabel(hour: number): string {
  return `${hour}:00`;
}

/** "HH:MM" → 小数の時間（例: "09:30" → 9.5）。 */
function parseHour(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour + minute / 60;
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
                const idx = assignment.staffIds.indexOf(person.id);
                const customStart = assignment.startTimes?.[idx] ?? null;
                const customEnd = assignment.endTimes?.[idx] ?? null;
                const range = SLOT_RANGE[assignment.slot];
                // 任意時間が両方指定されていればそれをバーの位置・幅・ラベルに使う。
                // どちらか欠けていれば slot の既定時間にフォールバック。
                const startHourValue = parseHour(customStart) ?? range.start;
                const endHourValue = parseHour(customEnd) ?? range.end;
                const left = ((startHourValue - startHour) / totalHours) * 100;
                const width = ((endHourValue - startHourValue) / totalHours) * 100;
                const useTimeLabel = customStart != null && customEnd != null;
                const time = useTimeLabel
                  ? `${customStart}-${customEnd}`
                  : `${hourLabel(range.start)}-${hourLabel(range.end)}`;
                // 任意時間が入っていればチップ表示も「9:00-13:00」のような数字ラベルに、
                // 入っていなければ従来通り「早番」「遅番」ラベル。
                const headline = useTimeLabel
                  ? time
                  : SLOT_LABELS[assignment.slot];

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
                    <span>{headline}</span>
                    {!useTimeLabel && <small>{time}</small>}
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
