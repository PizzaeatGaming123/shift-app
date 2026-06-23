import type { Store } from '../../types';
import type { ManagerView } from './types';

interface ShiftToolbarProps {
  stores: Store[];
  storeId: string;
  positions: string[];
  position: string;
  view: ManagerView;
  periodLabel: string;
  deadlineLabel: string;
  /** シフト回収設定の対象月（"YYYY-MM"）。シフト表で表示中の月と異なる場合に注意ヒントを出すために使う。 */
  collectionMonth?: string;
  /** シフト表で現在表示中の月（"YYYY-MM"）。 */
  viewMonth?: string;
  unconfirmedCount: number;
  recruitmentCount: number;
  shiftMode: 'assignment' | 'confirmed';
  shiftStatus: 'DRAFT' | 'ADJUSTING' | 'CONFIRMED' | 'PUBLISHED' | 'CHANGING' | 'REPUBLISHED';
  onStoreChange: (storeId: string) => void;
  onPositionChange: (position: string) => void;
  onViewChange: (view: ManagerView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onConfirm: () => void;
  onPublish: () => void;
  onPrint: () => void;
  onOpenShiftTypes: () => void;
  onOpenDisplayItems: () => void;
  onOpenRecruitment: () => void;
  onShiftModeChange: (mode: 'assignment' | 'confirmed') => void;
}

const VIEW_OPTIONS: { value: ManagerView; label: string }[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '週' },
  { value: 'half-month', label: '半月' },
  { value: 'month', label: '月' },
];

export function ShiftToolbar({
  stores,
  storeId,
  positions,
  position,
  view,
  periodLabel,
  deadlineLabel,
  collectionMonth,
  viewMonth,
  unconfirmedCount,
  recruitmentCount,
  shiftMode,
  shiftStatus,
  onStoreChange,
  onPositionChange,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onConfirm,
  onPublish,
  onPrint,
  onOpenShiftTypes,
  onOpenDisplayItems,
  onOpenRecruitment,
  onShiftModeChange,
}: ShiftToolbarProps) {
  const confirmationLabel = unconfirmedCount > 0
    ? `シフト確定 未確定あり ${unconfirmedCount}件`
    : 'シフト確定 確定済み';

  return (
    <section className="rk-shift-toolbar" aria-label="シフト操作">
      <div className="rk-shift-toolbar__primary">
        <select
          aria-label="店舗"
          value={storeId}
          onChange={(event) => onStoreChange(event.target.value)}
        >
          {stores.map((store) => (
            <option value={store.id} key={store.id}>{store.name}</option>
          ))}
        </select>

        <select
          aria-label="ポジション"
          value={position}
          onChange={(event) => onPositionChange(event.target.value)}
        >
          {positions.map((item) => (
            <option value={item} key={item}>{item}</option>
          ))}
        </select>

        <button
          type="button"
          className="rk-shift-toolbar__confirm"
          aria-label={confirmationLabel}
          onClick={onConfirm}
        >
          <span>シフト確定</span>
          {unconfirmedCount > 0
            ? <span className="rk-shift-toolbar__warning">未確定あり {unconfirmedCount}件</span>
            : <span className="rk-shift-toolbar__confirmed">確定済み</span>}
        </button>
        <button
          type="button"
          className="rk-shift-toolbar__publish"
          disabled={shiftStatus !== 'CONFIRMED' && shiftStatus !== 'REPUBLISHED'}
          onClick={onPublish}
        >
          {shiftStatus === 'PUBLISHED' ? '公開済み' : 'スタッフへ公開'}
        </button>
        <button type="button" onClick={onPrint}>印刷</button>
        <button type="button" onClick={onOpenShiftTypes}>シフトの種類</button>
        <div className="rk-shift-mode-switch" aria-label="シフト表示">
          <button
            type="button"
            aria-pressed={shiftMode === 'assignment'}
            onClick={() => onShiftModeChange('assignment')}
          >
            希望確認・割り当て
          </button>
          <button
            type="button"
            aria-pressed={shiftMode === 'confirmed'}
            onClick={() => onShiftModeChange('confirmed')}
          >
            確定シフト
          </button>
        </div>
      </div>

      <div className="rk-shift-toolbar__secondary">
        <div className="rk-view-switch" aria-label="表示期間">
          {VIEW_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={view === option.value}
              onClick={() => onViewChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button type="button" aria-label="前へ" onClick={onPrevious}>‹</button>
        <button type="button" aria-label="次へ" onClick={onNext}>›</button>
        <span className="rk-shift-toolbar__period">{periodLabel}</span>
        <button type="button" onClick={onToday}>翌月</button>
        <span className="rk-shift-toolbar__deadline">提出期間 {deadlineLabel}</span>
        {collectionMonth && viewMonth && collectionMonth !== viewMonth && (
          <span className="rk-shift-toolbar__collection-hint">
            回収中：{collectionMonth.replace('-', '年')}月（表示中の月とは異なります）
          </span>
        )}
        <button type="button" onClick={onOpenDisplayItems}>表示項目設定</button>
        <button type="button" onClick={onOpenRecruitment}>
          追加募集中 {recruitmentCount}件
        </button>
      </div>
    </section>
  );
}
