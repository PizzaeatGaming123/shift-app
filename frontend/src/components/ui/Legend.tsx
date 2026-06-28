export function Legend() {
  return (
    <div className="legend" aria-label="表示の凡例">
      <span className="legend-item"><span className="chip early">早番</span>早番希望</span>
      <span className="legend-item"><span className="chip late">遅番</span>遅番希望</span>
      <span className="legend-item"><span className="chip off">休み</span>休み希望</span>
      <span className="legend-item"><span className="dot low" />不足</span>
      <span className="legend-item"><span className="dot ok" />適正</span>
      <span className="legend-item"><span className="dot over" />過多</span>
    </div>
  );
}
