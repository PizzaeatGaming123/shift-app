import { useEffect, useRef, useState } from 'react';

export type ManagerSection =
  | 'shift-table'
  | 'shift-settings'
  | 'collection'
  | 'recruitment'
  | 'confirmed-shifts'
  | 'messages'
  | 'staff-list'
  | 'staff-registration'
  | 'manager-registration'
  | 'rank-settings'
  | 'skill-settings'
  | 'fixed-shifts'
  | 'sales-plan'
  | 'labor-cost'
  | 'sales-per-hour'
  | 'model-shift'
  | 'labor-status'
  | 'attendance'
  | 'labor-alerts'
  | 'store-management'
  | 'departments'
  | 'positions'
  | 'permissions'
  | 'store-help'
  | 'csv-export'
  | 'csv-import'
  | 'integrations'
  | 'display-settings'
  | 'business-hours'
  | 'collection-settings'
  | 'notification-settings'
  | 'shift-patterns'
  | 'color-settings';

interface GlobalNavProps {
  userName: string;
  enabledSections: ReadonlySet<ManagerSection>;
  onHome: () => void;
  onOpenSection: (section: ManagerSection) => void;
  onLogout: () => void;
  onOpenHelp?: () => void;
  onOpenAccount?: () => void;
}

const NAV_GROUPS: {
  label: string;
  items: { label: string; section: ManagerSection }[];
}[] = [
  {
    label: 'シフト',
    items: [
      { label: 'シフト表', section: 'shift-table' },
      { label: 'シフト設定', section: 'shift-settings' },
      { label: '回収状況', section: 'collection' },
      { label: '追加募集', section: 'recruitment' },
      { label: '確定シフト', section: 'confirmed-shifts' },
      { label: 'メッセージ', section: 'messages' },
    ],
  },
  {
    label: 'スタッフ',
    items: [
      { label: 'スタッフ一覧', section: 'staff-list' },
      { label: 'スタッフ登録', section: 'staff-registration' },
      { label: '管理者登録', section: 'manager-registration' },
      { label: 'ランク設定', section: 'rank-settings' },
      { label: 'スキル設定', section: 'skill-settings' },
      { label: '固定シフト', section: 'fixed-shifts' },
    ],
  },
  {
    label: '計画',
    items: [
      { label: '売上計画', section: 'sales-plan' },
      { label: '人件費', section: 'labor-cost' },
      { label: '人時売上高', section: 'sales-per-hour' },
      { label: 'モデルシフト', section: 'model-shift' },
    ],
  },
  {
    label: '労務',
    items: [
      { label: '労務状況', section: 'labor-status' },
      { label: '勤怠', section: 'attendance' },
      { label: '労働時間アラート', section: 'labor-alerts' },
    ],
  },
  {
    label: '組織',
    items: [
      { label: '店舗管理', section: 'store-management' },
      { label: '部門', section: 'departments' },
      { label: 'ポジション', section: 'positions' },
      { label: '権限設定', section: 'permissions' },
      { label: '他事業所ヘルプ', section: 'store-help' },
    ],
  },
  {
    label: 'データ管理',
    items: [
      { label: 'CSVエクスポート', section: 'csv-export' },
      { label: 'CSVインポート', section: 'csv-import' },
      { label: '連携設定', section: 'integrations' },
    ],
  },
  {
    label: '設定',
    items: [
      { label: '表示設定', section: 'display-settings' },
      { label: '営業時間', section: 'business-hours' },
      { label: 'シフト回収設定', section: 'collection-settings' },
      { label: '通知設定', section: 'notification-settings' },
      { label: 'シフトパターン', section: 'shift-patterns' },
      { label: '色設定', section: 'color-settings' },
    ],
  },
];

export function GlobalNav({
  userName,
  enabledSections,
  onHome,
  onOpenSection,
  onLogout,
  onOpenHelp,
  onOpenAccount,
}: GlobalNavProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  function choose(section: ManagerSection) {
    if (!enabledSections.has(section)) return;
    setOpenMenu(null);
    onOpenSection(section);
  }

  return (
    <nav ref={rootRef} className="rk-global-nav" aria-label="管理メニュー">
      <button type="button" className="rk-global-nav__brand" onClick={onHome}>
        暁夢シフト
      </button>

      {NAV_GROUPS.map((group) => {
        const open = openMenu === group.label;
        return (
          <div className="rk-global-nav__group" key={group.label}>
            <button
              type="button"
              className="rk-global-nav__trigger"
              aria-expanded={open}
              onClick={() => setOpenMenu(open ? null : group.label)}
            >
              {group.label}
              <span className="rk-global-nav__chevron" aria-hidden="true" />
            </button>

            {open && (
              <div
                role="menu"
                aria-label={`${group.label}メニュー`}
                className="rk-global-nav__menu"
              >
                {group.items.map((item) => {
                  const enabled = enabledSections.has(item.section);
                  return (
                    <button
                      type="button"
                      role="menuitem"
                      key={item.section}
                      disabled={!enabled}
                      aria-disabled={!enabled}
                      onClick={() => choose(item.section)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="rk-global-nav__spacer" />
      <button
        type="button"
        className="rk-global-nav__icon"
        aria-label="ヘルプ"
        onClick={onOpenHelp}
      >
        ?
      </button>
      <div className="rk-global-nav__group rk-global-nav__account">
        <button
          type="button"
          className="rk-global-nav__trigger"
          aria-expanded={openMenu === 'account'}
          onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
        >
          {userName}さん
          <span className="rk-global-nav__chevron" aria-hidden="true" />
        </button>
        {openMenu === 'account' && (
          <div
            role="menu"
            aria-label="アカウントメニュー"
            className="rk-global-nav__menu"
          >
            {onOpenAccount && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenMenu(null);
                  onOpenAccount();
                }}
              >
                アカウント設定
              </button>
            )}
            <button type="button" role="menuitem" onClick={onLogout}>
              ログアウト
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
