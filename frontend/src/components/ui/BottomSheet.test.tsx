import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { BottomSheet } from './BottomSheet';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>希望を開く</button>
      <BottomSheet open={open} title="希望を選択" onClose={() => setOpen(false)}>
        <button type="button">早番</button>
        <button type="button">遅番</button>
      </BottomSheet>
    </>
  );
}

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

  it('moves focus inside, traps Tab, and restores focus when closed', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: '希望を開く' });

    trigger.focus();
    fireEvent.click(trigger);

    const early = screen.getByRole('button', { name: '早番' });
    const late = screen.getByRole('button', { name: '遅番' });
    expect(early).toHaveFocus();

    late.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(early).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveFocus();
  });
});
