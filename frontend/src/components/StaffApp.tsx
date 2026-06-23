import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { RequestEditor } from './RequestEditor';
import { SharedView } from './SharedView';

type Tab = 'main' | 'shared';

/** スタッフ向けのスマホ／LINE風シェル。希望提出と確定シフト確認をモバイルUIで提供する。 */
export function StaffApp() {
  const { me, logout, stores, storeId, month, setMonth } = useApp();
  const [tab, setTab] = useState<Tab>('main');

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const storeName = stores.find((s) => String(s.id) === String(storeId))?.name ?? 'シフト';
  const initial = (me?.name ?? '？').trim().charAt(0);

  function shiftMonthStr(delta: number) {
    const zero = monthNum - 1 + delta;
    const y = year + Math.floor(zero / 12);
    const m = ((zero % 12) + 12) % 12 + 1;
    setMonth(`${y}-${String(m).padStart(2, '0')}`);
  }

  function goToday() {
    const now = new Date();
    setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="line-stage">
      <div className="line-phone">
        <header className="line-head">
          <button
            type="button"
            className="line-head__home"
            aria-label="ホーム"
            onClick={() => { setTab('main'); goToday(); }}
          >
            <span className="line-avatar" aria-hidden="true">{initial}</span>
          </button>
          <span className="line-head__txt">
            <strong>{storeName}</strong>
            <small>{me?.name} さん</small>
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
          <p className="line-bubble">
            {tab === 'main'
              ? 'シフト希望を出してね！日付をタップして「早番・中番・遅番・休み」を選ぶだけ📱'
              : '確定したシフトだよ。出勤日を確認してね👍'}
          </p>

          <div className="month-nav">
            <button type="button" className="btn btn-ghost" onClick={() => shiftMonthStr(-1)} aria-label="前の月">‹</button>
            <span className="month-title">{year}年 {monthNum}月</span>
            <button type="button" className="btn btn-ghost" onClick={() => shiftMonthStr(1)} aria-label="次の月">›</button>
            <button type="button" className="btn btn-soft btn-sm today-btn" onClick={goToday}>今月</button>
          </div>

          <nav className="segment line-segment" aria-label="画面切り替え">
            <button type="button" className={tab === 'main' ? 'active' : ''} onClick={() => setTab('main')}>希望を出す</button>
            <button type="button" className={tab === 'shared' ? 'active' : ''} onClick={() => setTab('shared')}>確定シフト</button>
          </nav>

          <main className="screen">
            {tab === 'shared'
              ? <SharedView year={year} month={monthNum} />
              : <RequestEditor year={year} month={monthNum} />}
          </main>
        </div>
      </div>
    </div>
  );
}
