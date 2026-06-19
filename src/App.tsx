import { useState } from 'react';
import { useApp } from './store/AppContext';
import { Header, type Role } from './components/Header';
import { RequestEditor } from './components/RequestEditor';
import { ManagerMatrix } from './components/ManagerMatrix';
import { SharedView } from './components/SharedView';
import { shiftMonth } from './lib/date';

type StaffTab = 'request' | 'shared';
type ManagerTab = 'matrix' | 'shared';

export function App() {
  const { data } = useApp();
  const [storeId, setStoreId] = useState(data.stores[0]?.id ?? '');
  const [role, setRole] = useState<Role>('staff');
  const [{ year, month }, setYm] = useState({ year: 2026, month: 6 });
  const [staffTab, setStaffTab] = useState<StaffTab>('request');
  const [managerTab, setManagerTab] = useState<ManagerTab>('matrix');

  return (
    <div className="app">
      <Header
        stores={data.stores}
        storeId={storeId}
        onStoreChange={setStoreId}
        role={role}
        onRoleChange={setRole}
      />

      <div className="month-nav">
        <button onClick={() => setYm(shiftMonth(year, month, -1))} aria-label="前の月">‹</button>
        <span className="month-title">{year}年 {month}月</span>
        <button onClick={() => setYm(shiftMonth(year, month, 1))} aria-label="次の月">›</button>
      </div>

      {role === 'staff' ? (
        <>
          <div className="tabs">
            <button className={staffTab === 'request' ? 'active' : ''} onClick={() => setStaffTab('request')}>希望を出す</button>
            <button className={staffTab === 'shared' ? 'active' : ''} onClick={() => setStaffTab('shared')}>確定シフト</button>
          </div>
          {staffTab === 'request'
            ? <RequestEditor storeId={storeId} year={year} month={month} />
            : <SharedView storeId={storeId} year={year} month={month} />}
        </>
      ) : (
        <>
          <div className="tabs">
            <button className={managerTab === 'matrix' ? 'active' : ''} onClick={() => setManagerTab('matrix')}>希望確認・割り当て</button>
            <button className={managerTab === 'shared' ? 'active' : ''} onClick={() => setManagerTab('shared')}>確定シフト</button>
          </div>
          {managerTab === 'matrix'
            ? <ManagerMatrix storeId={storeId} year={year} month={month} />
            : <SharedView storeId={storeId} year={year} month={month} />}
        </>
      )}
    </div>
  );
}

export default App;
