import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ShiftTableSummaryRows } from './ShiftTableSummaryRows';

it('資料と同じ順序で集計行を表示する', () => {
  render(
    <table>
      <tbody>
        <ShiftTableSummaryRows
          dates={['2026-07-01']}
          assignments={[]}
          staff={[]}
          salesTarget={90000}
          storeNotes={[]}
          positionNotes={{}}
          visibleItems={[
            'workHours',
            'modelShift',
            'storeNote',
            'positionNote',
          ]}
          requiredByBand={() => ({ early: 2, late: 2 })}
          onStoreNoteChange={() => {}}
          onPositionNoteChange={() => {}}
        />
      </tbody>
    </table>,
  );

  expect(
    screen.getAllByRole('rowheader').map((cell) => cell.textContent),
  ).toEqual([
    '総労働時間',
    '全体モデルシフト',
    '早番 7:00〜16:00',
    '遅番 15:00〜24:00',
    '店舗メモ',
    'ポジションメモ',
  ]);
});

it('非表示にした集計項目は描画しない', () => {
  render(
    <table>
      <tbody>
        <ShiftTableSummaryRows
          dates={['2026-07-01']}
          assignments={[]}
          staff={[]}
          salesTarget={90000}
          storeNotes={[]}
          positionNotes={{}}
          visibleItems={['workHours']}
          requiredByBand={() => ({ early: 2, late: 2 })}
          onStoreNoteChange={() => {}}
          onPositionNoteChange={() => {}}
        />
      </tbody>
    </table>,
  );

  expect(screen.getByText('総労働時間')).toBeInTheDocument();
  expect(screen.queryByText('全体モデルシフト')).not.toBeInTheDocument();
  expect(screen.queryByText('店舗メモ')).not.toBeInTheDocument();
});
