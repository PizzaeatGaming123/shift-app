import type {
  Assignment,
  DayNote,
  ShiftRequest,
  Staff,
  StoreNote,
  WorkSlot,
} from '../../types';
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
  requiredByBand: RequiredByBand;
  visibleSummaryItems?: SummaryItemKey[];
  onToggleAssignment: (
    date: string,
    slot: WorkSlot,
    staffId: string,
    assigned: boolean,
  ) => void;
  onStoreNoteChange: (date: string, text: string) => void;
  onPositionNoteChange: (date: string, text: string) => void;
  onSortChange: (mode: StaffSortMode) => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const SORT_ORDER: StaffSortMode[] = ['default', 'name', 'hours', 'rank'];
const SORT_LABEL: Record<StaffSortMode, string> = {
  default: '標準',
  name: '氏名順',
  hours: '労働時間順',
  rank: 'ランク順',
};
const DEFAULT_SUMMARY_ITEMS: SummaryItemKey[] = [
  'sales',
  'salesPerHour',
  'workHours',
  'laborCost',
  'modelShift',
  'rankTotal',
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
  });

  return (
    <div className="rk-shift-table-scroll">
      <table className={`rk-shift-table rk-shift-table--${density}`}>
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
              onToggleAssignment={onToggleAssignment}
            />
          ))}

          {visibleStaff.length === 0 && (
            <tr className="rk-shift-table__empty">
              <td colSpan={dates.length + 1}>表示対象のスタッフがいません</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
