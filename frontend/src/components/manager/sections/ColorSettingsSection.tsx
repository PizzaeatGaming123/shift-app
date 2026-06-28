import { useSetting } from '../../../lib/settings';

export interface ShiftColorSettings {
  earlyBg: string;
  earlyText: string;
  lateBg: string;
  lateText: string;
  offBg: string;
  offText: string;
  requestBorder: string;
  shortageBg: string;
}

export const DEFAULT_SHIFT_COLORS: ShiftColorSettings = {
  earlyBg: '#fff0f0',
  earlyText: '#a65b5b',
  lateBg: '#e9f6ff',
  lateText: '#397aa9',
  offBg: '#f2f2f2',
  offText: '#777777',
  requestBorder: '#9fb6c8',
  shortageBg: '#fff4c7',
};

export function colorSettingKey(storeId: number | string | null): string {
  return `akiyume-shift-colors:${storeId}`;
}

interface Props {
  storeId: number | string | null;
}

export function ColorSettingsSection({ storeId }: Props) {
  const [shiftColors, setShiftColors] = useSetting<ShiftColorSettings>(
    colorSettingKey(storeId),
    DEFAULT_SHIFT_COLORS,
  );

  return (
    <div className="rk-reference-panel rk-settings-page">
      <p className="muted-sm">
        シフト表で使う色を店舗ごとに保存します。派手な装飾ではなく、一覧で見分けるための色だけを調整します。
      </p>
      <table className="rk-reference-table rk-settings-table rk-color-table">
        <thead>
          <tr>
            <th scope="col">項目</th>
            <th scope="col">背景</th>
            <th scope="col">文字・線</th>
            <th scope="col">表示例</th>
          </tr>
        </thead>
        <tbody>
          {([
            ['early', '早番', 'earlyBg', 'earlyText'],
            ['late', '遅番', 'lateBg', 'lateText'],
            ['off', '休み', 'offBg', 'offText'],
          ] as const).map(([key, label, bgKey, textKey]) => (
            <tr key={key}>
              <th scope="row">{label}</th>
              <td>
                <input
                  aria-label={`${label}の背景色`}
                  type="color"
                  value={shiftColors[bgKey]}
                  onChange={(event) => setShiftColors({ ...shiftColors, [bgKey]: event.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`${label}の文字色`}
                  type="color"
                  value={shiftColors[textKey]}
                  onChange={(event) => setShiftColors({ ...shiftColors, [textKey]: event.target.value })}
                />
              </td>
              <td>
                <span
                  className="rk-color-preview-chip"
                  style={{ background: shiftColors[bgKey], color: shiftColors[textKey], borderColor: shiftColors[textKey] }}
                >
                  {label}
                </span>
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row">希望シフトの枠線</th>
            <td colSpan={2}>
              <input
                aria-label="希望シフトの枠線色"
                type="color"
                value={shiftColors.requestBorder}
                onChange={(event) => setShiftColors({ ...shiftColors, requestBorder: event.target.value })}
              />
            </td>
            <td>
              <span
                className="rk-color-preview-chip is-request"
                style={{ borderColor: shiftColors.requestBorder }}
              >
                早番希望
              </span>
            </td>
          </tr>
          <tr>
            <th scope="row">不足・注意行</th>
            <td colSpan={2}>
              <input
                aria-label="不足注意行の背景色"
                type="color"
                value={shiftColors.shortageBg}
                onChange={(event) => setShiftColors({ ...shiftColors, shortageBg: event.target.value })}
              />
            </td>
            <td>
              <span className="rk-color-preview-cell" style={{ background: shiftColors.shortageBg }}>
                必要人数不足
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        className="tb-btn"
        onClick={() => setShiftColors(DEFAULT_SHIFT_COLORS)}
      >
        標準色へ戻す
      </button>
    </div>
  );
}
