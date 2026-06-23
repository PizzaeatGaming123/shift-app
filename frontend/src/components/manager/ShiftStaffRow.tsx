import { maxConsecutiveAssignedDays, staffMonthlyHours } from '../../store/labor';
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

export function ShiftStaffRow({
  person,
  dates,
  requests,
  assignments,
  notes,
  layers,
  density,
  onToggleAssignment,
}: ShiftStaffRowProps) {
  const totalHours = staffMonthlyHours(assignments, person.id, dates);
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

        return (
          <td className="rk-shift-cell" key={date}>
            {requestVisible && cell.request && (
              <span
                className={[
                  'rk-shift-chip',
                  'rk-shift-chip--request',
                  slotClass(cell.request.slot),
                ].join(' ')}
              >
                {cell.request.label}
              </span>
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

            {layers.showNotes && cell.note && (
              <span className="rk-shift-cell__note">{cell.note}</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
