import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestEditor } from './RequestEditor';

const mocks = vi.hoisted(() => ({
  submitRequests: vi.fn(),
  showToast: vi.fn(),
  setMonth: vi.fn(),
  apiRequests: vi.fn(),
}));

vi.mock('../store/AppContext', () => ({
  useApp: () => ({
    me: { id: 2, name: '田中太郎', role: 'STAFF', storeId: 1 },
    stores: [{ id: '1', name: '中島店' }],
    staff: [{ id: '2', name: '田中太郎', storeId: '1', employmentType: '正社員', role: 'STAFF', hourlyWage: null, monthlyHourLimit: null }],
    storeId: 1,
    requests: [{ staffId: '2', date: '2026-07-01', slot: 'early' }],
    assignments: [],
    dayNotes: [],
    shiftPlanStatus: 'DRAFT',
    setShiftPlanStatus: vi.fn(),
    submitRequests: mocks.submitRequests,
    setMonth: mocks.setMonth,
  }),
}));

vi.mock('../api/client', () => ({
  api: {
    requests: mocks.apiRequests,
  },
}));

vi.mock('./ui/Toast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

describe('RequestEditor', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.submitRequests.mockReset().mockResolvedValue(undefined);
    mocks.showToast.mockReset();
    mocks.setMonth.mockReset();
    mocks.apiRequests.mockReset().mockResolvedValue([]);
  });

  it('keeps submission available when a legacy browser setting says collection is closed', () => {
    localStorage.setItem('akiyume-collect:1', JSON.stringify({
      targetMonth: '2026-07',
      status: 'CLOSED',
    }));
    render(<RequestEditor year={2026} month={7} />);

    expect(screen.getByRole('button', { name: 'シフトを提出' })).toBeEnabled();
    expect(screen.getByText('受付終了')).toBeInTheDocument();
  });

  it('keeps edits local and saves the whole period when submitted', async () => {
    render(<RequestEditor year={2026} month={7} />);

    expect(mocks.submitRequests).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'シフトを提出' }));

    await waitFor(() => expect(mocks.submitRequests).toHaveBeenCalledTimes(1));
    const entries = mocks.submitRequests.mock.calls[0][0];
    expect(entries).toHaveLength(31);
    expect(entries[0]).toEqual({
      date: '2026-07-01',
      value: 'early',
      startTime: '07:00',
      endTime: '16:00',
      note: '',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('シフトの提出が完了しました');
  });

  it('does not save a changed day until the final submit button is pressed', async () => {
    render(<RequestEditor year={2026} month={7} />);

    fireEvent.click(screen.getByRole('button', { name: /7\/2\(木\)/ }));
    fireEvent.click(screen.getByRole('button', { name: '休み' }));
    expect(mocks.submitRequests).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'シフトを提出' }));
    await waitFor(() => expect(mocks.submitRequests).toHaveBeenCalledTimes(1));
    expect(mocks.submitRequests.mock.calls[0][0][1]).toMatchObject({
      date: '2026-07-02',
      value: 'off',
    });
  });

  it('「先月と同じ希望」ボタンを押すと先月の曜日パターンが draft にセットされる', async () => {
    // 先月 (2026-06) の月曜: 6/1, 6/8, 6/15, 6/22, 6/29 で early (09:00-13:00)
    mocks.apiRequests.mockResolvedValue([
      { staffId: 2, date: '2026-06-01', slot: 'early', startTime: '09:00', endTime: '13:00' },
      { staffId: 2, date: '2026-06-08', slot: 'early', startTime: '09:00', endTime: '13:00' },
      { staffId: 2, date: '2026-06-15', slot: 'early', startTime: '09:00', endTime: '13:00' },
      // 別スタッフの分はフィルタで除外されることを確認
      { staffId: 9, date: '2026-06-02', slot: 'off' },
    ]);
    render(<RequestEditor year={2026} month={7} />);

    fireEvent.click(screen.getByRole('button', { name: /先月と同じ希望/ }));

    await waitFor(() => expect(mocks.apiRequests).toHaveBeenCalledWith(1, '2026-06'));
    // 7月の月曜の draft: 7/6 (Mon) → early 09:00〜13:00
    await waitFor(() => {
      const monday = screen.getByRole('button', { name: /7\/6\(月\)/ });
      expect(monday.textContent).toMatch(/出勤 09:00〜13:00/);
    });
    expect(mocks.showToast).toHaveBeenCalledWith(expect.stringContaining('先月と同じ'));
  });

  it('旧ボタンラベル「提出履歴から自動入力」は無く、新ラベルが出る', () => {
    render(<RequestEditor year={2026} month={7} />);
    expect(screen.queryByRole('button', { name: '提出履歴から自動入力' })).toBeNull();
    expect(screen.getByRole('button', { name: '先月と同じ希望' })).toBeInTheDocument();
  });

  it('staff month navigation stays within the current year', () => {
    const allowedYear = new Date().getFullYear();
    const { rerender } = render(<RequestEditor year={allowedYear} month={1} />);

    const previous = screen.getByRole('button', { name: '前の提出期間' });
    expect(previous).toBeDisabled();
    fireEvent.click(previous);
    expect(mocks.setMonth).not.toHaveBeenCalled();

    rerender(<RequestEditor year={allowedYear} month={12} />);
    const next = screen.getByRole('button', { name: '次の提出期間' });
    expect(next).toBeDisabled();
    fireEvent.click(next);
    expect(mocks.setMonth).not.toHaveBeenCalled();
  });
});
