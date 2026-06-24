import { useCallback, useEffect, useState, type SetStateAction } from 'react';

const EVENT = 'akiyume-setting-changed';

export function getSetting<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setSetting<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

/** localStorage に保存し、同一タブ内の他コンポーネントへも反映する設定フック。 */
export function useSetting<T>(key: string, fallback: T): [T, (v: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => getSetting(key, fallback));

  useEffect(() => {
    setValue(getSetting(key, fallback));
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail === key) setValue(getSetting(key, fallback));
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
    // fallback は初期値なので依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback((v: SetStateAction<T>) => {
    const current = getSetting(key, fallback);
    const next = typeof v === 'function'
      ? (v as (previous: T) => T)(current)
      : v;
    setSetting(key, next);
  }, [fallback, key]);
  return [value, set];
}
