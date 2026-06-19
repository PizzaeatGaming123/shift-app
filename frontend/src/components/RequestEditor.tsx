import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { getDayRequest } from '../store/requests';
import { MonthCalendar } from './MonthCalendar';
import type { DayRequestValue } from '../types';

interface RequestEditorProps {
  storeId: string;
  year: number;
  month: number;
}

const VALUE_CHIP: Record<Exclude<DayRequestValue, 'none'>, { label: string; cls: string }> = {
  early: { label: '早', cls: 'early' },
  late: { label: '遅', cls: 'late' },
  both: { label: '早遅', cls: 'early' },
  off: { label: '休', cls: 'off' },
};

export function RequestEditor({ storeId, year, month }: RequestEditorProps) {
  const { data, dispatch } = useApp();
  const storeStaff = data.staff.filter((s) => s.storeId === storeId);
  const [staffId, setStaffId] = useState(storeStaff[0]?.id ?? '');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 店舗を切り替えたときに staffId が他店のものなら先頭へ寄せる
  const validStaffId = storeStaff.some((s) => s.id === staffId) ? staffId : storeStaff[0]?.id ?? '';

  function setValue(value: DayRequestValue) {
    if (!selectedDate || !validStaffId) return;
    dispatch({ type: 'SET_DAY_REQUEST', staffId: validStaffId, date: selectedDate, value });
  }

  const current = selectedDate && validStaffId
    ? getDayRequest(data.requests, validStaffId, selectedDate)
    : 'none';

  return (
    <section>
      <label>
        あなたの名前：{' '}
        <select value={validStaffId} onChange={(e) => setStaffId(e.target.value)}>
          {storeStaff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>

      <p style={{ color: '#666', fontSize: 14 }}>
        日付をタップして、希望を選んでください（早番 7:00-16:00 / 遅番 15:00-24:00）。
      </p>

      <MonthCalendar
        year={year}
        month={month}
        onCellClick={(date) => setSelectedDate(date)}
        renderCell={(date) => {
          const v = getDayRequest(data.requests, validStaffId, date);
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
