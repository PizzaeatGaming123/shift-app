import type { Store } from '../types';

export type Role = 'staff' | 'manager';

interface HeaderProps {
  stores: Store[];
  storeId: string;
  onStoreChange: (id: string) => void;
  role: Role;
  onRoleChange: (role: Role) => void;
}

export function Header({ stores, storeId, onStoreChange, role, onRoleChange }: HeaderProps) {
  return (
    <header className="header">
      <span className="logo">暁夢シフト</span>
      <select value={storeId} onChange={(e) => onStoreChange(e.target.value)} aria-label="店舗選択">
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="role-toggle">
        <button
          className={role === 'staff' ? 'active' : ''}
          onClick={() => onRoleChange('staff')}
        >
          スタッフ用
        </button>
        <button
          className={role === 'manager' ? 'active' : ''}
          onClick={() => onRoleChange('manager')}
        >
          店長用
        </button>
      </div>
    </header>
  );
}
