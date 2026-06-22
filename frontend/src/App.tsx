import { useState } from 'react';
import { useApp } from './store/AppContext';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { RequestEditor } from './components/RequestEditor';
import { ManagerMatrix } from './components/ManagerMatrix';
import { SharedView } from './components/SharedView';

type Tab = 'main' | 'shared';

export function App() {
  const { me, loading, stores, storeId, month, setStoreId, setMonth, logout } = useApp();
  const [tab, setTab] = useState<Tab>('main');

  if (loading) return <div className="app"><p>読み込み中…</p></div>;
  if (!me) return <Login />;

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);

  function shiftMonthStr(delta: number) {
    const zero = monthNum - 1 + delta;
    const y = year + Math.floor(zero / 12);
    const m = ((zero % 12) + 12) % 12 + 1;
    setMonth(`${y}-${String(m).padStart(2, '0')}`);
  }

  const isManager = me.role === 'MANAGER';

  return (
    <div className="app">
      <Header
        stores={stores}
        storeId={storeId ? String(storeId) : ''}
        onStoreChange={(id) => setStoreId(Number(id))}
        userName={me.name}
        roleLabel={isManager ? '店長' : 'スタッフ'}
        onLogout={() => void logout()}
      />

      <div className="month-nav">
        <button onClick={() => shiftMonthStr(-1)} aria-label="前の月">‹</button>
        <span className="month-title">{year}年 {monthNum}月</span>
        <button onClick={() => shiftMonthStr(1)} aria-label="次の月">›</button>
      </div>

      <div className="tabs">
        <button className={tab === 'main' ? 'active' : ''} onClick={() => setTab('main')}>
          {isManager ? '希望確認・割り当て' : '希望を出す'}
        </button>
        <button className={tab === 'shared' ? 'active' : ''} onClick={() => setTab('shared')}>確定シフト</button>
      </div>

      {tab === 'shared'
        ? <SharedView year={year} month={monthNum} />
        : isManager
          ? <ManagerMatrix year={year} month={monthNum} />
          : <RequestEditor year={year} month={monthNum} />}
    </div>
  );
}

export default App;
