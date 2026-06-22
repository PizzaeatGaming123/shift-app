import { useEffect, useState } from 'react';
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
  mid: { label: '中番', cls: 'mid' },
  late: { label: '遅番', cls: 'late' },
  off: { label: '休み', cls: 'off' },
};

const PICKS: { value: DayRequestValue; label: string; sel: string }[] = [
  { value: 'early', label: '早番', sel: 'sel-early' },
  { value: 'mid', label: '中番', sel: 'sel-mid' },
  { value: 'late', label: '遅番', sel: 'sel-late' },
  { value: 'off', label: '休み', sel: 'sel-off' },
];

interface RequestEditorProps { year: number; month: number; }

export function RequestEditor({ year, month }: RequestEditorProps) {
  const { me, requests, dayNotes, setDayRequest, setDayNote } = useApp();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pick, setPick] = useState<DayRequestValue>('none');
  const [memo, setMemo] = useState('');
  const myStaffId = me ? String(me.id) : '';
  const dates = getMonthDates(year, month);

  // シートを開いたら現在の希望・メモを初期値にする
  useEffect(() => {
    if (!selectedDate) return;
    setPick(getDayRequest(requests, myStaffId, selectedDate));
    const note = dayNotes.find((n) => n.staffId === myStaffId && n.date === selectedDate);
    setMemo(note?.text ?? '');
  }, [selectedDate, requests, dayNotes, myStaffId]);

  async function save() {
    if (!selectedDate) return;
    await setDayRequest(selectedDate, pick);
    await setDayNote(selectedDate, memo.trim());
    showToast('保存しました ✓');
    setSelectedDate(null);
  }

  return (
    <section className="request-editor">
      <SummaryBar requests={requests} staffId={myStaffId} dates={dates} />
      <p className="hint">日付をタップして希望を選んでください（早番 7:00-16:00 / 中番 11:00-20:00 / 遅番 15:00-24:00）。ひとことメモも添えられます。</p>
      <MonthCalendar
        year={year}
        month={month}
        onCellClick={(date) => setSelectedDate(date)}
        renderCell={(date) => {
          const v = getDayRequest(requests, myStaffId, date);
          const note = dayNotes.find((n) => n.staffId === myStaffId && n.date === date);
          if (v === 'none' && !note) return null;
          const chip = v === 'none' ? null : VALUE_CHIP[v];
          return (
            <>
              {chip && <span className={`chip ${chip.cls}`}>{chip.label}</span>}
              {note && <span className="cell-memo" title={note.text}>{note.text}</span>}
            </>
          );
        }}
      />
      <BottomSheet
        open={selectedDate !== null}
        title={selectedDate ? `${selectedDate} の希望` : '希望を選択'}
        onClose={() => setSelectedDate(null)}
      >
        <div className="sheet-actions">
          {PICKS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`pick ${pick === p.value ? p.sel : ''}`}
              aria-pressed={pick === p.value}
              onClick={() => setPick(p.value)}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className={`pick clear ${pick === 'none' ? 'sel-off' : ''}`}
            aria-pressed={pick === 'none'}
            onClick={() => setPick('none')}
          >
            希望なし
          </button>
        </div>
        <label className="memo-field">
          <span>ひとこと（任意）</span>
          <textarea
            value={memo}
            maxLength={200}
            rows={2}
            placeholder="例：この日は変わってくれませんか？"
            onChange={(e) => setMemo(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-primary btn-block" onClick={() => void save()}>
          保存する
        </button>
      </BottomSheet>
    </section>
  );
}
