import { useApp } from '../store/AppContext';
import { MonthCalendar } from './MonthCalendar';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';

interface SharedViewProps {
  storeId: string;
  year: number;
  month: number;
}

export function SharedView({ storeId, year, month }: SharedViewProps) {
  const { data } = useApp();
  const nameOf = (id: string) => data.staff.find((s) => s.id === id)?.name ?? '';

  return (
    <section>
      <p style={{ color: '#666', fontSize: 14 }}>確定したシフトです。各日の出勤者を確認できます。</p>
      <MonthCalendar
        year={year}
        month={month}
        renderCell={(date) => (
          <>
            {WORK_SLOTS.map((slot) => {
              const a = data.assignments.find(
                (x) => x.date === date && x.slot === slot
              );
              // 当該店舗のスタッフのみ表示
              const names = (a?.staffIds ?? [])
                .filter((id) => data.staff.find((s) => s.id === id)?.storeId === storeId)
                .map(nameOf);
              if (names.length === 0) return null;
              return (
                <div key={slot} style={{ fontSize: 11, marginTop: 2 }}>
                  <span className={`chip ${slot}`}>{SLOT_LABELS[slot]}</span>{' '}
                  {names.join('、')}
                </div>
              );
            })}
          </>
        )}
      />
    </section>
  );
}
