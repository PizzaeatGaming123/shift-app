import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function Trigger() {
  const { showToast } = useToast();
  return <button onClick={() => showToast('保存しました ✓')}>save</button>;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Toast', () => {
  it('shows a message then auto-dismisses', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText('save').click();
    });

    expect(screen.getByText('保存しました ✓')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.queryByText('保存しました ✓')).not.toBeInTheDocument();
  });
});
