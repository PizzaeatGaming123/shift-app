import { useApp } from '../store/AppContext';
import { MonthCalendar } from './MonthCalendar';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';
import type { WorkSlot } from '../types';

interface SharedViewProps { year: number; month: number; }

const SLOT_ICON: Record<WorkSlot, string> = { early: '🌅', late: '🌙' };

export function SharedView({ year, month }: SharedViewProps) {
  const { staff, assignments } = useApp();
  const nameOf = (id: string) => staff.find((s) => s.id === id)?.name ?? '';
  const hasAny = assignments.some((assignment) => assignment.staffIds.length > 0);

  return (
    <section className="shared-view">
      <p className="hint">確定したシフトです。各日の出勤者を確認できます。</p>
      {!hasAny && <div className="empty-inline">まだ確定したシフトがありません。</div>}
      <MonthCalendar
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
                  <span className={`chip ${slot}`}>{SLOT_ICON[slot]} {SLOT_LABELS[slot]}</span>
                  <span className="shared-names">{names.join('、')}</span>
                </div>
              );
            })}
          </>
        )}
      />
    </section>
  );
}
