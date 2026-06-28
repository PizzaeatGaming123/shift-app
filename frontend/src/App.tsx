import { useApp } from './store/AppContext';
import { Login } from './components/Login';
import { StaffApp } from './components/StaffApp';
import { Skeleton } from './components/ui/Skeleton';
import { ManagerLayout } from './components/manager/ManagerLayout';

export function App() {
  const { me, loading } = useApp();

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen" aria-label="読み込み中">
          <Skeleton height={56} radius={12} />
          <Skeleton height={40} width={220} radius={10} />
          <Skeleton height={340} radius={16} />
        </div>
      </div>
    );
  }
  if (!me) return <Login />;

  if (me.role === 'MANAGER') return <ManagerLayout />;
  return <StaffApp />;
}

export default App;
