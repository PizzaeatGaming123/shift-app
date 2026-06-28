import { maxConsecutiveAssignedDays, staffMonthlyHours } from '../../store/labor';
import { SLOT_HOURS } from '../../constants';
import { hourLimitLevel } from '../../lib/hourLimit';
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
  /**
   * シフトモード。'assignment' は点線希望のみ＋空セルに「＋」、
   * 'confirmed' はベタ塗り割当のみ、
   * 'readonly' は両方を <span> で同時表示する（クリック不可）。
   */
  shiftMode?: 'assignment' | 'confirmed' | 'readonly';
  onToggleAssignment: (
    date: string,
    slot: WorkSlot,
    staffId: string,
    assigned: boolean,
    startTime?: string | null,
    endTime?: string | null,
  ) => void;
  /** チップ・空セル「+」クリック時のエディタ起動。指定時のみ起動する。 */
  onOpenEditor?: (input: {
    staffId: string;
    date: string;
    existing?: { slot: WorkSlot; startTime: string | null; endTime: string | null };
  }) => void;
  /**
   * 「先月と同じ」ボタン押下。スタッフ名の横に小さく出る。
   * 渡されない場合はボタン自体を出さない（ShiftConfirmDialog や表示プリセットによっては不要なため）。
   */
  onCopyPreviousMonth?: (staffId: string) => void;
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
  shiftMode = 'assignment',
  onOpenEditor,
  onCopyPreviousMonth,
}: ShiftStaffRowProps) {
  const totalHours = staffMonthlyHours(assignments, person.id, dates, slotHours);
  const consecutiveDays = maxConsecutiveAssignedDays(
    assignments,
    person.id,
    dates,
  );
  const warnings = Number(consecutiveDays >= 6) + Number(totalHours > 180);
  const limitLevel = hourLimitLevel(totalHours, person.monthlyHourLimit);
  const hoursClass = `rk-shift-staff__hours rk-warn-${limitLevel}`;
  const interactive = shiftMode !== 'readonly';

  return (
    <tr className={`rk-shift-staff-row rk-shift-staff-row--${density}`}>
      <th scope="row" className="rk-shift-staff">
        <span className="rk-shift-staff__name">{person.name}</span>
        <span className={hoursClass}>{formatDuration(totalHours)}</span>
        {warnings > 0 && (
          <span
            className="rk-shift-staff__warning"
            aria-label={`${warnings}件の労務警告`}
          >
            !
          </span>
        )}
        {onCopyPreviousMonth && (
          <button
            type="button"
            className="rk-shift-staff__copy"
            aria-label={`${person.name}の先月と同じシフトを今月に複製`}
            onClick={() => onCopyPreviousMonth(person.id)}
          >
            先月と同じ
          </button>
        )}
      </th>

      {dates.map((date) => {
        const cell = getShiftCellModel({
          staffId: person.id,
          date,
          requests,
          assignments,
          notes,
          employmentType: person.employmentType,
        });
        // 'assignment' モードでは、保存済みの assignment があれば assignment を点線チップとして表示する
        // （= 編集結果がすぐ反映される）。assignment が無ければ希望（request）を点線で表示する。
        // 'confirmed' / 'readonly' では、希望（点線）と確定（ベタ塗り）の両方を上下に積んで表示する。
        const inAssignment = shiftMode === 'assignment';
        const assignmentVisible = cell.assignment && layers.visibleSlots[cell.assignment.slot];
        const requestVisible = cell.request && layers.showRequests && layers.visibleSlots[cell.request.slot];
        // assignment モード: 既存割当があればそれを点線で描画
        const showAssignmentDraft = inAssignment && assignmentVisible;
        // confirmed / readonly: 確定（ベタ塗り）を描画
        const showAssignment = !inAssignment && assignmentVisible;
        // 希望（点線）: assignment モードで draft が出ているときは出さず、それ以外は希望があれば常に出す
        const showRequest = inAssignment
          ? !assignmentVisible && requestVisible
          : requestVisible;
        const patternSource: WorkSlot | null = showAssignment && cell.assignment && isWorkSlot(cell.assignment.slot)
          ? cell.assignment.slot
          : showRequest && cell.request && isWorkSlot(cell.request.slot)
            ? cell.request.slot
            : null;
        const taskSource: WorkSlot | null = showAssignment && cell.assignment && isWorkSlot(cell.assignment.slot)
          ? cell.assignment.slot
          : null;

        const isEmpty = !showRequest && !showAssignment && !showAssignmentDraft;

        function openEditorForRequest() {
          if (!onOpenEditor) return;
          onOpenEditor({ staffId: person.id, date });
        }

        function openEditorForAssignment() {
          if (!onOpenEditor || !cell.assignment) return;
          onOpenEditor({
            staffId: person.id,
            date,
            existing: {
              slot: cell.assignment.slot as WorkSlot,
              startTime: cell.assignment.startTime,
              endTime: cell.assignment.endTime,
            },
          });
        }

        return (
          <td className="rk-shift-cell" key={date}>
            {showRequest && cell.request && (
              interactive && cell.request.slot !== 'off' ? (
                <button
                  type="button"
                  className={['rk-shift-chip', 'rk-shift-chip--request', slotClass(cell.request.slot)].join(' ')}
                  aria-label={`${person.name} ${date} ${cell.request.label}を編集`}
                  onClick={openEditorForRequest}
                >
                  {cell.request.label}
                </button>
              ) : (
                <span className={['rk-shift-chip', 'rk-shift-chip--request', slotClass(cell.request.slot)].join(' ')}>
                  {cell.request.label}
                </span>
              )
            )}

            {showAssignmentDraft && cell.assignment && (
              <button
                type="button"
                className={['rk-shift-chip', 'rk-shift-chip--request', slotClass(cell.assignment.slot)].join(' ')}
                aria-label={`${person.name} ${date} ${cell.assignment.label}を編集`}
                onClick={openEditorForAssignment}
              >
                {cell.assignment.label}
              </button>
            )}

            {showAssignment && cell.assignment && (
              interactive ? (
                <button
                  type="button"
                  className={['rk-shift-chip', 'rk-shift-chip--assigned', slotClass(cell.assignment.slot)].join(' ')}
                  aria-label={`${person.name} ${date} ${cell.assignment.label}を編集`}
                  onClick={openEditorForAssignment}
                >
                  {cell.assignment.label}
                </button>
              ) : (
                <span className={['rk-shift-chip', 'rk-shift-chip--assigned', slotClass(cell.assignment.slot)].join(' ')}>
                  {cell.assignment.label}
                </span>
              )
            )}

            {isEmpty && interactive && shiftMode === 'assignment' && onOpenEditor && (
              <button
                type="button"
                className="rk-shift-cell__empty"
                aria-label={`${person.name} ${date} に割当を追加`}
                onClick={() => onOpenEditor({ staffId: person.id, date })}
              >
                ＋
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
