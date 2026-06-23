import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { RequestEditor } from './RequestEditor';
import { SharedView } from './SharedView';

type Tab = 'main' | 'shared';

/** スタッフ向けのスマホシェル。資料の提出画面と同じ単一カラムで表示する。 */
export function StaffApp() {
  const { logout, month } = useApp();
  const [tab, setTab] = useState<Tab>('main');

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);

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
            {tab === 'main' ? 'シフト提出＆確認' : '確定シフト'}
          </span>
          <button
            type="button"
            className="line-head__logout"
            onClick={() => void logout()}
          >
            ログアウト
          </button>
        </header>

        <div className="line-body">
          <main className="screen">
            {tab === 'shared'
              ? <SharedView year={year} month={monthNum} />
              : <RequestEditor year={year} month={monthNum} />}
          </main>
          {tab === 'main' && (
            <button type="button" className="line-confirmed-link" onClick={() => setTab('shared')}>
              確定シフトを確認する
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
