import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { getDayRequest } from '../store/requests';
import { getMonthDates } from '../lib/date';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import type { DayRequestValue } from '../types';

const SLOT_TIME: Record<'early' | 'late', string> = {
  early: '7:00〜16:00',
  late: '15:00〜24:00',
};

const WD = ['日', '月', '火', '水', '木', '金', '土'];

function fmtDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
}

function displayValue(v: DayRequestValue): string {
  if (v === 'off') return '休み';
  if (v === 'early') return `早番 ${SLOT_TIME.early}`;
  if (v === 'late') return `遅番 ${SLOT_TIME.late}`;
  return '未入力';
}

interface RequestEditorProps { year: number; month: number; }

export function RequestEditor({ year, month }: RequestEditorProps) {
  const { me, requests, dayNotes, setDayRequest, bulkSetRequests, setDayNote } = useApp();
  const { showToast } = useToast();
  const myId = me ? String(me.id) : '';
  const dates = getMonthDates(year, month);

  const [modalDate, setModalDate] = useState<string | null>(null);
  const [attend, setAttend] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAttend, setBulkAttend] = useState(false);
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
    return v === 'early' || v === 'late';
  }).length;

  function openDay(date: string) {
    const v = myValue(date);
    setAttend(v === 'early' || v === 'late');
    setModalDate(date);
  }
  async function pick(date: string, value: DayRequestValue) {
    await setDayRequest(date, value);
    setSubmitted(false);
    setModalDate(null);
  }
  async function bulkApply(value: DayRequestValue) {
    await bulkSetRequests(dates.map((d) => ({ date: d, value })));
    setSubmitted(false);
    setBulkOpen(false);
    setBulkAttend(false);
    showToast('一括で入力しました');
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
    showToast('シフトを提出しました');
  }

  const periodLabel = dates.length
    ? `${fmtDate(dates[0])} 〜 ${fmtDate(dates[dates.length - 1])}`
    : '';

  return (
    <section className="rk-staff-submit">
      <div className="rk-staff-period">
        <span className="rk-staff-period__label">提出期間</span>
        <span className="rk-staff-period__range">{periodLabel}</span>
      </div>

      {submitted && (
        <div className="rk-staff-submit__done" role="status">
          <span aria-hidden="true">✓</span> ありがとうございます。シフトの提出が完了しました！
        </div>
      )}

      <div className="rk-staff-submit__tools">
        <button type="button" className="rk-staff-submit__bulk" onClick={() => setBulkOpen(true)}>一括入力</button>
        <button type="button" className="rk-staff-submit__clear" onClick={() => void clearAll()}>全削除</button>
      </div>

      <div className="rk-staff-submit__list">
        {dates.map((date) => {
          const v = myValue(date);
          const c = counts(date);
          return (
            <div className="rk-staff-day" key={date}>
              <button type="button" className="rk-staff-day__head" onClick={() => openDay(date)}>
                <span className="rk-staff-day__date">{fmtDate(date)}</span>
                <span className={`rk-staff-day__value${v === 'none' ? ' is-empty' : ''}`}>
                  {displayValue(v)}
                </span>
                <span className="rk-staff-day__chevron" aria-hidden="true">›</span>
              </button>
              <input
                className="rk-staff-day__memo"
                placeholder="メモがある場合は入力してください"
                value={noteFor(date)}
                onChange={(e) => setMemoDrafts((m) => ({ ...m, [date]: e.target.value }))}
                onBlur={() => void saveMemo(date)}
              />
              <div className="rk-staff-day__status">
                休み希望人数：{c.off}人・勤務希望人数：{c.work}人
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

      <Modal
        open={modalDate !== null}
        title={modalDate ? `${fmtDate(modalDate)} の希望` : ''}
        onClose={() => setModalDate(null)}
      >
        <div className="rk-attend">
          <div className="rk-attend__row">
            <button
              type="button"
              className={`rk-attend__btn${attend ? ' is-on' : ''}`}
              onClick={() => setAttend(true)}
            >
              出勤
            </button>
            <button
              type="button"
              className={`rk-attend__btn rk-attend__off${myValue(modalDate ?? '') === 'off' ? ' is-on' : ''}`}
              onClick={() => void pick(modalDate!, 'off')}
            >
              休み
            </button>
          </div>
          {attend && (
            <div className="rk-attend__slots">
              <p className="rk-attend__hint">勤務時間帯を選んでください</p>
              <button type="button" className="rk-attend__slot" onClick={() => void pick(modalDate!, 'early')}>
                <strong>早番</strong><small>{SLOT_TIME.early}</small>
              </button>
              <button type="button" className="rk-attend__slot" onClick={() => void pick(modalDate!, 'late')}>
                <strong>遅番</strong><small>{SLOT_TIME.late}</small>
              </button>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={bulkOpen} title="一括入力（期間すべてに適用）" onClose={() => { setBulkOpen(false); setBulkAttend(false); }}>
        <div className="rk-attend">
          <div className="rk-attend__row">
            <button type="button" className={`rk-attend__btn${bulkAttend ? ' is-on' : ''}`} onClick={() => setBulkAttend(true)}>出勤</button>
            <button type="button" className="rk-attend__btn rk-attend__off" onClick={() => void bulkApply('off')}>休み</button>
          </div>
          {bulkAttend && (
            <div className="rk-attend__slots">
              <p className="rk-attend__hint">勤務時間帯を選んでください</p>
              <button type="button" className="rk-attend__slot" onClick={() => void bulkApply('early')}>
                <strong>早番</strong><small>{SLOT_TIME.early}</small>
              </button>
              <button type="button" className="rk-attend__slot" onClick={() => void bulkApply('late')}>
                <strong>遅番</strong><small>{SLOT_TIME.late}</small>
              </button>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}
