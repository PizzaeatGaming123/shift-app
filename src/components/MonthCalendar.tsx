import type { ReactNode } from 'react';
import { getMonthDates, firstWeekdayOfMonth } from '../lib/date';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface MonthCalendarProps {
  year: number;
  month: number; // 1-12
  renderCell: (date: string, day: number) => ReactNode;
  onCellClick?: (date: string) => void;
}

export function MonthCalendar({ year, month, renderCell, onCellClick }: MonthCalendarProps) {
  const dates = getMonthDates(year, month);
  const leading = firstWeekdayOfMonth(year, month); // 1日の前に入れる空セル数

  return (
    <div className="cal-grid">
      {WEEKDAYS.map((w) => (
        <div key={w} className="cal-head">{w}</div>
      ))}
      {Array.from({ length: leading }).map((_, i) => (
        <div key={`empty-${i}`} className="cal-cell empty" />
      ))}
      {dates.map((date, idx) => {
        const day = idx + 1;
        return (
          <div
            key={date}
            className="cal-cell"
            onClick={onCellClick ? () => onCellClick(date) : undefined}
          >
            <div className="day-num">{day}</div>
            {renderCell(date, day)}
          </div>
        );
      })}
    </div>
  );
}
