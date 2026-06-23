import { useApp } from '../store/AppContext';
import { MonthCalendar } from './MonthCalendar';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';
import { useSetting } from '../lib/settings';
import { shiftStatusSettingKey, type ShiftPlanStatus } from '../lib/shiftStatus';

interface SharedViewProps { year: number; month: number; }

export function SharedView({ year, month }: SharedViewProps) {
  const { staff, assignments, storeId } = useApp();
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const statusKey = shiftStatusSettingKey(storeId, monthKey);
  const hasExplicitStatus = localStorage.getItem(statusKey) !== null;
  const [shiftStatus] = useSetting<ShiftPlanStatus>(
    statusKey,
    'DRAFT',
  );
  const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? '';
  const published = !hasExplicitStatus
    ? assignments.some((assignment) => assignment.staffIds.length > 0)
    : shiftStatus === 'PUBLISHED' || shiftStatus === 'REPUBLISHED';
  const hasAny = published && assignments.some((assignment) => assignment.staffIds.length > 0);

  return (
    <section className="shared-view">
      <p className="hint">公開されたシフトです。各日の勤務予定者を確認できます。</p>
      {!published && <div className="empty-inline">店長が確定したシフトは、公開後に表示されます。</div>}
      {published && !hasAny && <div className="empty-inline">公開済みの勤務予定はありません。</div>}
      {published && <MonthCalendar
        year={year}
        month={month}
        renderCell={(date) => (
          <>
            {WORK_SLOTS.map((slot) => {
              const a = assignments.find((x) => x.date === date && x.slot === slot);
              const names = (a?.staffIds ?? []).map(nameOf).filter(Boolean);
              if (names.length === 0) return null;
              return (
                <div key={slot} className="shared-slot">
                  <span className={`chip ${slot}`}>{SLOT_LABELS[slot]}</span>
                  <span className="shared-names">{names.join('、')}</span>
                </div>
              );
            })}
          </>
        )}
      />}
    </section>
  );
}
