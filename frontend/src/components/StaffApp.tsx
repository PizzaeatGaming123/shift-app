import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Modal } from './ui/Modal';
import { AccountSettingsForm } from './AccountSettingsForm';
import { RequestEditor } from './RequestEditor';
import { SharedView } from './SharedView';
import { StaffMessages } from './StaffMessages';

type Tab = 'main' | 'shared' | 'messages';

/** スタッフ向けのスマホシェル。資料の提出画面と同じ単一カラムで表示する。 */
export function StaffApp() {
  const { logout, month, setMonth } = useApp();
  const [tab, setTab] = useState<Tab>('main');
  const [accountOpen, setAccountOpen] = useState(false);

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const allowedYear = new Date().getFullYear();

  useEffect(() => {
    if (year === allowedYear) return;
    const safeMonth = Number.isFinite(monthNum) ? Math.min(12, Math.max(1, monthNum)) : new Date().getMonth() + 1;
    setMonth(`${allowedYear}-${String(safeMonth).padStart(2, '0')}`);
  }, [allowedYear, monthNum, setMonth, year]);

  return (
    <div className="line-stage">
      <div className="line-phone">
        <header className="line-head">
          <button
            type="button"
            className="line-head__back"
            onClick={() => setTab('main')}
            aria-label="シフト提出へ戻る"
          >
            ‹
          </button>
          <span className="line-head__title">
            {tab === 'main' ? 'シフト提出＆確認' : tab === 'shared' ? 'シフト確定' : 'メッセージ'}
          </span>
          <div className="line-head__actions">
            <button
              type="button"
              className="line-head__account"
              onClick={() => setAccountOpen(true)}
              aria-label="アカウント設定"
            >
              アカウント
            </button>
            <button
              type="button"
              className="line-head__logout"
              onClick={() => void logout()}
            >
              ログアウト
            </button>
          </div>
        </header>

        <div className="line-body">
          <nav className="line-staff-nav" aria-label="スタッフメニュー">
            <button type="button" aria-current={tab === 'main'} onClick={() => setTab('main')}>
              シフト提出
            </button>
            <button type="button" aria-current={tab === 'shared'} onClick={() => setTab('shared')}>
              シフト確定
            </button>
            <button type="button" aria-current={tab === 'messages'} onClick={() => setTab('messages')}>
              メッセージ
            </button>
          </nav>
          <main className="screen">
            {tab === 'shared' && <SharedView year={year} month={monthNum} />}
            {tab === 'messages' && <StaffMessages />}
            {tab === 'main' && <RequestEditor year={year} month={monthNum} />}
          </main>
        </div>
      </div>

      <Modal open={accountOpen} title="アカウント設定" onClose={() => setAccountOpen(false)}>
        <AccountSettingsForm />
      </Modal>
    </div>
  );
}
