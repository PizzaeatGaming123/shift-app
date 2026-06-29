import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** 入場: 240ms 表示。退場: leaving 状態を LEAVE_MS 保ってから unmount。 */
const VISIBLE_MS = 2500;
const LEAVE_MS = 180;

type State = 'entering' | 'visible' | 'leaving';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [state, setState] = useState<State>('entering');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (removeTimer.current) {
      clearTimeout(removeTimer.current);
      removeTimer.current = null;
    }
  };

  const showToast = useCallback((nextMessage: string) => {
    clearTimers();
    setMessage(nextMessage);
    setState('entering');
    // 次フレームで visible に切り替えて入場アニメを発火させる
    requestAnimationFrame(() => setState('visible'));

    hideTimer.current = setTimeout(() => {
      setState('leaving');
      removeTimer.current = setTimeout(() => {
        setMessage(null);
        removeTimer.current = null;
      }, LEAVE_MS);
      hideTimer.current = null;
    }, VISIBLE_MS);
  }, []);

  useEffect(() => clearTimers, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <div className="toast" role="status" data-state={state}>
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
