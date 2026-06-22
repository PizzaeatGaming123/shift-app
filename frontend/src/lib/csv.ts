import type { Staff, Assignment } from '../types';
import { WORK_SLOTS, SLOT_LABELS } from '../constants';
import { isAssigned } from '../store/assignments';

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** スタッフ×日付の割り当てシフトをCSV文字列にする（割り当てがある区分のラベルを出力） */
export function buildScheduleCsv(staff: Staff[], dates: string[], assignments: Assignment[]): string {
  const header = ['スタッフ', ...dates.map((d) => d.slice(5))];
  const rows = staff.map((person) => {
    const cells = dates.map((date) => {
      const slot = WORK_SLOTS.find((s) => isAssigned(assignments, date, s, person.id));
      return slot ? SLOT_LABELS[slot] : '';
    });
    return [person.name, ...cells];
  });
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

/** CSV文字列をBOM付きでダウンロードさせる（Excelの文字化け対策） */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
