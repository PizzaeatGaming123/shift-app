import { useEffect, useState, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** モーダルの退場アニメーション時間（CSS の transition と一致させる）。 */
const LEAVE_MS = 160;

export function Modal({ open, title, onClose, children }: ModalProps) {
  // open が true になったら mounted=true、false になったら leaving 中だけ mounted=true。
  // 「entering → visible」の RAF 遷移で入場アニメを発火させる。
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<'entering' | 'visible' | 'leaving'>(
    open ? 'visible' : 'entering',
  );

  useEffect(() => {
    if (open) {
      setMounted(true);
      setState('entering');
      const raf = requestAnimationFrame(() => setState('visible'));
      return () => cancelAnimationFrame(raf);
    }
    if (!mounted) return;
    setState('leaving');
    const t = setTimeout(() => setMounted(false), LEAVE_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, onClose]);

  if (!mounted) return null;
  return (
    <div className="modal-backdrop" data-state={state} onClick={onClose}>
      <div
        className="modal"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button type="button" className="modal-x" onClick={onClose} aria-label="閉じる">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
