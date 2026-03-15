import './PlayerCard.css';

export default function PlayerCard({
  player,
  session,
  index,
  onAddBuyIn,
  onRemove,
  showActions = false,
  compact = false,
}) {
  const buyInRS = player.buyIns * session.buyInAmount;

  return (
    <div className={`player-card glass-card ${compact ? 'compact' : ''}`}>
      <div className="player-card-main">
        <div className="player-avatar">
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div className="player-info">
          <div className="player-name">{player.name}</div>
          <div className="player-stats">
            <span>{player.buyIns} buy-in{player.buyIns > 1 ? 's' : ''}</span>
            <span className="dot">·</span>
            <span className="text-gold">{player.totalChips.toLocaleString()} chips</span>
            <span className="dot">·</span>
            <span className="text-secondary">₹{buyInRS}</span>
          </div>
        </div>
        {showActions && (
          <div className="player-actions">
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => onAddBuyIn?.(index)}
              title="Add 1 buy-in"
            >
              + Buy-in
            </button>
            {onRemove && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => onRemove(index)}
                title="Remove player"
                style={{ fontSize: '1rem', padding: '4px 8px' }}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
