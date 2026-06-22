import type { ReactNode } from 'react';
import { getMonthDates, firstWeekdayOfMonth } from '../lib/date';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface MonthCalendarProps {
  year: number;
  month: number;
  renderCell: (date: string, day: number) => ReactNode;
  onCellClick?: (date: string) => void;
}

export function MonthCalendar({ year, month, renderCell, onCellClick }: MonthCalendarProps) {
  const dates = getMonthDates(year, month);
  const leading = firstWeekdayOfMonth(year, month);

  return (
    <div className="cal-grid">
      {WEEKDAYS.map((weekday) => (
        <div key={weekday} className="cal-head">{weekday}</div>
      ))}
      {Array.from({ length: leading }).map((_, index) => (
        <div key={`empty-${index}`} className="cal-cell empty" />
      ))}
      {dates.map((date, index) => {
        const day = index + 1;
        const content = (
          <>
            <div className="day-num">{day}</div>
            {renderCell(date, day)}
          </>
        );

        return onCellClick ? (
          <button
            key={date}
            type="button"
            className="cal-cell"
            aria-label={`${date}を選択`}
            onClick={() => onCellClick(date)}
          >
            {content}
          </button>
        ) : (
          <div key={date} className="cal-cell">
            {content}
          </div>
        );
      })}
    </div>
  );
}
