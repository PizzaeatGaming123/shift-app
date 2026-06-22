import { useState } from 'react';
import { useApp } from '../store/AppContext';

const DEMO_ACCOUNTS = [
  { label: '中島店 店長', username: 'nakashima-mgr' },
  { label: '中島店 スタッフ（佐藤）', username: 'nakashima-1' },
  { label: '新田店 店長', username: 'nitta-mgr' },
  { label: '早島店 店長', username: 'hayashima-mgr' },
];

export function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    }
  }

  return (
    <div className="app">
      <h1 className="logo" style={{ marginTop: 32 }}>暁夢シフト</h1>
      <form onSubmit={submit} style={{ maxWidth: 320 }}>
        <p>
          <label>ユーザー名<br />
            <input value={username} onChange={(e) => setUsername(e.target.value)}
                   style={{ width: '100%', padding: 8, fontSize: 16 }} />
          </label>
        </p>
        <p>
          <label>パスワード<br />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   style={{ width: '100%', padding: 8, fontSize: 16 }} />
          </label>
        </p>
        {error && <p style={{ color: 'var(--low)' }}>{error}</p>}
        <button type="submit" className="role-toggle" style={{ padding: '10px 20px' }}>ログイン</button>
      </form>

      <div style={{ marginTop: 24, fontSize: 14, color: '#666' }}>
        <strong>デモ用アカウント</strong>（パスワードは全員 <code>password</code>）
        <ul>
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.username}>
              <button type="button" onClick={() => setUsername(a.username)}
                      style={{ cursor: 'pointer' }}>{a.label}: {a.username}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
