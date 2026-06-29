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

    // 2500ms 表示 + 180ms 退場アニメで unmount される
    act(() => {
      vi.advanceTimersByTime(2700);
    });

    expect(screen.queryByText('保存しました ✓')).not.toBeInTheDocument();
  });
});
