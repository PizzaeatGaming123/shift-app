import type { ReactNode } from 'react';

export type BadgeTone = 'manager' | 'staff';

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
