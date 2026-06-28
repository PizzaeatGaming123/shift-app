import { useApp } from '../store/AppContext';
import { getMonthDates } from '../lib/date';
import { isPublishedStatus, useEffectiveShiftStatus } from '../lib/shiftStatus';
import { ShiftTable } from './manager/ShiftTable';
import { DEFAULT_WEEKDAY_REQUIRED, requiredForDate } from './manager/modelShift';

interface SharedViewProps { year: number; month: number; }

/** スタッフ画面の「確定シフト」。店長と同じマトリクスを、自分1人分・サマリ行なしで表示する。 */
export function SharedView({ year, month }: SharedViewProps) {
  const { me, staff, assignments, requests, dayNotes, storeId } = useApp();
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const [shiftStatus] = useEffectiveShiftStatus(storeId, monthKey, assignments);
  const myId = me ? String(me.id) : '';
  const mySelf = staff.find((s) => s.id === myId);
  const published = isPublishedStatus(shiftStatus);
  const hasAny = published && assignments.some((assignment) => assignment.staffIds.length > 0);

  const dates = getMonthDates(year, month);

  if (!published) {
    return (
      <section className="shared-view">
        <div className="empty-inline">店長が確定したシフトは、公開後に表示されます。</div>
      </section>
    );
  }
  if (!hasAny) {
    return (
      <section className="shared-view">
        <div className="empty-inline">公開済みの勤務予定はありません。</div>
      </section>
    );
  }
  if (!mySelf) {
    return (
      <section className="shared-view">
        <div className="empty-inline">あなたのシフトデータが見つかりません。</div>
      </section>
    );
  }

  // 自分を最上段に固定し、その下に他のスタッフ（社員・バイト・パート）を並べる
  const others = staff.filter((person) => person.role === 'STAFF' && person.id !== myId);

  return (
    <section className="shared-view shared-view--self">
      <ShiftTable
        dates={dates}
        staff={[mySelf, ...others]}
        requests={requests}
        assignments={assignments}
        notes={dayNotes}
        storeNotes={[]}
        positionNotes={{}}
        layers={{
          showSummary: false,
          pinHeader: false,
          onlyAssigned: false,
          showPatterns: true,
          showRequests: false,
          showTasks: true,
          showNotes: true,
          visibleSlots: { early: true, late: true, any: true, off: true },
        }}
        density="small"
        sortMode="default"
        salesTarget={0}
        requiredByBand={(date) => requiredForDate(DEFAULT_WEEKDAY_REQUIRED, date)}
        visibleSummaryItems={[]}
        shiftMode="readonly"
        onToggleAssignment={() => { /* read-only */ }}
        onStoreNoteChange={() => { /* read-only */ }}
        onPositionNoteChange={() => { /* read-only */ }}
        onSortChange={() => { /* read-only */ }}
      />
    </section>
  );
}
