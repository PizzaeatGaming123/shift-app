import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';

interface ShiftConfirmDialogProps {
  open: boolean;
  storeName: string;
  positions: string[];
  dates: string[];
  onClose: () => void;
  /** 確定対象のポジション・日付を受けて確定処理を実行する。 */
  onConfirm: (selection: { positions: string[]; dates: string[] }) => void;
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];

function fmtDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
}

function periodLabel(dates: string[]): string {
  if (dates.length === 0) return '';
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first === last) return fmtDate(first);
  return `${fmtDate(first)}〜${fmtDate(last)}`;
}

/** らくしふ4 画像準拠：ポジション・日付を選んでシフトを確定するダイアログ。 */
export function ShiftConfirmDialog({
  open,
  storeName,
  positions,
  dates,
  onClose,
  onConfirm,
}: ShiftConfirmDialogProps) {
  const [selectedPositions, setSelectedPositions] = useState<string[]>(positions);
  const [selectedDates, setSelectedDates] = useState<string[]>(dates);
  const [done, setDone] = useState<{ positions: string[] } | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedPositions(positions);
      setSelectedDates(dates);
      setDone(null);
    }
    // 開いた瞬間だけ初期化する（positions/dates の参照変化での再リセットを避ける）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allPositions = selectedPositions.length === positions.length;
  const allDates = selectedDates.length === dates.length;

  function togglePosition(value: string) {
    setSelectedPositions((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]);
  }
  function toggleDate(value: string) {
    setSelectedDates((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]);
  }

  function handleConfirm() {
    onConfirm({ positions: selectedPositions, dates: selectedDates });
    setDone({ positions: selectedPositions });
  }

  if (!open) return null;

  return (
    <Modal open={open} title={done ? '' : `${periodLabel(dates)}の確定シフト（${storeName}）`} onClose={onClose}>
      {done ? (
        <div className="rk-confirm-done">
          <div className="rk-confirm-done__icon" aria-hidden="true">✓</div>
          <h3>全てのシフトを確定しました！</h3>
          <ul>
            {done.positions.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <p className="rk-confirm-done__note">
            ※ 確定後の変更は変更履歴が残ります。<br />
            ※ 公開を実行するまでスタッフ画面には反映されません。
          </p>
          <div className="rk-confirm-actions">
            <button type="button" className="rk-confirm-actions__primary" onClick={onClose}>閉じる</button>
          </div>
        </div>
      ) : (
        <div className="rk-confirm-form">
          <p className="rk-confirm-form__lead">
            シフトを確定するポジションと日付を選択してください
          </p>

          <section className="rk-confirm-block">
            <header>
              <strong>ポジション</strong>
              <button
                type="button"
                className="rk-confirm-all"
                onClick={() => setSelectedPositions(allPositions ? [] : positions)}
              >
                {allPositions ? '全てのチェックを外す' : '全てのポジションを選択'}
              </button>
            </header>
            <ul className="rk-confirm-list">
              {positions.map((p) => (
                <li key={p}>
                  <label className="rk-confirm-item">
                    <input
                      type="checkbox"
                      checked={selectedPositions.includes(p)}
                      onChange={() => togglePosition(p)}
                    />
                    <span>{p}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rk-confirm-block">
            <header>
              <strong>日付（{dates.length}日）</strong>
              <button
                type="button"
                className="rk-confirm-all"
                onClick={() => setSelectedDates(allDates ? [] : dates)}
              >
                {allDates ? '全ての日付のチェックを外す' : '全ての日付を選択'}
              </button>
            </header>
            <ul className="rk-confirm-list rk-confirm-list--dates">
              {dates.map((d) => (
                <li key={d}>
                  <label className="rk-confirm-item">
                    <input
                      type="checkbox"
                      checked={selectedDates.includes(d)}
                      onChange={() => toggleDate(d)}
                    />
                    <span>{fmtDate(d)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <div className="rk-confirm-actions">
            <button type="button" className="rk-confirm-actions__ghost" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="button"
              className="rk-confirm-actions__primary"
              disabled={selectedPositions.length === 0 || selectedDates.length === 0}
              onClick={handleConfirm}
            >
              シフト確定
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
