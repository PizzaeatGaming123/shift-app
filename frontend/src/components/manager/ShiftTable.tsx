import { useState } from 'react';
import type {
  Assignment,
  DayNote,
  ShiftRequest,
  Staff,
  StoreNote,
  WorkSlot,
} from '../../types';
import { DEFAULT_SHIFT_PATTERNS, type ShiftPatterns } from '../../lib/shiftPatterns';
import { AssignTimeModal, type AssignTimeResult } from './AssignTimeModal';
import { ShiftStaffRow } from './ShiftStaffRow';
import {
  type RequiredByBand,
  type SummaryItemKey,
  ShiftTableSummaryRows,
} from './ShiftTableSummaryRows';
import { sortShiftStaff } from './shiftViewModel';
import type {
  ShiftLayerVisibility,
  ShiftTableDensity,
  StaffSortMode,
} from './types';

interface ShiftTableProps {
  dates: string[];
  staff: Staff[];
  requests: ShiftRequest[];
  assignments: Assignment[];
  notes: DayNote[];
  storeNotes: StoreNote[];
  positionNotes: Record<string, string>;
  layers: ShiftLayerVisibility;
  density: ShiftTableDensity;
  sortMode: StaffSortMode;
  salesTarget: number;
  requiredByBand: (date: string) => RequiredByBand;
  visibleSummaryItems?: SummaryItemKey[];
  onToggleAssignment: (
    date: string,
    slot: WorkSlot,
    staffId: string,
    assigned: boolean,
    startTime?: string | null,
    endTime?: string | null,
  ) => void;
  onStoreNoteChange: (date: string, text: string) => void;
  onPositionNoteChange: (date: string, text: string) => void;
  onSortChange: (mode: StaffSortMode) => void;
  /** スタッフ名横の「先月と同じ」ボタンのコールバック。未指定ならボタンは出ない。 */
  onCopyPreviousMonth?: (staffId: string) => void;
  slotHours?: Record<WorkSlot, number>;
  shiftPatterns?: ShiftPatterns;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const SORT_ORDER: StaffSortMode[] = ['default', 'name', 'hours'];
const SORT_LABEL: Record<StaffSortMode, string> = {
  default: '標準',
  name: '氏名順',
  hours: '労働時間順',
};
const DEFAULT_SUMMARY_ITEMS: SummaryItemKey[] = [
  'workHours',
  'modelShift',
  'storeNote',
  'positionNote',
];

function dateHeader(date: string): {
  label: string;
  className: string;
} {
  const parsed = new Date(`${date}T00:00:00`);
  const weekday = parsed.getDay();
  return {
    label: `${parsed.getDate()}(${WEEKDAYS[weekday]})`,
    className: weekday === 0
      ? 'rk-shift-date--sunday'
      : weekday === 6
        ? 'rk-shift-date--saturday'
        : '',
  };
}

function nextSortMode(mode: StaffSortMode): StaffSortMode {
  const index = SORT_ORDER.indexOf(mode);
  return SORT_ORDER[(index + 1) % SORT_ORDER.length];
}

export function ShiftTable({
  dates,
  staff,
  requests,
  assignments,
  notes,
  storeNotes,
  positionNotes,
  layers,
  density,
  sortMode,
  salesTarget,
  requiredByBand,
  visibleSummaryItems = DEFAULT_SUMMARY_ITEMS,
  onToggleAssignment,
  onStoreNoteChange,
  onPositionNoteChange,
  onSortChange,
  onCopyPreviousMonth,
  slotHours,
  shiftPatterns,
}: ShiftTableProps) {
  const visibleDates = new Set(dates);
  const assignedStaffIds = new Set(
    assignments
      .filter((assignment) => visibleDates.has(assignment.date))
      .flatMap((assignment) => assignment.staffIds),
  );
  const filteredStaff = layers.onlyAssigned
    ? staff.filter((person) => assignedStaffIds.has(person.id))
    : staff;
  const visibleStaff = sortShiftStaff({
    staff: filteredStaff,
    assignments,
    dates,
    mode: sortMode,
    slotHours,
  });
  const wide = dates.length > 16;

  // 「＋」ボタンで開く時間入力モーダル。対象の (staffId, date) を保持する。
  const [assignTarget, setAssignTarget] = useState<{ staffId: string; date: string } | null>(null);
  const targetStaff = assignTarget
    ? staff.find((person) => person.id === assignTarget.staffId) ?? null
    : null;

  function handleAssignSave(result: AssignTimeResult) {
    if (!assignTarget) return;
    onToggleAssignment(
      assignTarget.date,
      result.slot,
      assignTarget.staffId,
      false,
      result.startTime,
      result.endTime,
    );
    setAssignTarget(null);
  }

  return (
    <div className={`rk-shift-table-scroll${wide ? ' rk-shift-table-scroll--wide' : ''}`}>
      <table className={`rk-shift-table rk-shift-table--${density}${wide ? ' rk-shift-table--wide' : ''}`}>
        <thead className={layers.pinHeader ? 'rk-shift-table__head--fixed' : undefined}>
          <tr>
            <th scope="col" className="rk-shift-table__staff-heading">
              <button
                type="button"
                onClick={() => onSortChange(nextSortMode(sortMode))}
              >
                スタッフ並び替え {SORT_LABEL[sortMode]}
              </button>
            </th>
            {dates.map((date) => {
              const header = dateHeader(date);
              return (
                <th
                  scope="col"
                  className={header.className}
                  key={date}
                >
                  {header.label}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {layers.showSummary && (
            <ShiftTableSummaryRows
              dates={dates}
              assignments={assignments}
              staff={staff}
              salesTarget={salesTarget}
              storeNotes={storeNotes}
              positionNotes={positionNotes}
              visibleItems={visibleSummaryItems}
              requiredByBand={requiredByBand}
              onStoreNoteChange={onStoreNoteChange}
              onPositionNoteChange={onPositionNoteChange}
              slotHours={slotHours}
            />
          )}

          {visibleStaff.map((person) => (
            <ShiftStaffRow
              key={person.id}
              person={person}
              dates={dates}
              requests={requests}
              assignments={assignments}
              notes={notes}
              layers={layers}
              density={density}
              slotHours={slotHours}
              shiftPatterns={shiftPatterns}
              onToggleAssignment={onToggleAssignment}
              onOpenAssignTimeModal={(staffId, date) => setAssignTarget({ staffId, date })}
              onCopyPreviousMonth={onCopyPreviousMonth}
            />
          ))}

          {visibleStaff.length === 0 && (
            <tr className="rk-shift-table__empty">
              <td colSpan={dates.length + 1}>表示対象のスタッフがいません</td>
            </tr>
          )}
        </tbody>
      </table>

      {targetStaff && (
        <AssignTimeModal
          open
          staffName={targetStaff.name}
          employmentType={targetStaff.employmentType}
          patterns={shiftPatterns ?? DEFAULT_SHIFT_PATTERNS}
          onSave={handleAssignSave}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
}
