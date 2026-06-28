import type { Store } from '../types';
import { Badge } from './ui/Badge';

interface HeaderProps {
  stores: Store[];
  storeId: string;
  onStoreChange: (id: string) => void;
  userName: string;
  isManager: boolean;
  onLogout: () => void;
}

export function Header({ stores, storeId, onStoreChange, userName, isManager, onLogout }: HeaderProps) {
  return (
    <header className="topbar">
      <span className="logo">🍜 暁夢シフト</span>
      <select className="store-select" value={storeId} onChange={(e) => onStoreChange(e.target.value)} aria-label="店舗選択">
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="user-chip">
        <span className="user-name">{userName}</span>
        <Badge tone={isManager ? 'manager' : 'staff'}>{isManager ? '店長' : 'スタッフ'}</Badge>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>ログアウト</button>
      </div>
    </header>
  );
}
