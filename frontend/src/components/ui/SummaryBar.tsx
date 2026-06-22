import type { ShiftRequest } from '../../types';
import { summarizeRequests } from './summary';

interface SummaryBarProps {
  requests: ShiftRequest[];
  staffId: string;
  dates: string[];
}

export function SummaryBar({ requests, staffId, dates }: SummaryBarProps) {
  const summary = summarizeRequests(requests, staffId, dates);

  return (
    <div className="summary">
      <div className="summary-main">
        <span className="summary-num">{summary.submitted}</span>
        <span className="summary-unit">/ {summary.total}日 提出</span>
      </div>
      <div className="summary-tags" aria-label="希望の内訳">
        <span className="chip early">早 {summary.early}</span>
        <span className="chip mid">中 {summary.mid}</span>
        <span className="chip late">遅 {summary.late}</span>
        <span className="chip off">休 {summary.off}</span>
      </div>
    </div>
  );
}

