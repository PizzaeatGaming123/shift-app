import { useApp } from '../store/AppContext';

const MENUS: { label: string; items: string[] }[] = [
  { label: 'シフト', items: ['シフト作成', '希望シフト一覧', '確定シフト', '印刷'] },
  { label: 'スタッフ', items: ['スタッフ一覧', 'スタッフ追加', 'ランク設定', 'スキル設定'] },
  { label: '会計', items: ['売上計画', '人件費', '人時売上高'] },
  { label: '労務', items: ['労務状況', '勤怠', '労働時間アラート'] },
  { label: '組織', items: ['店舗管理', '部門', '権限設定'] },
  { label: 'データ管理', items: ['CSVインポート', 'エクスポート', '連携設定'] },
  { label: '設定', items: ['営業時間', 'シフト回収設定', '通知設定'] },
];

export function TopNav() {
  const { me, logout } = useApp();
  return (
    <header className="topnav">
      <span className="topnav-brand">暁夢シフト</span>
      <nav className="topnav-menus" aria-label="メインメニュー">
        {MENUS.map((m) => (
          <details className="nav-dd" key={m.label}>
            <summary>{m.label}<span className="caret" aria-hidden="true" /></summary>
            <div className="nav-menu">
              {m.items.map((it) => (
                <button type="button" key={it} className="nav-menu-item">{it}</button>
              ))}
            </div>
          </details>
        ))}
      </nav>
      <div className="topnav-right">
        <button type="button" className="topnav-icon" aria-label="ヘルプ">?</button>
        <button type="button" className="topnav-icon bell" aria-label="通知"><span className="bell-dot" /></button>
        <details className="nav-dd user-dd">
          <summary>{me?.name ?? ''} さん<span className="caret" aria-hidden="true" /></summary>
          <div className="nav-menu right">
            <button type="button" className="nav-menu-item">アカウント設定</button>
            <button type="button" className="nav-menu-item" onClick={() => void logout()}>ログアウト</button>
          </div>
        </details>
      </div>
    </header>
  );
}
