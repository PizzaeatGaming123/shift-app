import { useState, type ReactNode } from 'react';

const SITE_USER = '12345';
const SITE_PASS = '12345';
const STORAGE_KEY = 'site-gate-auth';

function isAuthed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'ok';
  } catch {
    return false;
  }
}

export function SiteGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(() => isAuthed());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (authed) return <>{children}</>;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (username === SITE_USER && password === SITE_PASS) {
      try {
        sessionStorage.setItem(STORAGE_KEY, 'ok');
      } catch {
        // ignore storage failures; still allow this session
      }
      setError(null);
      setAuthed(true);
    } else {
      setError('ユーザー名またはパスワードが違います');
    }
  }

  return (
    <div className="site-gate">
      <form className="site-gate__card" onSubmit={submit}>
        <h1 className="site-gate__title">暁夢シフト</h1>
        <p className="site-gate__lead">サイトを表示するにはサインインしてください。</p>
        <label className="site-gate__field">
          <span>ユーザー名</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            inputMode="numeric"
            autoFocus
          />
        </label>
        <label className="site-gate__field">
          <span>パスワード</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            inputMode="numeric"
          />
        </label>
        {error && <p className="site-gate__error">{error}</p>}
        <button type="submit" className="site-gate__submit">サインイン</button>
      </form>
    </div>
  );
}
