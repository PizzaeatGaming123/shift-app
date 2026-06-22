import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';

describe('BottomSheet', () => {
  it('does not render while closed', () => {
    render(
      <BottomSheet open={false} title="希望を選択" onClose={() => undefined}>
        内容
      </BottomSheet>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with Escape and backdrop click', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open title="希望を選択" onClose={onClose}>
        内容
      </BottomSheet>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByLabelText('希望選択を閉じる'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

