import type { Store } from '../types';

interface HeaderProps {
  stores: Store[];
  storeId: string;
  onStoreChange: (id: string) => void;
  userName: string;
  roleLabel: string;
  onLogout: () => void;
}

export function Header({ stores, storeId, onStoreChange, userName, roleLabel, onLogout }: HeaderProps) {
  return (
    <header className="header">
      <span className="logo">暁夢シフト</span>
      <select value={storeId} onChange={(e) => onStoreChange(e.target.value)} aria-label="店舗選択">
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="role-toggle">
        <span style={{ alignSelf: 'center', fontSize: 14, color: '#666' }}>
          {userName}（{roleLabel}）
        </span>
        <button onClick={onLogout}>ログアウト</button>
      </div>
    </header>
  );
}
