import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MonthCalendar } from './MonthCalendar';

describe('MonthCalendar', () => {
  it('renders interactive dates as accessible buttons', () => {
    const onCellClick = vi.fn();
    render(
      <MonthCalendar
        year={2026}
        month={7}
        onCellClick={onCellClick}
        renderCell={() => null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-07-01を選択' }));
    expect(onCellClick).toHaveBeenCalledWith('2026-07-01');
  });
});
