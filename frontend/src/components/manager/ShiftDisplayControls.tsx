import type {
  ShiftLayerVisibility,
  ShiftTableDensity,
} from './types';

interface ShiftDisplayControlsProps {
  position: string;
  layers: ShiftLayerVisibility;
  density: ShiftTableDensity;
  onLayersChange: (layers: ShiftLayerVisibility) => void;
  onDensityChange: (density: ShiftTableDensity) => void;
  onBulkAction: () => void;
  onCopyPast: () => void;
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

function nextValue<T>(values: T[], current: T): T {
  const index = values.indexOf(current);
  return values[(index + 1) % values.length];
}

export function ShiftDisplayControls({
  position,
  layers,
  density,
  onLayersChange,
  onDensityChange,
  onBulkAction,
  onCopyPast,
}: ShiftDisplayControlsProps) {
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

      <button
        type="button"
        onClick={() => onDensityChange(nextValue(DENSITY_ORDER, density))}
      >
        縮小/拡大 {DENSITY_LABEL[density]}
      </button>
      <button type="button" onClick={onBulkAction}>一括操作</button>
      <button type="button" onClick={onCopyPast}>過去コピー</button>
    </section>
  );
}
