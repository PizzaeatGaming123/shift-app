import { useApp } from '../store/AppContext';
import { MonthCalendar } from './MonthCalendar';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';
import { useSetting } from '../lib/settings';
import { shiftStatusSettingKey, type ShiftPlanStatus } from '../lib/shiftStatus';

interface SharedViewProps { year: number; month: number; }

/** 姓だけを短く取り出す（フルネームのスペース手前、または先頭2文字）。 */
function shortName(full: string): string {
  if (!full) return '';
  const parts = full.split(/[\s　]+/);
  if (parts.length > 1) return parts[0];
  return full.slice(0, 2);
}

export function SharedView({ year, month }: SharedViewProps) {
  const { me, staff, assignments, storeId } = useApp();
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const statusKey = shiftStatusSettingKey(storeId, monthKey);
  const hasExplicitStatus = localStorage.getItem(statusKey) !== null;
  const [shiftStatus] = useSetting<ShiftPlanStatus>(
    statusKey,
    'DRAFT',
  );
  const myId = me ? String(me.id) : '';
  const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? '';
  const published = !hasExplicitStatus
    ? assignments.some((assignment) => assignment.staffIds.length > 0)
    : shiftStatus === 'PUBLISHED' || shiftStatus === 'REPUBLISHED';
  const hasAny = published && assignments.some((assignment) => assignment.staffIds.length > 0);

  return (
    <section className="shared-view shared-view--compact">
      {!published && <div className="empty-inline">店長が確定したシフトは、公開後に表示されます。</div>}
      {published && !hasAny && <div className="empty-inline">公開済みの勤務予定はありません。</div>}
      {published && <MonthCalendar
        year={year}
        month={month}
        renderCell={(date) => {
          const myAssignment = WORK_SLOTS.find((slot) =>
            assignments.some((a) => a.date === date && a.slot === slot && a.staffIds.includes(myId)));
          return (
            <div className={`shared-cell${myAssignment ? ' is-mine' : ''}`}>
              {myAssignment && (
                <span className={`shared-mine chip-${myAssignment}`}>
                  自分・{SLOT_LABELS[myAssignment]}
                </span>
              )}
              {WORK_SLOTS.map((slot) => {
                const a = assignments.find((x) => x.date === date && x.slot === slot);
                const others = (a?.staffIds ?? []).filter((id) => id !== myId).map(nameOf).filter(Boolean);
                if (others.length === 0) return null;
                return (
                  <div key={slot} className={`shared-others chip-${slot}`}>
                    <span className="shared-others__label">{SLOT_LABELS[slot]}</span>
                    <span className="shared-others__names">
                      {others.map(shortName).join('・')}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }}
      />}
    </section>
  );
}
