import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import Navbar from '../components/Navbar';
import './PlayerEntry.css';

export default function PlayerEntry() {
  const navigate = useNavigate();
  const { session, addPlayer, removePlayer, updatePlayerBuyIns } = useGame();
  const [name, setName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState({});
  const [error, setError] = useState('');

  if (!session) {
    navigate('/new', { state: { toastMessage: 'No active session — start a new one' } });
    return null;
  }

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (session.players.length >= 10) {
      setError('Maximum 10 players allowed');
      return;
    }
    if (session.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Player already added');
      return;
    }
    addPlayer(trimmed);
    setName('');
    setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  const toggleAdvanced = (index) => {
    setShowAdvanced((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const canContinue = session.players.length >= 2;

  return (
    <>
      <Navbar title="Add Players" />
      <div className="page">
        <div className="player-entry-header animate-fade-in-up">
          <h2>Who's playing?</h2>
          <p className="text-secondary">
            Add players — each starts with 1 buy-in by default
          </p>
        </div>

        {/* Add Player Input */}
        <div className="add-player-row animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <input
            className="input"
            type="text"
            placeholder="Player name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            maxLength={20}
            id="input-player-name"
          />
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!name.trim()}
            id="btn-add-player"
          >
            + Add
          </button>
        </div>
        {error && <div className="entry-error">{error}</div>}
        <div className="player-count text-muted">
          {session.players.length}/10 players
        </div>

        {/* Player List */}
        <div className="player-entry-list stagger-children">
          {session.players.map((player, i) => (
            <div key={i} className="entry-player-card glass-card">
              <div className="entry-player-main">
                <div className="player-avatar">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="entry-player-info">
                  <div className="player-name">{player.name}</div>
                  <div className="player-stats text-secondary">
                    {player.buyIns} buy-in{player.buyIns > 1 ? 's' : ''} ·{' '}
                    <span className="text-gold">{player.totalChips} chips</span> ·{' '}
                    ₹{player.buyIns * session.buyInAmount}
                  </div>
                </div>
                <div className="entry-player-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleAdvanced(i)}
                    title="Custom buy-ins"
                  >
                    ⚙
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => removePlayer(i)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {showAdvanced[i] && (
                <div className="entry-advanced animate-fade-in">
                  <label className="text-muted">Buy-ins:</label>
                  <div className="buyin-stepper">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        updatePlayerBuyIns(i, Math.max(1, player.buyIns - 1))
                      }
                    >
                      −
                    </button>
                    <span className="buyin-count">{player.buyIns}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => updatePlayerBuyIns(i, player.buyIns + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Continue */}
        <button
          className="btn btn-primary btn-lg btn-full mt-lg"
          disabled={!canContinue}
          onClick={() => navigate('/summary')}
          id="btn-review-summary"
        >
          {canContinue
            ? 'Review Buy-in Summary →'
            : `Add ${2 - session.players.length} more player${
                2 - session.players.length > 1 ? 's' : ''
              }`}
        </button>
      </div>
    </>
  );
}
