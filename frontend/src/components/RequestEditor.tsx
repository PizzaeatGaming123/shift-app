import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { getDayRequest } from '../store/requests';
import { getMonthDates } from '../lib/date';
import { MonthCalendar } from './MonthCalendar';
import { BottomSheet } from './ui/BottomSheet';
import { SummaryBar } from './ui/SummaryBar';
import { useToast } from './ui/Toast';
import type { DayRequestValue } from '../types';

const VALUE_CHIP: Record<Exclude<DayRequestValue, 'none'>, { label: string; cls: string }> = {
  early: { label: '早番', cls: 'early' },
  late: { label: '遅番', cls: 'late' },
  both: { label: '早番+遅番', cls: 'early' },
  off: { label: '休み', cls: 'off' },
};

interface RequestEditorProps { year: number; month: number; }

export function RequestEditor({ year, month }: RequestEditorProps) {
  const { me, requests, setDayRequest } = useApp();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const myStaffId = me ? String(me.id) : '';
  const dates = getMonthDates(year, month);

  async function setValue(value: DayRequestValue) {
    if (!selectedDate) return;
    await setDayRequest(selectedDate, value);
    showToast('保存しました ✓');
    setSelectedDate(null);
  }

  const current = selectedDate ? getDayRequest(requests, myStaffId, selectedDate) : 'none';

  return (
    <section className="request-editor">
      <SummaryBar requests={requests} staffId={myStaffId} dates={dates} />
      <p className="hint">日付をタップして希望を選んでください（早番 7:00-16:00 / 遅番 15:00-24:00）。</p>
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
      <BottomSheet
        open={selectedDate !== null}
        title={selectedDate ? `${selectedDate} の希望` : '希望を選択'}
        onClose={() => setSelectedDate(null)}
      >
        <div className="sheet-actions">
          <button type="button" className={`pick ${current === 'early' ? 'sel-early' : ''}`} onClick={() => void setValue('early')}>🌅 早番</button>
          <button type="button" className={`pick ${current === 'late' ? 'sel-late' : ''}`} onClick={() => void setValue('late')}>🌙 遅番</button>
          <button type="button" className={`pick ${current === 'both' ? 'sel-early' : ''}`} onClick={() => void setValue('both')}>早番+遅番</button>
          <button type="button" className={`pick ${current === 'off' ? 'sel-off' : ''}`} onClick={() => void setValue('off')}>😴 休み</button>
          <button type="button" className="pick clear" onClick={() => void setValue('none')}>クリア</button>
        </div>
      </BottomSheet>
    </section>
  );
}
