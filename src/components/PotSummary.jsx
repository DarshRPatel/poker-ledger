import './PotSummary.css';

export default function PotSummary({ totalChips, totalRS, ratio, label }) {
  return (
    <div className="pot-summary glass-card">
      <div className="pot-label">{label || 'Total Pot'}</div>
      <div className="pot-values">
        <div className="pot-value-item">
          <span className="pot-value-number text-gold">{totalChips?.toLocaleString()}</span>
          <span className="pot-value-unit">chips</span>
        </div>
        <div className="pot-divider">|</div>
        <div className="pot-value-item">
          <span className="pot-value-number text-green">₹{totalRS?.toLocaleString()}</span>
          <span className="pot-value-unit">value</span>
        </div>
      </div>
      {ratio != null && (
        <div className="pot-ratio">
          ₹1 = {ratio} chips
        </div>
      )}
    </div>
  );
}
