import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../store/AppContext';
import { ManagerMatrix } from './ManagerMatrix';

function renderMatrix() {
  return render(
    <AppProvider>
      <ManagerMatrix storeId="s-nakashima" year={2026} month={6} />
    </AppProvider>
  );
}

describe('ManagerMatrix', () => {
  beforeEach(() => localStorage.clear());

  it('renders a row per staff and shift-count rows', () => {
    renderMatrix();
    expect(screen.getByText('山田（店長）')).toBeInTheDocument();
    expect(screen.getByText('早番人数')).toBeInTheDocument();
    expect(screen.getByText('遅番人数')).toBeInTheDocument();
  });

  it('shows day-of-month headers', () => {
    renderMatrix();
    // 6月は30日まで
    expect(screen.getByRole('columnheader', { name: '30' })).toBeInTheDocument();
  });
});
