import { maxConsecutiveAssignedDays, staffMonthlyHours } from '../../store/labor';
import { SLOT_HOURS } from '../../constants';
import {
  DEFAULT_SHIFT_PATTERNS,
  type ShiftPatterns,
} from '../../lib/shiftPatterns';
import type {
  Assignment,
  DayNote,
  ShiftRequest,
  Staff,
  WorkSlot,
} from '../../types';
import { formatDuration, getShiftCellModel } from './shiftViewModel';
import type { ShiftLayerVisibility, ShiftTableDensity } from './types';

interface ShiftStaffRowProps {
  person: Staff;
  dates: string[];
  requests: ShiftRequest[];
  assignments: Assignment[];
  notes: DayNote[];
  layers: ShiftLayerVisibility;
  density: ShiftTableDensity;
  /** 店舗ごとの slot あたりの時間。未指定なら既定の早9h・遅9h で集計する。 */
  slotHours?: Record<WorkSlot, number>;
  shiftPatterns?: ShiftPatterns;
  onToggleAssignment: (
    date: string,
    slot: WorkSlot,
    staffId: string,
    assigned: boolean,
  ) => void;
}

function slotClass(slot: WorkSlot | 'any' | 'off'): string {
  return `rk-shift-chip--${slot}`;
}

function isWorkSlot(slot: WorkSlot | 'any' | 'off'): slot is WorkSlot {
  return slot === 'early' || slot === 'late';
}

function taskLabel(slot: WorkSlot): string {
  return slot === 'early' ? '開店作業' : '閉店作業';
}

function patternTime(patterns: ShiftPatterns, slot: WorkSlot): string {
  const pattern = patterns[slot];
  return `${pattern.start}-${pattern.end}`;
}

export function ShiftStaffRow({
  person,
  dates,
  requests,
  assignments,
  notes,
  layers,
  density,
  slotHours = SLOT_HOURS,
  shiftPatterns = DEFAULT_SHIFT_PATTERNS,
  onToggleAssignment,
}: ShiftStaffRowProps) {
  const totalHours = staffMonthlyHours(assignments, person.id, dates, slotHours);
  const consecutiveDays = maxConsecutiveAssignedDays(
    assignments,
    person.id,
    dates,
  );
  const warnings = Number(consecutiveDays >= 6) + Number(totalHours > 180);

  return (
    <tr className={`rk-shift-staff-row rk-shift-staff-row--${density}`}>
      <th scope="row" className="rk-shift-staff">
        <span className="rk-shift-staff__name">{person.name}</span>
        <span className="rk-shift-staff__hours">{formatDuration(totalHours)}</span>
        {warnings > 0 && (
          <span
            className="rk-shift-staff__warning"
            aria-label={`${warnings}件の労務警告`}
          >
            !
          </span>
        )}
      </th>

      {dates.map((date) => {
        const cell = getShiftCellModel({
          staffId: person.id,
          date,
          requests,
          assignments,
          notes,
        });
        const requestVisible = cell.request
          && layers.showRequests
          && layers.visibleSlots[cell.request.slot];
        const assignmentVisible = cell.assignment
          && layers.visibleSlots[cell.assignment.slot];
        const patternSource: WorkSlot | null = assignmentVisible && cell.assignment && isWorkSlot(cell.assignment.slot)
          ? cell.assignment.slot
          : requestVisible && cell.request && isWorkSlot(cell.request.slot)
            ? cell.request.slot
            : null;
        const taskSource: WorkSlot | null = assignmentVisible && cell.assignment && isWorkSlot(cell.assignment.slot)
          ? cell.assignment.slot
          : null;

        return (
          <td className="rk-shift-cell" key={date}>
            {requestVisible && cell.request && (
              cell.request.slot === 'off' ? (
                <span
                  className={[
                    'rk-shift-chip',
                    'rk-shift-chip--request',
                    slotClass(cell.request.slot),
                  ].join(' ')}
                >
                  {cell.request.label}
                </span>
              ) : (
                <button
                  type="button"
                  className={[
                    'rk-shift-chip',
                    'rk-shift-chip--request',
                    slotClass(cell.request.slot),
                  ].join(' ')}
                  aria-label={`${person.name} ${date} ${cell.request.label}を割り当て`}
                  onClick={() => {
                    // 'any' は早番に解決（バックエンドの WorkSlot は early/late のみ）。
                    const slot: WorkSlot = cell.request!.slot === 'late' ? 'late' : 'early';
                    onToggleAssignment(date, slot, person.id, false);
                  }}
                >
                  {cell.request.label}
                </button>
              )
            )}

            {assignmentVisible && cell.assignment && (
              <button
                type="button"
                className={[
                  'rk-shift-chip',
                  'rk-shift-chip--assigned',
                  slotClass(cell.assignment.slot),
                ].join(' ')}
                aria-label={`${person.name} ${date} ${cell.assignment.label}の割り当てを解除`}
                onClick={() => {
                  onToggleAssignment(
                    date,
                    cell.assignment!.slot as WorkSlot,
                    person.id,
                    true,
                  );
                }}
              >
                {cell.assignment.label}
              </button>
            )}

            {layers.showPatterns && patternSource && (
              <span className="rk-shift-cell__pattern">
                {patternTime(shiftPatterns, patternSource)}
              </span>
            )}

            {layers.showTasks && taskSource && (
              <span className="rk-shift-cell__task">
                {taskLabel(taskSource)}
              </span>
            )}

            {layers.showNotes && cell.note && (
              <span className="rk-shift-cell__note">{cell.note}</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
