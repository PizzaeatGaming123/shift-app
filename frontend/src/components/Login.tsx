import { useState } from 'react';
import { useApp } from '../store/AppContext';

const DEMO_ACCOUNTS = [
  { label: '中島店 店長', username: 'nakashima-mgr' },
  { label: '中島店 スタッフ（田中太郎）', username: 'nakashima-1' },
  { label: '新田店 店長', username: 'nitta-mgr' },
  { label: '早島店 店長', username: 'hayashima-mgr' },
];

export function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card card">
        <div className="login-brand">
          <div className="login-logo">🍜 暁夢シフト</div>
          <p className="login-tagline">みんなのシフト、ひとつに。</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label className="field">
            <span>ユーザー名</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label className="field">
            <span>パスワード</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'ログイン中…' : 'ログイン →'}
          </button>
        </form>
        <div className="login-demo">
          <p className="login-demo-title">お試しログイン（パスワードは <code>password</code>）</p>
          <div className="login-demo-chips">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                className="chip-btn"
                onClick={() => {
                  setUsername(account.username);
                  setPassword('password');
                }}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
