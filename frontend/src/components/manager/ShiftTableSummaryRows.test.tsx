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
            'sales',
            'salesPerHour',
            'workHours',
            'laborCost',
            'modelShift',
            'rankTotal',
            'storeNote',
            'positionNote',
          ]}
          requiredByBand={{ morning: 2, afternoon: 2, night: 2 }}
          onStoreNoteChange={() => {}}
          onPositionNoteChange={() => {}}
        />
      </tbody>
    </table>,
  );

  expect(
    screen.getAllByRole('rowheader').map((cell) => cell.textContent),
  ).toEqual([
    '売上計画',
    '人時売上高',
    '総労働時間',
    '人件費',
    '全体モデルシフト',
    '09:00 - 14:00',
    '14:00 - 19:00',
    '19:00 - 23:00',
    'ランク計',
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
          visibleItems={['sales', 'workHours']}
          requiredByBand={{ morning: 2, afternoon: 2, night: 2 }}
          onStoreNoteChange={() => {}}
          onPositionNoteChange={() => {}}
        />
      </tbody>
    </table>,
  );

  expect(screen.getByText('売上計画')).toBeInTheDocument();
  expect(screen.getByText('総労働時間')).toBeInTheDocument();
  expect(screen.queryByText('人件費')).not.toBeInTheDocument();
  expect(screen.queryByText('全体モデルシフト')).not.toBeInTheDocument();
});
