import { useApp } from '../store/AppContext';

interface Props {
  monthTitle: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  tab: 'main' | 'shared';
  setTab: (t: 'main' | 'shared') => void;
  view: string;
  setView: (v: string) => void;
}

const VIEWS = ['日', '週', '半月', '月'];

export function ManagerToolbar({ monthTitle, onPrev, onNext, onToday, tab, setTab, view, setView }: Props) {
  const { stores, storeId, setStoreId } = useApp();
  return (
    <div className="mgr-toolbar">
      <div className="mtb-row">
        <select
          className="tb-select"
          value={storeId ?? ''}
          onChange={(e) => setStoreId(Number(e.target.value))}
          aria-label="店舗"
        >
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <details className="tb-dd">
          <summary>ポジション<span className="caret" aria-hidden="true" /></summary>
          <div className="tb-menu">
            <button type="button" className="nav-menu-item">ホール</button>
            <button type="button" className="nav-menu-item">キッチン</button>
          </div>
        </details>
        <button type="button" className="tb-btn primary" onClick={() => setTab('shared')}>
          シフト確定<span className="tb-badge">未確定あり</span>
        </button>
        <button type="button" className="tb-btn" onClick={() => window.print()}>印刷</button>
        <details className="tb-dd">
          <summary>シフトの種類<span className="caret" aria-hidden="true" /></summary>
          <div className="tb-menu">
            <button type="button" className="nav-menu-item">早番 / 中番 / 遅番</button>
            <button type="button" className="nav-menu-item">休み</button>
          </div>
        </details>
        <div className="tb-spacer" />
        <div className="seg2" role="tablist" aria-label="表示シフト">
          <button type="button" className={tab === 'main' ? 'active' : ''} onClick={() => setTab('main')}>希望確認・割り当て</button>
          <button type="button" className={tab === 'shared' ? 'active' : ''} onClick={() => setTab('shared')}>確定シフト</button>
        </div>
      </div>
      <div className="mtb-row">
        <div className="view-tabs" role="tablist" aria-label="表示単位">
          {VIEWS.map((v) => (
            <button key={v} type="button" className={view === v ? 'active' : ''} aria-selected={view === v} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
        <button type="button" className="tb-arrow" onClick={onPrev} aria-label="前の月">‹</button>
        <span className="tb-date">{monthTitle}</span>
        <button type="button" className="tb-arrow" onClick={onNext} aria-label="次の月">›</button>
        <button type="button" className="tb-btn sm" onClick={onToday}>今月</button>
        <span className="tb-period">提出期間 〜前月末 23:59</span>
        <button type="button" className="tb-btn sm">概要設定</button>
      </div>
    </div>
  );
}
