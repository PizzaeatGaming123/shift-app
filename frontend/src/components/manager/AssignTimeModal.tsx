import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import type { ShiftPatterns } from '../../lib/shiftPatterns';
import type { EmploymentType, WorkSlot } from '../../types';

export interface AssignTimeResult {
  slot: WorkSlot;
  /** null = slot 既定の時間（早/遅）を使う。"HH:MM" = 任意時間。 */
  startTime: string | null;
  endTime: string | null;
}

interface AssignTimeModalProps {
  open: boolean;
  staffName: string;
  employmentType: EmploymentType;
  patterns: ShiftPatterns;
  /** 編集対象の既存割当（任意）。指定すれば時刻欄に初期値が入る。 */
  initial?: { slot: WorkSlot; startTime: string | null; endTime: string | null };
  onSave: (result: AssignTimeResult) => void;
  onClose: () => void;
}

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function inferSlot(startTime: string): WorkSlot {
  // 開始時刻 12:00 以降は遅番、それより前は早番として保存する。
  // パートの任意時間でもサーバ側は WorkSlot を必須要求するため、開始時刻から推定する。
  const hour = Number(startTime.slice(0, 2));
  return hour >= 12 ? 'late' : 'early';
}

export function AssignTimeModal({
  open,
  staffName,
  employmentType,
  patterns,
  initial,
  onSave,
  onClose,
}: AssignTimeModalProps) {
  const [startTime, setStartTime] = useState<string>(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState<string>(initial?.endTime ?? '');

  // モーダルを開き直すたびに初期値で初期化する。
  useEffect(() => {
    if (open) {
      setStartTime(initial?.startTime ?? '');
      setEndTime(initial?.endTime ?? '');
    }
  }, [open, initial?.startTime, initial?.endTime]);

  const showPresets = employmentType === '正社員';
  const customValid = TIME_PATTERN.test(startTime) && TIME_PATTERN.test(endTime);

  function savePreset(slot: WorkSlot) {
    onSave({ slot, startTime: null, endTime: null });
  }

  function saveCustom() {
    if (!customValid) return;
    onSave({ slot: inferSlot(startTime), startTime, endTime });
  }

  return (
    <Modal open={open} title={`${staffName} のシフトを割り当て`} onClose={onClose}>
      <div className="rk-assign-modal">
        {showPresets && (
          <div className="rk-assign-modal__presets">
            <button type="button" onClick={() => savePreset('early')}>
              早番 {patterns.early.start}-{patterns.early.end}
            </button>
            <button type="button" onClick={() => savePreset('late')}>
              遅番 {patterns.late.start}-{patterns.late.end}
            </button>
            <hr />
            <p className="muted-sm">または任意の時間を入力：</p>
          </div>
        )}
        <div className="rk-assign-modal__custom">
          <label>
            開始
            <input
              type="time"
              aria-label="開始"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label>
            終了
            <input
              type="time"
              aria-label="終了"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>
          <button type="button" onClick={saveCustom} disabled={!customValid}>
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
}
