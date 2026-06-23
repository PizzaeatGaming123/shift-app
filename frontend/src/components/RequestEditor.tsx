import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { getDayRequest } from '../store/requests';
import { getMonthDates } from '../lib/date';
import { BottomSheet } from './ui/BottomSheet';
import { useToast } from './ui/Toast';
import type { DayRequestValue } from '../types';

const SLOT_TIME: Record<'early' | 'mid' | 'late', string> = {
  early: '7:00〜16:00',
  mid: '11:00〜20:00',
  late: '15:00〜24:00',
};

const PICKS: { value: DayRequestValue; label: string; sub: string; cls: string }[] = [
  { value: 'early', label: '早番', sub: '7:00〜16:00', cls: 'early' },
  { value: 'mid', label: '中番', sub: '11:00〜20:00', cls: 'mid' },
  { value: 'late', label: '遅番', sub: '15:00〜24:00', cls: 'late' },
  { value: 'off', label: '休み', sub: '休み希望', cls: 'off' },
  { value: 'none', label: '未入力', sub: 'クリア', cls: 'clear' },
];

const WD = ['日', '月', '火', '水', '木', '金', '土'];

function fmtDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
}

interface RequestEditorProps { year: number; month: number; }

export function RequestEditor({ year, month }: RequestEditorProps) {
  const { me, requests, dayNotes, setDayRequest, bulkSetRequests, setDayNote } = useApp();
  const { showToast } = useToast();
  const myId = me ? String(me.id) : '';
  const dates = getMonthDates(year, month);

  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});

  useEffect(() => { setSubmitted(false); }, [year, month]);

  function myValue(date: string): DayRequestValue {
    return getDayRequest(requests, myId, date);
  }
  function noteFor(date: string): string {
    if (memoDrafts[date] !== undefined) return memoDrafts[date];
    return dayNotes.find((n) => n.staffId === myId && n.date === date)?.text ?? '';
  }
  function counts(date: string): { off: number; work: number } {
    const off = new Set<string>();
    const work = new Set<string>();
    for (const r of requests) {
      if (r.date !== date) continue;
      if (r.slot === 'off') off.add(r.staffId);
      else work.add(r.staffId);
    }
    return { off: off.size, work: work.size };
  }
  const workDays = dates.filter((d) => {
    const v = myValue(d);
    return v === 'early' || v === 'mid' || v === 'late';
  }).length;

  async function pick(date: string, value: DayRequestValue) {
    await setDayRequest(date, value);
    setSubmitted(false);
    setSheetDate(null);
  }
  async function bulkApply(value: DayRequestValue) {
    await bulkSetRequests(dates.map((d) => ({ date: d, value })));
    setSubmitted(false);
    setBulkOpen(false);
    showToast('一括で入力しました ✓');
  }
  async function clearAll() {
    await bulkSetRequests(
      dates.filter((d) => myValue(d) !== 'none').map((d) => ({ date: d, value: 'none' as const })),
    );
    setSubmitted(false);
    showToast('すべて削除しました');
  }
  async function saveMemo(date: string) {
    const text = (memoDrafts[date] ?? '').trim();
    await setDayNote(date, text);
    setMemoDrafts((m) => {
      const next = { ...m };
      delete next[date];
      return next;
    });
  }
  function submit() {
    setSubmitted(true);
    showToast('シフトを提出しました ✓');
  }

  return (
    <section className="rk-staff-submit">
      {submitted && (
        <div className="rk-staff-submit__done" role="status">
          <span aria-hidden="true">✓</span> ありがとうございます。シフトの提出が完了しました！
        </div>
      )}

      <button type="button" className="rk-staff-submit__bulk" onClick={() => setBulkOpen(true)}>
        📅 一括入力
      </button>
      <div className="rk-staff-submit__tools">
        <button type="button" className="rk-staff-submit__auto" disabled>提出履歴から自動入力</button>
        <button type="button" className="rk-staff-submit__clear" onClick={() => void clearAll()}>全削除</button>
      </div>

      <div className="rk-staff-submit__list">
        {dates.map((date) => {
          const v = myValue(date);
          const c = counts(date);
          const display = v === 'none' ? '未入力' : v === 'off' ? '休み' : SLOT_TIME[v];
          return (
            <div className="rk-staff-day" key={date}>
              <div className="rk-staff-day__head">
                <span className="rk-staff-day__date">{fmtDate(date)}</span>
                <button
                  type="button"
                  className={`rk-staff-day__slot is-${v === 'none' ? 'empty' : v}`}
                  onClick={() => setSheetDate(date)}
                >
                  {display}
                </button>
                {v !== 'none' && (
                  <button type="button" className="rk-staff-day__del" onClick={() => void pick(date, 'none')}>
                    削除
                  </button>
                )}
              </div>
              <input
                className="rk-staff-day__memo"
                placeholder="メモがある場合は入力してください"
                value={noteFor(date)}
                onChange={(e) => setMemoDrafts((m) => ({ ...m, [date]: e.target.value }))}
                onBlur={() => void saveMemo(date)}
              />
              <div className="rk-staff-day__status">
                休み希望人数：{c.off}人・勤務希望人数：{c.work}人 ›
              </div>
            </div>
          );
        })}
      </div>

      <div className="rk-staff-submit__bar">
        <span className="rk-staff-submit__count">
          出勤日数：{workDays}日
          <small>{submitted ? '提出済みです' : '未提出のシフト期間です'}</small>
        </span>
        <button type="button" className="rk-staff-submit__go" onClick={submit}>シフトを提出</button>
      </div>

      <BottomSheet
        open={sheetDate !== null}
        title={sheetDate ? `${fmtDate(sheetDate)} の希望` : ''}
        onClose={() => setSheetDate(null)}
      >
        <div className="rk-pick-grid">
          {PICKS.map((p) => (
            <button key={p.value} type="button" className={`rk-pick is-${p.cls}`} onClick={() => void pick(sheetDate!, p.value)}>
              <strong>{p.label}</strong><small>{p.sub}</small>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={bulkOpen} title="一括入力（期間すべてに適用）" onClose={() => setBulkOpen(false)}>
        <div className="rk-pick-grid">
          {PICKS.map((p) => (
            <button key={p.value} type="button" className={`rk-pick is-${p.cls}`} onClick={() => void bulkApply(p.value)}>
              <strong>{p.label}</strong><small>{p.sub}</small>
            </button>
          ))}
        </div>
      </BottomSheet>
    </section>
  );
}
