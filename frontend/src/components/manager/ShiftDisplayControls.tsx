import { useState } from 'react';
import type {
  ShiftLayerVisibility,
  ShiftTableDensity,
} from './types';

export type ShiftBulkAction =
  | 'assign-requests'
  | 'confirm-visible'
  | 'clear-unassigned'
  | 'protect-off-requests';

export type ShiftCopyAction =
  | 'previous-month'
  | 'previous-week'
  | 'fixed-shifts'
  | 'same-weekday';

interface ShiftDisplayControlsProps {
  position: string;
  layers: ShiftLayerVisibility;
  density: ShiftTableDensity;
  onLayersChange: (layers: ShiftLayerVisibility) => void;
  onDensityChange: (density: ShiftTableDensity) => void;
  onBulkAction: (action: ShiftBulkAction) => void;
  onCopyPast: (action: ShiftCopyAction) => void;
}

type BooleanLayerKey = keyof Omit<ShiftLayerVisibility, 'visibleSlots'>;

const CHECKBOXES: { key: BooleanLayerKey; label: string }[] = [
  { key: 'pinHeader', label: '上部固定' },
  { key: 'onlyAssigned', label: '出勤者のみ' },
  { key: 'showPatterns', label: 'シフトパターン' },
  { key: 'showRequests', label: '希望シフト' },
  { key: 'showTasks', label: 'タスク' },
  { key: 'showNotes', label: '勤務メモ' },
  { key: 'showSummary', label: '集計' },
];

const DENSITY_ORDER: ShiftTableDensity[] = ['small', 'standard', 'large'];
const DENSITY_LABEL: Record<ShiftTableDensity, string> = {
  small: '小',
  standard: '標準',
  large: '大',
};

const BULK_ACTIONS: { action: ShiftBulkAction; label: string; detail: string }[] = [
  { action: 'assign-requests', label: '希望シフトを自動割り当て', detail: '表示期間の早番/遅番希望を反映' },
  { action: 'confirm-visible', label: '表示中のシフトを確定', detail: '今の表示範囲をまとめて確定' },
  { action: 'clear-unassigned', label: '未割り当てを空欄に戻す', detail: '調整中セルの整理' },
  { action: 'protect-off-requests', label: '休み希望を保護', detail: '休み希望日の割り当てを確認' },
];

const COPY_ACTIONS: { action: ShiftCopyAction; label: string; detail: string }[] = [
  { action: 'previous-month', label: '前月同期間からコピー', detail: '月次作成のたたき台' },
  { action: 'previous-week', label: '前週からコピー', detail: '週表示の繰り返し作成' },
  { action: 'fixed-shifts', label: '固定シフトを反映', detail: '登録済み固定条件を適用' },
  { action: 'same-weekday', label: '同じ曜日へコピー', detail: '曜日パターンを展開' },
];

export function ShiftDisplayControls({
  position,
  layers,
  density,
  onLayersChange,
  onDensityChange,
  onBulkAction,
  onCopyPast,
}: ShiftDisplayControlsProps) {
  const [openMenu, setOpenMenu] = useState<null | 'bulk' | 'copy'>(null);

  function chooseBulk(action: ShiftBulkAction) {
    setOpenMenu(null);
    onBulkAction(action);
  }

  function chooseCopy(action: ShiftCopyAction) {
    setOpenMenu(null);
    onCopyPast(action);
  }

  return (
    <section className="rk-shift-display-controls" aria-label="シフト表示設定">
      <span className="rk-shift-display-controls__position">{position}</span>

      {CHECKBOXES.map(({ key, label }) => (
        <label className="rk-shift-display-controls__check" key={key}>
          <input
            type="checkbox"
            checked={layers[key]}
            onChange={(event) => {
              onLayersChange({ ...layers, [key]: event.target.checked });
            }}
          />
          {label}
        </label>
      ))}

      <div
        className="rk-shift-display-controls__density"
        role="group"
        aria-label="縮小/拡大"
      >
        {DENSITY_ORDER.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={density === item}
            onClick={() => onDensityChange(item)}
          >
            {DENSITY_LABEL[item]}
          </button>
        ))}
      </div>
      <div className="rk-inline-menu">
        <button
          type="button"
          aria-expanded={openMenu === 'bulk'}
          onClick={() => setOpenMenu(openMenu === 'bulk' ? null : 'bulk')}
        >
          一括操作
        </button>
        {openMenu === 'bulk' && (
          <div className="rk-inline-menu__panel" role="menu" aria-label="一括操作メニュー">
            {BULK_ACTIONS.map((item) => (
              <button type="button" role="menuitem" key={item.action} onClick={() => chooseBulk(item.action)}>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="rk-inline-menu">
        <button
          type="button"
          aria-expanded={openMenu === 'copy'}
          onClick={() => setOpenMenu(openMenu === 'copy' ? null : 'copy')}
        >
          過去コピー
        </button>
        {openMenu === 'copy' && (
          <div className="rk-inline-menu__panel" role="menu" aria-label="過去コピーメニュー">
            {COPY_ACTIONS.map((item) => (
              <button type="button" role="menuitem" key={item.action} onClick={() => chooseCopy(item.action)}>
                <span>{item.label}</span>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
