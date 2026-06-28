import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import type { ShiftPatterns } from '../../lib/shiftPatterns';
import type { AssignmentBreak, EmploymentType, WorkSlot } from '../../types';

/** 「らくしふ」風シフトセル編集モーダル。点線セル（空セル）押下で開き、勤務時間/休憩/タスク/メモを保存する。 */
export interface ShiftCellSaveData {
  /** 'off' は割当解除（unassign）。'preset' は時間未指定（チップは早番/遅番ラベル）。'time' は任意時間（チップは時間表示）。 */
  mode: 'time' | 'preset' | 'off';
  slot?: WorkSlot;
  /** mode='time' のときのみ非 null。mode='preset' は null で送信して slot 既定で運用。 */
  startTime?: string | null;
  endTime?: string | null;
  tasks: string[];
  breaks: AssignmentBreak[];
  workMemo: string;
}

interface ShiftCellEditorModalProps {
  open: boolean;
  staffName: string;
  /** 表示専用の店舗名（モーダル右上の店舗セレクト相当）。 */
  storeName: string;
  /** 表示専用のポジション名。 */
  position: string;
  /** 表示用の日付ラベル。例: "26(月) らくしふテスト" */
  dateLabel: string;
  employmentType: EmploymentType;
  patterns: ShiftPatterns;
  /** 店舗のタスクマスタ。チェックボックスとして並ぶ。 */
  taskOptions: string[];
  /** 既存割当の編集なら値を渡す。新規なら undefined。 */
  initial?: {
    startTime: string;
    endTime: string;
    tasks: string[];
    breaks: AssignmentBreak[];
    workMemo: string;
  };
  /** 既存割当が早番/遅番プリセットのとき、その slot を初期選択にする。 */
  initialPresetSlot?: WorkSlot;
  /** 既存割当の編集モードなら true（削除ボタンとタイトルが変わる）。 */
  isEditing: boolean;
  onSave: (data: ShiftCellSaveData) => void;
  onDelete?: () => void;
  onClose: () => void;
}

type Tab = 'time' | 'off';

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

function inferSlot(startTime: string): WorkSlot {
  const hour = Number(startTime.slice(0, 2));
  return hour >= 12 ? 'late' : 'early';
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function splitTime(value: string): { hour: string; minute: string } {
  const [h = '00', m = '00'] = value.split(':');
  return {
    hour: HOURS.includes(h) ? h : '00',
    minute: MINUTES.includes(m) ? m : '00',
  };
}

function joinTime(hour: string, minute: string): string {
  return `${hour}:${minute}`;
}

/** HH と MM を別セレクトで入力するコンポーネント。らくしふ参照画像と同じ見た目。 */
function HourMinutePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  const { hour, minute } = splitTime(value);
  return (
    <span className="rk-cell-editor__hm">
      <select
        aria-label={`${label} 時`}
        value={hour}
        onChange={(event) => onChange(joinTime(event.target.value, minute))}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="rk-cell-editor__hm-sep">:</span>
      <select
        aria-label={`${label} 分`}
        value={minute}
        onChange={(event) => onChange(joinTime(hour, event.target.value))}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </span>
  );
}

/** 休憩の合計分を計算。invalid な行は無視する。 */
function totalBreakMinutes(breaks: AssignmentBreak[]): number {
  let total = 0;
  for (const b of breaks) {
    if (!isValidTime(b.startTime) || !isValidTime(b.endTime)) continue;
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff > 0) total += diff;
  }
  return total;
}

export function ShiftCellEditorModal({
  open,
  staffName,
  storeName,
  position,
  dateLabel,
  employmentType,
  patterns,
  taskOptions,
  initial,
  initialPresetSlot,
  isEditing,
  onSave,
  onDelete,
  onClose,
}: ShiftCellEditorModalProps) {
  const [tab, setTab] = useState<Tab>('time');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('18:00');
  /**
   * 早番/遅番のプリセットが選ばれているかどうか。
   * セットされていれば保存時に startTime/endTime を null で送り、チップは早番/遅番ラベルになる。
   * 勤務時間入力欄を手動で変更すると null に戻り、チップは時間ラベルになる。
   */
  const [presetSlot, setPresetSlot] = useState<WorkSlot | null>(null);
  const [tasks, setTasks] = useState<string[]>([]);
  const [breaks, setBreaks] = useState<AssignmentBreak[]>([]);
  const [workMemo, setWorkMemo] = useState('');
  const [taskQuery, setTaskQuery] = useState('');

  // 開く度に初期値で再初期化（前回の入力が残らないように）。
  useEffect(() => {
    if (!open) return;
    setTab('time');
    if (initialPresetSlot) {
      // 既存が早番/遅番プリセットなら、その slot を選択しつつ既定時間を入れる。
      setStartTime(patterns[initialPresetSlot].start);
      setEndTime(patterns[initialPresetSlot].end);
      setPresetSlot(initialPresetSlot);
    } else {
      setStartTime(initial?.startTime ?? '10:00');
      setEndTime(initial?.endTime ?? '18:00');
      setPresetSlot(null);
    }
    setTasks(initial?.tasks ?? []);
    setBreaks(initial?.breaks ?? []);
    setWorkMemo(initial?.workMemo ?? '');
    setTaskQuery('');
  }, [open, initial?.startTime, initial?.endTime, initial?.tasks, initial?.breaks, initial?.workMemo, initialPresetSlot, patterns]);

  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim();
    if (!q) return taskOptions;
    return taskOptions.filter((task) => task.includes(q));
  }, [taskOptions, taskQuery]);

  const breakTotal = totalBreakMinutes(breaks);
  const timeValid = isValidTime(startTime) && isValidTime(endTime)
    && startTime < endTime;

  function selectPreset(slot: WorkSlot) {
    setPresetSlot(slot);
    setStartTime(patterns[slot].start);
    setEndTime(patterns[slot].end);
  }

  function onChangeStartTime(value: string) {
    setStartTime(value);
    setPresetSlot(null);
  }

  function onChangeEndTime(value: string) {
    setEndTime(value);
    setPresetSlot(null);
  }

  function toggleTask(name: string) {
    setTasks((current) => (
      current.includes(name) ? current.filter((t) => t !== name) : [...current, name]
    ));
  }

  function addBreak() {
    setBreaks((current) => [...current, { startTime: '12:00', endTime: '13:00' }]);
  }

  function updateBreak(index: number, patch: Partial<AssignmentBreak>) {
    setBreaks((current) => current.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function removeBreak(index: number) {
    setBreaks((current) => current.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (tab === 'off') {
      onSave({ mode: 'off', tasks: [], breaks: [], workMemo: '' });
      return;
    }
    if (presetSlot) {
      // 早番/遅番プリセット → チップは「早番」「遅番」ラベル。時間は slot 既定を採用するため null で送る。
      onSave({
        mode: 'preset',
        slot: presetSlot,
        startTime: null,
        endTime: null,
        tasks,
        breaks: breaks.filter((b) => isValidTime(b.startTime) && isValidTime(b.endTime)),
        workMemo,
      });
      return;
    }
    if (!timeValid) return;
    onSave({
      mode: 'time',
      slot: inferSlot(startTime),
      startTime,
      endTime,
      tasks,
      breaks: breaks.filter((b) => isValidTime(b.startTime) && isValidTime(b.endTime)),
      workMemo,
    });
  }

  return (
    <Modal open={open} title={`${dateLabel} ${staffName}`} onClose={onClose}>
      <div className="rk-cell-editor">
        <div className="rk-cell-editor__topbar">
          {isEditing && onDelete && (
            <button type="button" className="rk-cell-editor__delete" onClick={onDelete}>削除</button>
          )}
          <button type="button" className="rk-cell-editor__print" onClick={() => window.print()}>印刷</button>
        </div>

        <div className="rk-cell-editor__row">
          <label>
            <span>勤務店舗</span>
            <select value={storeName} disabled>
              <option value={storeName}>{storeName}</option>
            </select>
          </label>
          <label>
            <span>勤務ポジション</span>
            <select value={position} disabled>
              <option value={position}>{position}</option>
            </select>
          </label>
        </div>

        <div className="rk-cell-editor__section">
          <p className="rk-cell-editor__heading">勤務予定</p>
          <div className="rk-cell-editor__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'time'}
              className={`rk-cell-editor__tab${tab === 'time' ? ' is-active' : ''}`}
              onClick={() => setTab('time')}
            >
              勤務時間入力
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'off'}
              className={`rk-cell-editor__tab${tab === 'off' ? ' is-active' : ''}`}
              onClick={() => setTab('off')}
            >
              休み
            </button>
          </div>
        </div>

        {tab !== 'off' && (
          <>
            <div className="rk-cell-editor__section">
              <p className="rk-cell-editor__heading">
                シフト種別
                <span className="rk-cell-editor__hint">
                  {employmentType === 'パート' ? '（時間入力が中心。早番/遅番は任意）' : '（早番/遅番を選ぶか、時間で指定）'}
                </span>
              </p>
              <div className="rk-cell-editor__presets">
                <button
                  type="button"
                  className={`rk-cell-editor__preset${presetSlot === 'early' ? ' is-active' : ''}`}
                  aria-pressed={presetSlot === 'early'}
                  onClick={() => selectPreset('early')}
                >
                  <strong>{patterns.early.label}</strong>
                  <small>{patterns.early.start} 〜 {patterns.early.end}</small>
                </button>
                <button
                  type="button"
                  className={`rk-cell-editor__preset${presetSlot === 'late' ? ' is-active' : ''}`}
                  aria-pressed={presetSlot === 'late'}
                  onClick={() => selectPreset('late')}
                >
                  <strong>{patterns.late.label}</strong>
                  <small>{patterns.late.start} 〜 {patterns.late.end}</small>
                </button>
              </div>
            </div>

            <div className="rk-cell-editor__section">
              <p className="rk-cell-editor__heading">勤務時間</p>
              <div className="rk-cell-editor__time-row">
                <HourMinutePicker
                  value={startTime}
                  onChange={onChangeStartTime}
                  label="勤務開始時刻"
                />
                <span className="rk-cell-editor__time-sep">〜</span>
                <HourMinutePicker
                  value={endTime}
                  onChange={onChangeEndTime}
                  label="勤務終了時刻"
                />
              </div>
            </div>

            <div className="rk-cell-editor__section">
              <div className="rk-cell-editor__heading-row">
                <div className="rk-cell-editor__heading-left">
                  <p className="rk-cell-editor__heading">休憩時間</p>
                  <select
                    className="rk-cell-editor__store-break"
                    aria-label="所属店舗の休憩時間設定"
                    defaultValue=""
                  >
                    <option value="">所属店舗の休憩時間設定</option>
                  </select>
                </div>
                <span className="rk-cell-editor__hint">指定した休憩時間 {breakTotal}分</span>
              </div>
              {breaks.length === 0 && (
                <p className="rk-cell-editor__placeholder">休憩はありません</p>
              )}
              {breaks.map((b, index) => (
                <div className="rk-cell-editor__break-row" key={index}>
                  <input
                    type="time"
                    aria-label={`休憩${index + 1} 開始`}
                    value={b.startTime}
                    onChange={(event) => updateBreak(index, { startTime: event.target.value })}
                  />
                  <span>〜</span>
                  <input
                    type="time"
                    aria-label={`休憩${index + 1} 終了`}
                    value={b.endTime}
                    onChange={(event) => updateBreak(index, { endTime: event.target.value })}
                  />
                  <button
                    type="button"
                    className="rk-cell-editor__break-delete"
                    onClick={() => removeBreak(index)}
                    aria-label={`休憩${index + 1}を削除`}
                  >
                    削除
                  </button>
                </div>
              ))}
              <button type="button" className="rk-cell-editor__break-add" onClick={addBreak}>
                ＋ 休憩時間を追加
              </button>
            </div>

            <div className="rk-cell-editor__section">
              <p className="rk-cell-editor__heading">タスク（業務内容）</p>
              <input
                type="search"
                className="rk-cell-editor__task-search"
                placeholder="検索"
                value={taskQuery}
                onChange={(event) => setTaskQuery(event.target.value)}
                aria-label="タスクを検索"
              />
              <div className="rk-cell-editor__tasks">
                {filteredTasks.map((task) => (
                  <label className="rk-cell-editor__task" key={task}>
                    <input
                      type="checkbox"
                      checked={tasks.includes(task)}
                      onChange={() => toggleTask(task)}
                    />
                    <span>{task}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rk-cell-editor__section">
              <div className="rk-cell-editor__heading-row">
                <p className="rk-cell-editor__heading">勤務メモ</p>
                <span className="rk-cell-editor__hint">{workMemo.length}/100</span>
              </div>
              <textarea
                className="rk-cell-editor__memo"
                placeholder="100文字以内で入力できます"
                value={workMemo}
                onChange={(event) => setWorkMemo(event.target.value.slice(0, 100))}
                rows={3}
              />
            </div>
          </>
        )}

        {tab === 'off' && (
          <div className="rk-cell-editor__section">
            <p className="rk-cell-editor__placeholder">この日のシフトを「休み」にします。保存すると割当が解除されます。</p>
          </div>
        )}

        <div className="rk-cell-editor__footer">
          <button type="button" className="rk-cell-editor__cancel" onClick={onClose}>キャンセル</button>
          <button
            type="button"
            className="rk-cell-editor__save"
            onClick={handleSave}
            disabled={tab !== 'off' && !presetSlot && !timeValid}
          >
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
}
