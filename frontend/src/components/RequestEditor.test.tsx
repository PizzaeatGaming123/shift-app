import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestEditor } from './RequestEditor';

const mocks = vi.hoisted(() => ({
  submitRequests: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../store/AppContext', () => ({
  useApp: () => ({
    me: { id: 2, name: '田中太郎', role: 'STAFF', storeId: 1 },
    stores: [{ id: '1', name: '中島店' }],
    storeId: 1,
    requests: [{ staffId: '2', date: '2026-07-01', slot: 'early' }],
    dayNotes: [],
    submitRequests: mocks.submitRequests,
    setMonth: vi.fn(),
  }),
}));

vi.mock('./ui/Toast', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

describe('RequestEditor', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.submitRequests.mockReset().mockResolvedValue(undefined);
    mocks.showToast.mockReset();
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
});
