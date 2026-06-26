import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { getDayRequest } from '../store/requests';
import { getMonthDates, previousMonth } from '../lib/date';
import { previousMonthByWeekday } from '../lib/previousMonthCopy';
import { api } from '../api/client';
import { useSetting } from '../lib/settings';
import {
  DEFAULT_SHIFT_PATTERNS,
  normalizeShiftPatterns,
  shiftPatternSettingKey,
} from '../lib/shiftPatterns';
import {
  collectionSettingKey,
  collectionStatusLabel,
  createDefaultCollectionSettings,
  daysUntilDeadline,
} from '../lib/collectionSettings';
import { isLockedStatus, useEffectiveShiftStatus } from '../lib/shiftStatus';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import type { DayRequestValue } from '../types';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

function fmtDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
}

/** 'HH:MM' / 'H:MM' を分に変換。'24:00' は 1440 分。不正値は null。 */
function parseHHMM(value: string): number | null {
  if (value === '24:00') return 24 * 60;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function displayValue(v: DayRequestValue, time: { start: string; end: string }): string {
  if (v === 'off') return '休み';
  if (v === 'any') return '出勤（どちらでも可）';
  if (v === 'early') return `出勤 ${time.start}〜${time.end}`;
  if (v === 'late') return `出勤 ${time.start}〜${time.end}`;
  return '未入力';
}

interface RequestEditorProps { year: number; month: number; }

export function RequestEditor({ year, month }: RequestEditorProps) {
  const { me, stores, storeId, requests, assignments, dayNotes, submitRequests, setMonth } = useApp();
  const { showToast } = useToast();
  const [storedPatterns] = useSetting(
    shiftPatternSettingKey(storeId),
    DEFAULT_SHIFT_PATTERNS,
  );
  const patterns = normalizeShiftPatterns(storedPatterns);
  const [storedCollection] = useSetting(
    collectionSettingKey(storeId),
    createDefaultCollectionSettings(`${year}-${String(month).padStart(2, '0')}`),
  );
  const collection = {
    ...createDefaultCollectionSettings(`${year}-${String(month).padStart(2, '0')}`),
    ...storedCollection,
  };
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const [shiftStatus] = useEffectiveShiftStatus(storeId, monthKey, assignments);
  const locked = isLockedStatus(shiftStatus);
  const myId = me ? String(me.id) : '';
  const dates = getMonthDates(year, month);

  const [modalDate, setModalDate] = useState<string | null>(null);
  const [attend, setAttend] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAttend, setBulkAttend] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestDrafts, setRequestDrafts] = useState<Record<string, DayRequestValue>>({});
  const [timeDrafts, setTimeDrafts] = useState<Record<string, { start: string; end: string }>>({});
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [modalStart, setModalStart] = useState('07:00');
  const [modalEnd, setModalEnd] = useState('16:00');

  useEffect(() => {
    setSubmitted(false);
    setRequestDrafts({});
    setTimeDrafts({});
    setMemoDrafts({});
  }, [year, month]);

  function myValue(date: string): DayRequestValue {
    if (requestDrafts[date] !== undefined) return requestDrafts[date];
    return getDayRequest(requests, myId, date);
  }
  function noteFor(date: string): string {
    if (memoDrafts[date] !== undefined) return memoDrafts[date];
    return dayNotes.find((n) => n.staffId === myId && n.date === date)?.text ?? '';
  }
  function timeFor(date: string): { start: string; end: string } {
    if (timeDrafts[date]) return timeDrafts[date];
    const request = requests.find((item) => item.staffId === myId && item.date === date);
    if (request?.startTime && request.endTime) {
      return { start: request.startTime, end: request.endTime };
    }
    return myValue(date) === 'late'
      ? { start: patterns.late.start, end: patterns.late.end }
      : { start: patterns.early.start, end: patterns.early.end };
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
    return v === 'early' || v === 'late' || v === 'any';
  }).length;

  function openDay(date: string) {
    // 確定済みの月は閲覧専用。日付タップでもモーダルを開かない。
    if (locked) return;
    const v = myValue(date);
    setAttend(v === 'early' || v === 'late' || v === 'any');
    const time = timeFor(date);
    setModalStart(time.start);
    setModalEnd(time.end);
    setModalDate(date);
  }
  function pick(date: string, value: DayRequestValue) {
    setRequestDrafts((drafts) => ({ ...drafts, [date]: value }));
    setSubmitted(false);
    setModalDate(null);
  }
  function bulkApply(value: DayRequestValue) {
    setRequestDrafts(Object.fromEntries(dates.map((date) => [date, value])));
    if (value === 'early' || value === 'late') {
      const time = value === 'early'
        ? { start: patterns.early.start, end: patterns.early.end }
        : { start: patterns.late.start, end: patterns.late.end };
      setTimeDrafts(Object.fromEntries(dates.map((date) => [date, time])));
    }
    setSubmitted(false);
    setBulkOpen(false);
    setBulkAttend(false);
    showToast('一括で入力しました');
  }
  function clearAll() {
    setRequestDrafts(Object.fromEntries(dates.map((date) => [date, 'none'])));
    setTimeDrafts({});
    setMemoDrafts(Object.fromEntries(dates.map((date) => [date, ''])));
    setSubmitted(false);
    showToast('すべて削除しました');
  }
  /**
   * 「先月と同じ希望」: 先月の自分の希望を曜日パターン化し、今月の同曜日全てに draft として塗る。
   *   - 提出はしない。あくまで下書きとしてセットするので、ユーザーは個別に直してから「シフトを提出」する。
   *   - api.requests は店舗全員分を返すので、自分の staffId でフィルタしてから集約する。
   *   - slot|start|end をシリアライズして previousMonthByWeekday に渡し、デシリアライズして draft へ。
   */
  async function copyPreviousMonth() {
    if (!storeId) return;
    const prev = previousMonth(`${year}-${String(month).padStart(2, '0')}`);
    try {
      const prevList = await api.requests(storeId, prev);
      const myPrev = prevList.filter((r) => String(r.staffId) === myId);
      const serialized = myPrev.map((r) => ({
        date: r.date,
        value: `${r.slot}|${r.startTime ?? ''}|${r.endTime ?? ''}`,
      }));
      const plan = previousMonthByWeekday(serialized, dates, (item) => item.value);

      const nextReq: Record<string, DayRequestValue> = {};
      const nextTime: Record<string, { start: string; end: string }> = {};
      for (const [date, value] of Object.entries(plan)) {
        if (!value) continue;
        const [slot, start, end] = value.split('|');
        // バックエンドの slot は 'early' | 'late' | 'off' | 'any' のいずれか。DayRequestValue と互換。
        if (slot === 'early' || slot === 'late' || slot === 'off' || slot === 'any') {
          nextReq[date] = slot;
          if ((slot === 'early' || slot === 'late') && start && end) {
            nextTime[date] = { start, end };
          }
        }
      }
      setRequestDrafts(nextReq);
      setTimeDrafts(nextTime);
      setSubmitted(false);
      showToast(
        Object.keys(nextReq).length > 0
          ? '先月と同じ希望をセットしました'
          : '先月の希望が見つかりませんでした',
      );
    } catch (error) {
      console.error('copyPreviousMonth failed', error);
      showToast('先月の希望を取得できませんでした');
    }
  }
  async function submit() {
    setSubmitting(true);
    try {
      await submitRequests(dates.map((date) => ({
        date,
        value: myValue(date),
        startTime: myValue(date) === 'early' || myValue(date) === 'late' ? timeFor(date).start : null,
        endTime: myValue(date) === 'early' || myValue(date) === 'late' ? timeFor(date).end : null,
        note: noteFor(date).trim(),
      })));
      setRequestDrafts({});
      setTimeDrafts({});
      setMemoDrafts({});
      setSubmitted(true);
      showToast('シフトを提出しました');
    } catch (error) {
      console.error('submitRequests failed', error);
      showToast('提出できませんでした。もう一度お試しください');
    } finally {
      setSubmitting(false);
    }
  }
  function saveWorkDay() {
    if (!modalDate) return;
    const startMinutes = parseHHMM(modalStart);
    const endMinutes = parseHHMM(modalEnd);
    if (startMinutes === null || endMinutes === null) {
      showToast('時刻は HH:MM 形式で入力してください');
      return;
    }
    if (endMinutes <= startMinutes) {
      showToast('終了時刻は開始時刻より後にしてください');
      return;
    }
    setRequestDrafts((drafts) => ({
      ...drafts,
      [modalDate]: startMinutes < 12 * 60 ? 'early' : 'late',
    }));
    setTimeDrafts((drafts) => ({
      ...drafts,
      [modalDate]: { start: modalStart, end: modalEnd },
    }));
    setSubmitted(false);
    setModalDate(null);
  }

  const periodLabel = dates.length
    ? `${fmtDate(dates[0])} 〜 ${fmtDate(dates[dates.length - 1])}`
    : '';
  const storeName = stores.find((store) => store.id === String(storeId))?.name ?? '中島店';
  const allowedYear = new Date().getFullYear();
  const canGoPrevious = year === allowedYear && month > 1;
  const canGoNext = year === allowedYear && month < 12;
  function changeMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    if (next.getFullYear() !== allowedYear) return;
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }
  function periodCard(delta: number) {
    const value = new Date(year, month - 1 + delta, 1);
    const last = new Date(value.getFullYear(), value.getMonth() + 1, 0);
    return {
      key: `${value.getFullYear()}-${value.getMonth() + 1}`,
      short: `${value.getMonth() + 1}/1〜`,
      end: `${value.getMonth() + 1}/${last.getDate()}`,
      inRange: value.getFullYear() === allowedYear,
    };
  }
  const periods = [-1, 0, 1].map(periodCard);

  return (
    <section className="rk-staff-submit">
      <div className="rk-staff-period-picker">
        <p className="rk-staff-period-picker__lead">提出したいシフト期間を選択してください</p>
        <div className="rk-staff-period-picker__carousel">
          <button type="button" className="rk-period-arrow" onClick={() => changeMonth(-1)} aria-label="前の提出期間" disabled={!canGoPrevious}>‹</button>
          {periods.map((period, index) => (
            <button
              type="button"
              key={period.key}
              className={`rk-period-card${index === 1 ? ' is-selected' : ''}${!period.inRange ? ' is-disabled' : ''}`}
              onClick={() => changeMonth(index - 1)}
              disabled={!period.inRange}
              aria-current={index === 1 ? 'date' : undefined}
            >
              <strong>{period.short}</strong>
              <small>{period.end}まで</small>
              {index === 1 && <span>選択中</span>}
            </button>
          ))}
          <button type="button" className="rk-period-arrow" onClick={() => changeMonth(1)} aria-label="次の提出期間" disabled={!canGoNext}>›</button>
        </div>
        <div className="rk-staff-period-picker__detail">
          <strong>{periodLabel}</strong>
          <span>提出先店舗：{storeName}</span>
        </div>
        <div className="rk-staff-period-picker__status">
          <button type="button">シフト提出方法が不明な場合</button>
          <span>
            {collectionStatusLabel(collection.status)}
            {collection.status === 'OPEN' && `・期限まで${daysUntilDeadline(collection.deadlineAt)}日`}
          </span>
        </div>
      </div>

      {submitted && (
        <div className="rk-staff-submit__done" role="status">
          <span aria-hidden="true">✓</span> ありがとうございます。シフトの提出が完了しました！
        </div>
      )}

      {locked && (
        <div className="rk-staff-submit__locked" role="status">
          <strong>このシフトは確定済みです。変更できません。</strong>
          <span>変更を希望する場合は店長へご相談ください。</span>
        </div>
      )}

      <div className="rk-staff-submit__tools" aria-disabled={locked}>
        <button type="button" className="rk-staff-submit__bulk" disabled={locked} onClick={() => setBulkOpen(true)}>一括入力</button>
        <div className="rk-staff-submit__subtools">
          <button type="button" className="rk-staff-submit__history" disabled={locked} onClick={() => void copyPreviousMonth()}>先月と同じ希望</button>
          <button type="button" className="rk-staff-submit__clear" disabled={locked} onClick={clearAll}>全削除</button>
        </div>
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
                  {displayValue(v, timeFor(date))}
                </span>
                <span className="rk-staff-day__chevron" aria-hidden="true">›</span>
              </button>
              <input
                className="rk-staff-day__memo"
                placeholder="メモがある場合は入力してください"
                value={noteFor(date)}
                onChange={(e) => setMemoDrafts((m) => ({ ...m, [date]: e.target.value }))}
                maxLength={200}
              />
              <div className="rk-staff-day__status">
                <span>休み希望人数：{c.off}人・勤務希望人数：{c.work}人</span>
                <span aria-hidden="true">›</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rk-staff-submit__bar">
        <span className="rk-staff-submit__count">
          出勤日数：{workDays}日
          <small>
            {locked
              ? '確定済み・変更不可'
              : submitted ? '提出済みです' : '未提出のシフト期間です'}
          </small>
        </span>
        <button
          type="button"
          className="rk-staff-submit__go"
          onClick={() => void submit()}
          disabled={submitting || locked}
        >
          {locked ? '確定済み（変更不可）' : submitting ? '提出中...' : 'シフトを提出'}
        </button>
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
              onClick={() => pick(modalDate!, 'off')}
            >
              休み
            </button>
          </div>
          {attend && (
            <div className="rk-attend__slots">
              <p className="rk-attend__hint">勤務時間を入力してください</p>
              <div className="rk-attend__time-row">
                <label>
                  開始
                  <input type="time" value={modalStart} onChange={(event) => setModalStart(event.target.value)} />
                </label>
                <span aria-hidden="true">〜</span>
                <label>
                  終了
                  <input
                    type="time"
                    value={modalEnd === '24:00' ? '23:59' : modalEnd}
                    onChange={(event) => setModalEnd(event.target.value)}
                  />
                </label>
              </div>
              <p className="rk-attend__hint">シフトパターンから入力</p>
              <button type="button" className="rk-attend__slot" onClick={() => { setModalStart(patterns.early.start); setModalEnd(patterns.early.end); }}>
                <strong>{patterns.early.label}</strong><small>{patterns.early.start}〜{patterns.early.end}</small>
              </button>
              <button type="button" className="rk-attend__slot" onClick={() => { setModalStart(patterns.late.start); setModalEnd(patterns.late.end); }}>
                <strong>{patterns.late.label}</strong><small>{patterns.late.start}〜{patterns.late.end}</small>
              </button>
              <button
                type="button"
                className={`rk-attend__slot rk-attend__any${myValue(modalDate ?? '') === 'any' ? ' is-on' : ''}`}
                onClick={() => pick(modalDate!, 'any')}
              >
                <strong>どちらでも可</strong>
                <small>早番でも遅番でもOK</small>
              </button>
              <button type="button" className="rk-attend__save" onClick={saveWorkDay}>保存</button>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={bulkOpen} title="一括入力（期間すべてに適用）" onClose={() => { setBulkOpen(false); setBulkAttend(false); }}>
        <div className="rk-attend">
          <div className="rk-attend__row">
            <button type="button" className={`rk-attend__btn${bulkAttend ? ' is-on' : ''}`} onClick={() => setBulkAttend(true)}>出勤</button>
            <button type="button" className="rk-attend__btn rk-attend__off" onClick={() => bulkApply('off')}>休み</button>
          </div>
          {bulkAttend && (
            <div className="rk-attend__slots">
              <p className="rk-attend__hint">勤務時間帯を選んでください</p>
              <button type="button" className="rk-attend__slot" onClick={() => bulkApply('early')}>
                <strong>{patterns.early.label}</strong><small>{patterns.early.start}〜{patterns.early.end}</small>
              </button>
              <button type="button" className="rk-attend__slot" onClick={() => bulkApply('late')}>
                <strong>{patterns.late.label}</strong><small>{patterns.late.start}〜{patterns.late.end}</small>
              </button>
              <button type="button" className="rk-attend__slot rk-attend__any" onClick={() => bulkApply('any')}>
                <strong>どちらでも可</strong><small>早番でも遅番でもOK</small>
              </button>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}
