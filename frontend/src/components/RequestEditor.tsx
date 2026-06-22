import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { getDayRequest } from '../store/requests';
import { MonthCalendar } from './MonthCalendar';
import type { DayRequestValue } from '../types';

const VALUE_CHIP: Record<Exclude<DayRequestValue, 'none'>, { label: string; cls: string }> = {
  early: { label: '早', cls: 'early' },
  late: { label: '遅', cls: 'late' },
  both: { label: '早遅', cls: 'early' },
  off: { label: '休', cls: 'off' },
};

interface RequestEditorProps {
  year: number;
  month: number;
}

export function RequestEditor({ year, month }: RequestEditorProps) {
  const { me, requests, setDayRequest } = useApp();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const myStaffId = me ? String(me.id) : '';

  function setValue(value: DayRequestValue) {
    if (!selectedDate) return;
    void setDayRequest(selectedDate, value);
  }

  const current = selectedDate ? getDayRequest(requests, myStaffId, selectedDate) : 'none';

  return (
    <section>
      <p style={{ color: '#666', fontSize: 14 }}>
        日付をタップして希望を選んでください（早番 7:00-16:00 / 遅番 15:00-24:00）。
      </p>
      <MonthCalendar
        year={year}
        month={month}
        onCellClick={(date) => setSelectedDate(date)}
        renderCell={(date) => {
          const v = getDayRequest(requests, myStaffId, date);
          if (v === 'none') return null;
          const chip = VALUE_CHIP[v];
          return <span className={`chip ${chip.cls}`}>{chip.label}</span>;
        }}
      />
      {selectedDate && (
        <div className="picker">
          <strong style={{ alignSelf: 'center' }}>{selectedDate}：</strong>
          <button className={current === 'early' ? 'sel-early' : ''} onClick={() => setValue('early')}>早番</button>
          <button className={current === 'late' ? 'sel-late' : ''} onClick={() => setValue('late')}>遅番</button>
          <button className={current === 'both' ? 'sel-early' : ''} onClick={() => setValue('both')}>早番+遅番</button>
          <button className={current === 'off' ? 'sel-off' : ''} onClick={() => setValue('off')}>休み希望</button>
          <button onClick={() => setValue('none')}>クリア</button>
        </div>
      )}
    </section>
  );
}
