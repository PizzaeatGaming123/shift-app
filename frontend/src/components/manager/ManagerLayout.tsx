import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Modal } from '../ui/Modal';
import { AccountSettingsForm } from '../AccountSettingsForm';
import { GlobalNav, type ManagerSection } from './GlobalNav';
import { ManagerShiftScreen } from './ManagerShiftScreen';
import { SectionBody, SECTION_TITLES } from './SectionBody';

/** SectionBody が中身を持つ全セクション＋シフト表を有効にする。 */
const ENABLED_SECTIONS: ReadonlySet<ManagerSection> = new Set<ManagerSection>([
  'shift-table',
  ...(Object.keys(SECTION_TITLES) as ManagerSection[]),
]);

export function ManagerLayout() {
  const { me, logout } = useApp();
  const [activeSection, setActiveSection] = useState<ManagerSection>('shift-table');
  const [homeSignal, setHomeSignal] = useState(0);
  const [util, setUtil] = useState<null | 'account' | 'help'>(null);

  function goHome() {
    setActiveSection('shift-table');
    setHomeSignal((value) => value + 1);
  }

  return (
    <>
      <GlobalNav
        userName={me?.name ?? ''}
        enabledSections={ENABLED_SECTIONS}
        onHome={goHome}
        onOpenSection={(section) => {
          if (section === 'shift-table') { goHome(); return; }
          setActiveSection(section);
        }}
        onOpenHelp={() => setUtil('help')}
        onOpenAccount={() => setUtil('account')}
        onLogout={() => void logout()}
      />

      {activeSection === 'shift-table' ? (
        <ManagerShiftScreen homeSignal={homeSignal} />
      ) : (
        <section className="rk-section-screen" aria-label={SECTION_TITLES[activeSection]}>
          <header className="rk-section-screen__head">
            <button
              type="button"
              className="rk-section-screen__back"
              onClick={() => setActiveSection('shift-table')}
            >
              ← シフト表へ戻る
            </button>
            <h2 className="rk-section-screen__title">{SECTION_TITLES[activeSection]}</h2>
          </header>
          <div className="rk-section-screen__body">
            <SectionBody section={activeSection} />
          </div>
        </section>
      )}

      <Modal open={util !== null} title={util === 'help' ? '使い方' : 'アカウント設定'} onClose={() => setUtil(null)}>
        {util === 'help' && (
          <>
            <p>日付をタップして希望を提出し、店長がマトリクスで割り当てます。</p>
            <p>上部メニューから各管理画面（モデルシフト・追加募集など）を開けます。</p>
            <p>「シフト確定」で確定し、「データ管理 → CSVエクスポート」で表を書き出せます。</p>
          </>
        )}
        {util === 'account' && <AccountSettingsForm />}
      </Modal>
    </>
  );
}
