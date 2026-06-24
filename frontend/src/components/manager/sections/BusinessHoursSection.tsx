import { useSetting } from '../../../lib/settings';
import { useToast } from '../../ui/Toast';

interface BusinessHourDay {
  enabled: boolean;
  open: string;
  close: string;
}

export interface BusinessHoursSetting {
  days: BusinessHourDay[];
  breakStart: string;
  breakEnd: string;
  lastOrder: string;
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

export const DEFAULT_BUSINESS_HOURS: BusinessHoursSetting = {
  days: WEEKDAY_LABELS.map((label) => ({
    enabled: label !== '日',
    open: '07:00',
    close: '24:00',
  })),
  breakStart: '14:00',
  breakEnd: '15:00',
  lastOrder: '23:30',
};

export function businessHoursKey(storeId: number | string | null): string {
  return `akiyume-business-hours:${storeId}`;
}

interface Props {
  storeId: number | string | null;
}

export function BusinessHoursSection({ storeId }: Props) {
  const { showToast } = useToast();
  const [openHours, setOpenHours] = useSetting(
    `akiyume-hours:${storeId}`,
    { open: '09:00', close: '23:00' },
  );
  const [businessHours, setBusinessHours] = useSetting<BusinessHoursSetting>(
    businessHoursKey(storeId),
    DEFAULT_BUSINESS_HOURS,
  );
  const businessDays = businessHours.days.length === 7 ? businessHours.days : DEFAULT_BUSINESS_HOURS.days;

  return (
    <div className="rk-reference-panel rk-settings-page">
      <div className="rk-ref-toolbar">
        <label>
          <span>標準 開店</span>
          <input
            aria-label="標準開店時刻"
            value={openHours.open}
            inputMode="numeric"
            onChange={(event) => setOpenHours({ ...openHours, open: event.target.value })}
          />
        </label>
        <label>
          <span>標準 閉店</span>
          <input
            aria-label="標準閉店時刻"
            value={openHours.close}
            inputMode="numeric"
            onChange={(event) => setOpenHours({ ...openHours, close: event.target.value })}
          />
        </label>
        <button
          type="button"
          className="tb-btn"
          onClick={() => {
            const nextDays = businessDays.map((day) => ({
              ...day,
              open: openHours.open,
              close: openHours.close,
            }));
            setBusinessHours({ ...businessHours, days: nextDays });
            showToast('曜日別営業時間へ反映しました');
          }}
        >
          曜日へ反映
        </button>
      </div>

      <div className="rk-filter-card rk-settings-filter">
        <label>
          <span>休憩目安 開始</span>
          <input
            aria-label="休憩目安開始"
            value={businessHours.breakStart}
            inputMode="numeric"
            onChange={(event) => setBusinessHours({ ...businessHours, breakStart: event.target.value })}
          />
        </label>
        <label>
          <span>休憩目安 終了</span>
          <input
            aria-label="休憩目安終了"
            value={businessHours.breakEnd}
            inputMode="numeric"
            onChange={(event) => setBusinessHours({ ...businessHours, breakEnd: event.target.value })}
          />
        </label>
        <label>
          <span>ラストオーダー</span>
          <input
            aria-label="ラストオーダー"
            value={businessHours.lastOrder}
            inputMode="numeric"
            onChange={(event) => setBusinessHours({ ...businessHours, lastOrder: event.target.value })}
          />
        </label>
        <span className="rk-settings-note">24:00まで入力できます。打刻ではなくシフト作成用の営業時間です。</span>
      </div>

      <table className="rk-reference-table rk-settings-table">
        <thead>
          <tr>
            <th scope="col">曜日</th>
            <th scope="col">営業</th>
            <th scope="col">開店</th>
            <th scope="col">閉店</th>
            <th scope="col">シフト作成時の扱い</th>
          </tr>
        </thead>
        <tbody>
          {businessDays.map((day, index) => {
            const updateDay = (next: Partial<BusinessHourDay>) => {
              const nextDays = [...businessDays];
              nextDays[index] = { ...day, ...next };
              setBusinessHours({ ...businessHours, days: nextDays });
            };
            return (
              <tr key={WEEKDAY_LABELS[index]}>
                <th scope="row">{WEEKDAY_LABELS[index]}曜日</th>
                <td>
                  <label className="rk-plain-check">
                    <input
                      aria-label={`${WEEKDAY_LABELS[index]}曜日を営業日にする`}
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(event) => updateDay({ enabled: event.target.checked })}
                    />
                    営業
                  </label>
                </td>
                <td>
                  <input
                    aria-label={`${WEEKDAY_LABELS[index]}曜日の開店時刻`}
                    value={day.open}
                    inputMode="numeric"
                    disabled={!day.enabled}
                    onChange={(event) => updateDay({ open: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    aria-label={`${WEEKDAY_LABELS[index]}曜日の閉店時刻`}
                    value={day.close}
                    inputMode="numeric"
                    disabled={!day.enabled}
                    onChange={(event) => updateDay({ close: event.target.value })}
                  />
                </td>
                <td>{day.enabled ? `${day.open}〜${day.close}で人員配置` : '休日扱い'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
