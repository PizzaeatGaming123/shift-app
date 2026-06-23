import type {
  Assignment,
  Staff,
  StoreNote,
  WorkSlot,
} from '../../types';
import { getDailySummary } from './shiftViewModel';

export type SummaryItemKey =
  | 'sales'
  | 'salesPerHour'
  | 'workHours'
  | 'laborCost'
  | 'modelShift'
  | 'rankTotal'
  | 'storeNote'
  | 'positionNote';

export interface RequiredByBand {
  early: number;
  late: number;
}

interface ShiftTableSummaryRowsProps {
  dates: string[];
  assignments: Assignment[];
  staff: Staff[];
  salesTarget: number;
  storeNotes: StoreNote[];
  positionNotes: Record<string, string>;
  visibleItems: SummaryItemKey[];
  requiredByBand: (date: string) => RequiredByBand;
  onStoreNoteChange: (date: string, text: string) => void;
  onPositionNoteChange: (date: string, text: string) => void;
  slotHours?: Record<WorkSlot, number>;
}

const BANDS: {
  key: keyof RequiredByBand;
  label: string;
  slots: WorkSlot[];
}[] = [
  { key: 'early', label: '早番 7:00〜16:00', slots: ['early'] },
  { key: 'late', label: '遅番 15:00〜24:00', slots: ['late'] },
];

function yen(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function coverage(assignments: Assignment[], date: string, slots: WorkSlot[]): number {
  const staffIds = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.date !== date || !slots.includes(assignment.slot)) continue;
    for (const staffId of assignment.staffIds) staffIds.add(staffId);
  }
  return staffIds.size;
}

export function ShiftTableSummaryRows({
  dates,
  assignments,
  staff,
  salesTarget,
  storeNotes,
  positionNotes,
  visibleItems,
  requiredByBand,
  onStoreNoteChange,
  onPositionNoteChange,
  slotHours,
}: ShiftTableSummaryRowsProps) {
  const visible = new Set(visibleItems);
  const summaries = new Map(
    dates.map((date) => [
      date,
      getDailySummary({ date, assignments, staff, salesTarget, slotHours }),
    ]),
  );

  return (
    <>
      {visible.has('sales') && (
        <tr className="rk-summary-row">
          <th scope="row" role="rowheader">売上計画</th>
          {dates.map((date) => <td key={date}>{yen(summaries.get(date)!.sales)}</td>)}
        </tr>
      )}

      {visible.has('salesPerHour') && (
        <tr className="rk-summary-row">
          <th scope="row" role="rowheader">人時売上高</th>
          {dates.map((date) => (
            <td key={date}>{yen(summaries.get(date)!.salesPerHour)}</td>
          ))}
        </tr>
      )}

      {visible.has('workHours') && (
        <tr className="rk-summary-row">
          <th scope="row" role="rowheader">総労働時間</th>
          {dates.map((date) => (
            <td key={date}>{summaries.get(date)!.workHours.toFixed(2)} h</td>
          ))}
        </tr>
      )}

      {visible.has('laborCost') && (
        <tr className="rk-summary-row">
          <th scope="row" role="rowheader">人件費</th>
          {dates.map((date) => {
            const summary = summaries.get(date)!;
            return (
              <td key={date}>
                <span>{yen(summary.laborCost)}</span>
                <small>({summary.laborCostRate.toFixed(2)}%)</small>
              </td>
            );
          })}
        </tr>
      )}

      {visible.has('modelShift') && (
        <>
          <tr className="rk-summary-section">
            <th scope="row" role="rowheader">全体モデルシフト</th>
            <td colSpan={dates.length} />
          </tr>
          {BANDS.map((band) => (
            <tr className="rk-model-shift-row" key={band.key}>
              <th scope="row" role="rowheader">{band.label}</th>
              {dates.map((date) => (
                <td key={date}>
                  {coverage(assignments, date, band.slots)}/{requiredByBand(date)[band.key]}
                </td>
              ))}
            </tr>
          ))}
        </>
      )}

      {visible.has('rankTotal') && (
        <tr className="rk-summary-row">
          <th scope="row" role="rowheader">ランク計</th>
          {dates.map((date) => <td key={date}>{summaries.get(date)!.rankTotal}</td>)}
        </tr>
      )}

      {visible.has('storeNote') && (
        <tr className="rk-note-row">
          <th scope="row" role="rowheader">店舗メモ</th>
          {dates.map((date) => {
            const text = storeNotes.find((note) => note.date === date)?.text ?? '';
            return (
              <td key={date}>
                <button
                  type="button"
                  aria-label={`${date}の店舗メモを編集`}
                  onClick={() => onStoreNoteChange(date, text)}
                >
                  {text || '—'}
                </button>
              </td>
            );
          })}
        </tr>
      )}

      {visible.has('positionNote') && (
        <tr className="rk-note-row">
          <th scope="row" role="rowheader">ポジションメモ</th>
          {dates.map((date) => (
            <td key={date}>
              <button
                type="button"
                aria-label={`${date}のポジションメモを編集`}
                onClick={() => onPositionNoteChange(date, positionNotes[date] ?? '')}
              >
                {positionNotes[date] || '—'}
              </button>
            </td>
          ))}
        </tr>
      )}
    </>
  );
}
