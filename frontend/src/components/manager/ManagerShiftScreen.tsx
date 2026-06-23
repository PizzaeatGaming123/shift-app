import { useEffect, useMemo, useState } from 'react';
import { DAILY_SALES_TARGET } from '../../constants';
import { getMonthDates, shiftMonth } from '../../lib/date';
import { useSetting } from '../../lib/settings';
import { useApp } from '../../store/AppContext';
import type {
  Assignment,
  Recruitment,
  ShiftRequest,
  WorkSlot,
} from '../../types';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { DayTimeline } from './DayTimeline';
import { ShiftDisplayControls } from './ShiftDisplayControls';
import { ShiftTable } from './ShiftTable';
import type { SummaryItemKey } from './ShiftTableSummaryRows';
import { ShiftToolbar } from './ShiftToolbar';
import { getManagerDateWindow } from './shiftViewModel';
import { DEFAULT_WEEKDAY_REQUIRED, requiredForDate } from './modelShift';
import { ShiftConfirmDialog } from './ShiftConfirmDialog';
import {
  DEFAULT_SHIFT_PATTERNS,
  normalizeShiftPatterns,
  shiftPatternHours,
  shiftPatternSettingKey,
} from '../../lib/shiftPatterns';
import {
  shiftStatusSettingKey,
  type ShiftPlanStatus,
} from '../../lib/shiftStatus';
import {
  collectionSettingKey,
  createDefaultCollectionSettings,
} from '../../lib/collectionSettings';
import {
  DEFAULT_SHIFT_LAYERS,
  type ManagerView,
  type ShiftTableDensity,
  type StaffSortMode,
} from './types';

interface ManagerShiftScreenProps {
  homeSignal?: number;
}

const SUMMARY_OPTIONS: { key: SummaryItemKey; label: string }[] = [
  { key: 'sales', label: '売上計画' },
  { key: 'salesPerHour', label: '人時売上高' },
  { key: 'workHours', label: '総労働時間' },
  { key: 'laborCost', label: '人件費' },
  { key: 'modelShift', label: '全体モデルシフト' },
  { key: 'rankTotal', label: 'ランク計' },
  { key: 'storeNote', label: '店舗メモ' },
  { key: 'positionNote', label: 'ポジションメモ' },
];

function toDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatManagerPeriodLabel(
  view: ManagerView,
  dates: string[],
): string {
  if (dates.length === 0) return '';
  const first = toDate(dates[0]);
  if (view === 'month') {
    return `${first.getFullYear()}年 ${first.getMonth() + 1}月`;
  }
  if (view === 'day') {
    return `${first.getFullYear()}年 ${first.getMonth() + 1}月${first.getDate()}日`;
  }
  const last = toDate(dates[dates.length - 1]);
  return `${first.getFullYear()}年 ${first.getMonth() + 1}月${first.getDate()}日`
    + `〜${last.getMonth() + 1}月${last.getDate()}日`;
}

export function countUnconfirmedAssignments(
  requests: ShiftRequest[],
  assignments: Assignment[],
  dates: string[],
): number {
  const visibleDates = new Set(dates);
  return requests.filter((request) => {
    if (!visibleDates.has(request.date) || request.slot === 'off') return false;
    return !assignments.some(
      (assignment) =>
        assignment.date === request.date
        && assignment.slot === request.slot
        && assignment.staffIds.includes(request.staffId),
    );
  }).length;
}

export function countActiveRecruitments(
  recruitments: Recruitment[],
  dates: string[],
): number {
  const visibleDates = new Set(dates);
  return recruitments.filter(
    (item) => visibleDates.has(item.date) && item.message.trim().length > 0,
  ).length;
}

export function ManagerShiftScreen({
  homeSignal = 0,
}: ManagerShiftScreenProps) {
  const {
    stores,
    storeId,
    setStoreId,
    month,
    setMonth,
    staff,
    requests,
    assignments,
    dayNotes,
    storeNotes,
    recruitments,
    toggleAssignment,
    setStoreNote,
    bulkAssignRequested,
  } = useApp();
  const { showToast } = useToast();
  const [view, setView] = useState<ManagerView>('month');
  const [anchorDate, setAnchorDate] = useState(`${month}-01`);
  const [position, setPosition] = useState('ホール');
  const [layers, setLayers] = useState(DEFAULT_SHIFT_LAYERS);
  const [density, setDensity] = useSetting<ShiftTableDensity>(
    'akiyume-display-density',
    'standard',
  );
  const [sortMode, setSortMode] = useState<StaffSortMode>('default');
  const [shiftMode, setShiftMode] = useState<'assignment' | 'confirmed'>(
    'assignment',
  );
  const [shiftTypesOpen, setShiftTypesOpen] = useState(false);
  const [displayItemsOpen, setDisplayItemsOpen] = useState(false);
  const [recruitmentOpen, setRecruitmentOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [visibleSummaryItems, setVisibleSummaryItems] = useState<SummaryItemKey[]>(
    SUMMARY_OPTIONS.map((item) => item.key),
  );
  const [positionNotes, setPositionNotes] = useSetting<Record<string, string>>(
    `akiyume-position-notes:${storeId}:${position}`,
    {},
  );
  const [weekdayModel] = useSetting(
    `akiyume-model:${storeId}:${position}`,
    DEFAULT_WEEKDAY_REQUIRED,
  );
  const requiredByBand = (date: string) => requiredForDate(weekdayModel, date);
  const [salesTarget] = useSetting(
    `akiyume-sales:${storeId}`,
    DAILY_SALES_TARGET,
  );
  const [storedCollection] = useSetting(
    collectionSettingKey(storeId),
    createDefaultCollectionSettings(month),
  );
  const collection = {
    ...createDefaultCollectionSettings(month),
    ...storedCollection,
  };
  const shiftStatusKey = shiftStatusSettingKey(storeId, month);
  const [shiftStatus, setShiftStatus] = useSetting<ShiftPlanStatus>(
    shiftStatusKey,
    'DRAFT',
  );
  const effectiveShiftStatus: ShiftPlanStatus = localStorage.getItem(shiftStatusKey) === null
    && assignments.some((assignment) => assignment.staffIds.length > 0)
    ? 'PUBLISHED'
    : shiftStatus;
  const [storedShiftPatterns] = useSetting(
    shiftPatternSettingKey(storeId),
    DEFAULT_SHIFT_PATTERNS,
  );
  const shiftPatterns = normalizeShiftPatterns(storedShiftPatterns);
  const slotHours: Record<WorkSlot, number> = {
    early: shiftPatternHours(shiftPatterns.early),
    late: shiftPatternHours(shiftPatterns.late),
  };

  const [year, monthNumber] = month.split('-').map(Number);
  const monthDates = useMemo(
    () => getMonthDates(year, monthNumber),
    [year, monthNumber],
  );
  const dates = getManagerDateWindow({ monthDates, view, anchorDate });
  const visibleStaff = staff.filter((person) => person.role === 'STAFF');
  const unconfirmedCount = countUnconfirmedAssignments(
    requests,
    assignments,
    dates,
  );
  const recruitmentCount = countActiveRecruitments(recruitments, dates);

  useEffect(() => {
    setAnchorDate((current) => (
      current.startsWith(month) ? current : `${month}-01`
    ));
  }, [month]);

  useEffect(() => {
    if (homeSignal === 0) return;
    // シフト作成は通常「翌月分」を準備する運用なので、ホームに戻る際は翌月へリセットする
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setMonth(nextMonth);
    setAnchorDate(`${nextMonth}-01`);
    setView('month');
  }, [homeSignal, setMonth]);

  function moveManagerPeriod(direction: -1 | 1) {
    if (view === 'month') {
      const next = shiftMonth(year, monthNumber, direction);
      const nextMonth = `${next.year}-${String(next.month).padStart(2, '0')}`;
      setMonth(nextMonth);
      setAnchorDate(`${nextMonth}-01`);
      return;
    }

    if (view === 'half-month') {
      const day = Number(anchorDate.slice(8, 10));
      if (direction === 1 && day <= 15) {
        setAnchorDate(`${month}-16`);
        return;
      }
      if (direction === -1 && day > 15) {
        setAnchorDate(`${month}-01`);
        return;
      }
      const next = shiftMonth(year, monthNumber, direction);
      const nextMonth = `${next.year}-${String(next.month).padStart(2, '0')}`;
      setMonth(nextMonth);
      setAnchorDate(`${nextMonth}-${direction === 1 ? '01' : '16'}`);
      return;
    }

    const nextDate = toDate(anchorDate);
    nextDate.setDate(nextDate.getDate() + direction * (view === 'week' ? 7 : 1));
    const nextAnchor = toIsoDate(nextDate);
    const nextMonth = nextAnchor.slice(0, 7);
    if (nextMonth !== month) setMonth(nextMonth);
    setAnchorDate(nextAnchor);
  }

  function goToNextMonth() {
    // シフト作成は翌月分が中心。「翌月」ボタンでは実時計の翌月へジャンプする。
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setMonth(nextMonth);
    setAnchorDate(`${nextMonth}-01`);
  }

  function editStoreNote(date: string, current: string) {
    const next = window.prompt(`${date}の店舗メモ`, current);
    if (next !== null && next.trim() !== current) {
      void setStoreNote(date, next.trim());
    }
  }

  function editPositionNote(date: string, current: string) {
    const next = window.prompt(`${date}のポジションメモ`, current);
    if (next !== null) {
      setPositionNotes({ ...positionNotes, [date]: next.trim() });
    }
  }

  function confirmShift(selection: { positions: string[]; dates: string[] }) {
    setShiftStatus('CONFIRMED');
    const positionsLabel = selection.positions.length === 0
      ? 'すべてのポジション'
      : selection.positions.join('・');
    showToast(`${positionsLabel}・${selection.dates.length}日分を確定しました`);
  }

  function publishShift() {
    setShiftStatus(effectiveShiftStatus === 'PUBLISHED' ? 'REPUBLISHED' : 'PUBLISHED');
    setPublishOpen(false);
    showToast('シフトをスタッフへ公開しました');
  }

  async function runBulkAssignment() {
    const count = await bulkAssignRequested(dates);
    showToast(`${count}件の希望シフトを割り当てました`);
  }

  function openAssignmentEditor(
    staffId: string,
    date: string,
    slot: WorkSlot,
  ) {
    void toggleAssignment(date, slot, staffId, true);
  }

  return (
    <main className="rk-manager">
      <ShiftToolbar
        stores={stores}
        storeId={String(storeId ?? '')}
        positions={['ホール', 'キッチン']}
        position={position}
        view={view}
        periodLabel={formatManagerPeriodLabel(view, dates)}
        deadlineLabel={`〜${collection.deadlineAt.replace('T', ' ')}`}
        collectionMonth={collection.targetMonth}
        viewMonth={month}
        unconfirmedCount={unconfirmedCount}
        recruitmentCount={recruitmentCount}
        shiftMode={shiftMode}
        shiftStatus={effectiveShiftStatus}
        onStoreChange={(id) => setStoreId(Number(id))}
        onPositionChange={setPosition}
        onViewChange={(nextView) => {
          setView(nextView);
          if (!anchorDate.startsWith(month)) setAnchorDate(`${month}-01`);
        }}
        onPrevious={() => moveManagerPeriod(-1)}
        onNext={() => moveManagerPeriod(1)}
        onToday={goToNextMonth}
        onConfirm={() => setConfirmOpen(true)}
        onPublish={() => setPublishOpen(true)}
        onPrint={() => window.print()}
        onOpenShiftTypes={() => setShiftTypesOpen(true)}
        onOpenDisplayItems={() => setDisplayItemsOpen(true)}
        onOpenRecruitment={() => setRecruitmentOpen(true)}
        onShiftModeChange={(nextMode) => {
          setShiftMode(nextMode);
          setLayers((current) => ({
            ...current,
            showRequests: nextMode === 'assignment',
            showNotes: nextMode === 'assignment',
          }));
        }}
      />

      <ShiftDisplayControls
        position={position}
        layers={layers}
        density={density}
        onLayersChange={setLayers}
        onDensityChange={setDensity}
        onBulkAction={() => void runBulkAssignment()}
        onCopyPast={() => showToast('過去シフトのコピー対象を選択してください')}
      />

      {view === 'day' ? (
        <DayTimeline
          date={dates[0]}
          startHour={7}
          endHour={24}
          staff={visibleStaff}
          assignments={assignments}
          onAdjust={openAssignmentEditor}
        />
      ) : (
        <ShiftTable
          dates={dates}
          staff={visibleStaff}
          requests={requests}
          assignments={assignments}
          notes={dayNotes}
          storeNotes={storeNotes}
          positionNotes={positionNotes}
          layers={layers}
          density={density}
          sortMode={sortMode}
          salesTarget={salesTarget}
          requiredByBand={requiredByBand}
          visibleSummaryItems={visibleSummaryItems}
          onToggleAssignment={(date, slot, staffId, assigned) =>
            void toggleAssignment(date, slot, staffId, assigned)}
          onStoreNoteChange={editStoreNote}
          onPositionNoteChange={editPositionNote}
          onSortChange={setSortMode}
          slotHours={slotHours}
        />
      )}

      <ShiftConfirmDialog
        open={confirmOpen}
        storeName={stores.find((s) => String(s.id) === String(storeId))?.name ?? '店舗'}
        positions={['ホール', 'キッチン']}
        dates={dates}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmShift}
      />

      <Modal
        open={publishOpen}
        title="シフト公開"
        onClose={() => setPublishOpen(false)}
      >
        <p>確定したシフトをスタッフ画面へ公開します。</p>
        <p className="muted-sm">公開後の変更は、変更理由と対象スタッフの確認状態を記録する運用になります。</p>
        <button type="button" onClick={publishShift}>スタッフへ公開する</button>
      </Modal>

      <Modal
        open={shiftTypesOpen}
        title="シフトの種類"
        onClose={() => setShiftTypesOpen(false)}
      >
        {([
          ['early', '早番'],
          ['late', '遅番'],
          ['off', '休'],
        ] as const).map(([slot, label]) => (
          <label className="rk-dialog-check" key={slot}>
            <input
              type="checkbox"
              checked={layers.visibleSlots[slot]}
              onChange={(event) => setLayers({
                ...layers,
                visibleSlots: {
                  ...layers.visibleSlots,
                  [slot]: event.target.checked,
                },
              })}
            />
            {label}
          </label>
        ))}
      </Modal>

      <Modal
        open={displayItemsOpen}
        title="表示項目設定"
        onClose={() => setDisplayItemsOpen(false)}
      >
        {SUMMARY_OPTIONS.map((item) => (
          <label className="rk-dialog-check" key={item.key}>
            <input
              type="checkbox"
              checked={visibleSummaryItems.includes(item.key)}
              onChange={(event) => setVisibleSummaryItems(
                event.target.checked
                  ? [...visibleSummaryItems, item.key]
                  : visibleSummaryItems.filter((key) => key !== item.key),
              )}
            />
            {item.label}
          </label>
        ))}
      </Modal>

      <Modal
        open={recruitmentOpen}
        title="追加募集"
        onClose={() => setRecruitmentOpen(false)}
      >
        {recruitmentCount === 0 ? (
          <p>表示期間に追加募集はありません。</p>
        ) : (
          <ul>
            {recruitments
              .filter((item) => dates.includes(item.date) && item.message.trim())
              .map((item) => (
                <li key={item.date}>{item.date}　{item.message}</li>
              ))}
          </ul>
        )}
      </Modal>
    </main>
  );
}
