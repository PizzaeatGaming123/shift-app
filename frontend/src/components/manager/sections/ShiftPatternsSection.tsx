import { useSetting } from '../../../lib/settings';
import {
  DEFAULT_SHIFT_PATTERNS,
  isValidShiftPattern,
  shiftPatternHours,
  shiftPatternSettingKey,
  type ShiftPatterns,
} from '../../../lib/shiftPatterns';

interface Props {
  storeId: number | string | null;
}

export function ShiftPatternsSection({ storeId }: Props) {
  const [shiftPatterns, setStoredShiftPatterns] = useSetting<ShiftPatterns>(
    shiftPatternSettingKey(storeId),
    DEFAULT_SHIFT_PATTERNS,
  );

  return (
    <div className="rk-pattern-editor">
      <p className="muted-sm">
        ヒアリングで確認した勤務枠です。変更内容はスタッフ提出と予定時間集計へ反映されます。
      </p>
      <table className="rk-pattern-table">
        <thead>
          <tr>
            <th scope="col">シフトパターン</th>
            <th scope="col">開始</th>
            <th scope="col">終了</th>
            <th scope="col">予定時間</th>
          </tr>
        </thead>
        <tbody>
          {(['early', 'late'] as const).map((slot) => {
            const pattern = shiftPatterns[slot];
            const update = (next: Partial<(typeof pattern)>) => {
              const candidate = { ...pattern, ...next };
              setStoredShiftPatterns({
                ...shiftPatterns,
                [slot]: candidate,
              });
            };
            return (
              <tr key={slot}>
                <td>
                  <input
                    aria-label={`${slot === 'early' ? '早番' : '遅番'}の名称`}
                    value={pattern.label}
                    onChange={(event) => update({ label: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`${pattern.label}の開始時刻`}
                    value={pattern.start}
                    inputMode="numeric"
                    onChange={(event) => update({ start: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`${pattern.label}の終了時刻`}
                    value={pattern.end}
                    inputMode="numeric"
                    onChange={(event) => update({ end: event.target.value })}
                  />
                </td>
                <td>
                  {isValidShiftPattern(pattern)
                    ? `${shiftPatternHours(pattern).toFixed(1)}時間`
                    : <span className="alert-tag">時刻を確認</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        type="button"
        className="tb-btn"
        onClick={() => setStoredShiftPatterns(DEFAULT_SHIFT_PATTERNS)}
      >
        ヒアリング時の設定へ戻す
      </button>
    </div>
  );
}
