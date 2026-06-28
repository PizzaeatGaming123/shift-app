import { describe, it, expect } from 'vitest';
import { previousMonthByWeekday } from './previousMonthCopy';

type Item = { date: string; value: string };

describe('previousMonthByWeekday', () => {
  it('同曜日の最頻値を翌月の同曜日全てに適用', () => {
    // 2026-05 月曜: 5/4, 5/11, 5/18, 5/25 → early 3 / off 1 → mode = early
    const prev: Item[] = [
      { date: '2026-05-04', value: 'early' },
      { date: '2026-05-11', value: 'early' },
      { date: '2026-05-18', value: 'early' },
      { date: '2026-05-25', value: 'off' },
    ];
    // 2026-06 の月曜: 6/1, 6/8, 6/15, 6/22, 6/29
    const targetDates = ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29'];
    const result = previousMonthByWeekday(prev, targetDates, (item) => item.value);
    expect(result).toEqual({
      '2026-06-01': 'early',
      '2026-06-08': 'early',
      '2026-06-15': 'early',
      '2026-06-22': 'early',
      '2026-06-29': 'early',
    });
  });

  it('同数のときは最新日付の値', () => {
    // 月曜: 5/4 early, 5/11 late → 1 vs 1 → 最新は 5/11 の late
    const prev: Item[] = [
      { date: '2026-05-04', value: 'early' },
      { date: '2026-05-11', value: 'late' },
    ];
    const result = previousMonthByWeekday(prev, ['2026-06-01'], (item) => item.value);
    expect(result['2026-06-01']).toBe('late');
  });

  it('該当曜日のデータがない target は undefined', () => {
    const result = previousMonthByWeekday<Item>([], ['2026-06-01'], (item) => item.value);
    expect(result['2026-06-01']).toBeUndefined();
  });

  it('getValue が null を返す要素は無視する', () => {
    const prev: Item[] = [
      { date: '2026-05-04', value: 'early' },
      { date: '2026-05-11', value: '' },
    ];
    const result = previousMonthByWeekday(
      prev,
      ['2026-06-01'],
      (item) => (item.value === '' ? null : item.value),
    );
    expect(result['2026-06-01']).toBe('early');
  });

  it('曜日が混ざっていても曜日ごとに別々に集計する', () => {
    // 月曜: early を 2 回、火曜: late を 1 回
    const prev: Item[] = [
      { date: '2026-05-04', value: 'early' }, // Mon
      { date: '2026-05-11', value: 'early' }, // Mon
      { date: '2026-05-05', value: 'late' },  // Tue
    ];
    const result = previousMonthByWeekday(
      prev,
      ['2026-06-01', '2026-06-02'], // Mon, Tue
      (item) => item.value,
    );
    expect(result['2026-06-01']).toBe('early');
    expect(result['2026-06-02']).toBe('late');
  });
});
