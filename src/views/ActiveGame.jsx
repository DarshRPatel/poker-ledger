import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import Navbar from '../components/Navbar';
import PotSummary from '../components/PotSummary';
import './ActiveGame.css';

export default function ActiveGame() {
  const navigate = useNavigate();
  const { session, addBuyIn, addPlayer } = useGame();
  const [elapsed, setElapsed] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerBuyIns, setNewPlayerBuyIns] = useState(1);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const start = new Date(session.startTime).getTime();
      const now = Date.now();
      const diffMs = now - start;
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      setElapsed(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session]);

  if (!session) {
    navigate('/new');
    return null;
  }

  const handleAddNewPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (session.players.length >= 10) {
      setAddError('Max 10 players');
      return;
    }
    if (session.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setAddError('Player already exists');
      return;
    }
    addPlayer(trimmed, newPlayerBuyIns);
    setNewPlayerName('');
    setNewPlayerBuyIns(1);
    setShowAddPlayer(false);
    setAddError('');
  };

  return (
    <>
      <Navbar title="Game in Progress" />
      <div className="page">
        {/* Elapsed Time */}
        <div className="game-timer animate-fade-in">
          <span className="timer-icon">⏱</span>
          <span className="timer-value">{elapsed}</span>
        </div>

        {/* Pot Summary */}
        <PotSummary
          totalChips={session.totalPotChips}
          totalRS={session.totalPotRS}
          ratio={session.ratio}
        />

        {/* Player List */}
        <div className="game-players stagger-children">
          {session.players.map((player, i) => {
            const buyInRS = player.buyIns * session.buyInAmount;
            return (
              <div key={i} className="game-player-card glass-card">
                <div className="game-player-main">
                  <div className="player-avatar">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="game-player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-stats text-secondary">
                      {player.buyIns} buy-in{player.buyIns > 1 ? 's' : ''} ·{' '}
                      <span className="text-gold">{player.totalChips.toLocaleString()} chips</span> ·{' '}
                      ₹{buyInRS}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => addBuyIn(i)}
                    id={`btn-add-buyin-${i}`}
                  >
                    + Buy-in
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Player */}
        {!showAddPlayer ? (
          <button
            className="btn btn-secondary btn-full mt-md"
            onClick={() => setShowAddPlayer(true)}
            id="btn-show-add-player"
          >
            + Add New Player
          </button>
        ) : (
          <div className="add-player-form glass-card mt-md animate-fade-in">
            <h3>Add Player Mid-Game</h3>
            <div className="add-player-fields">
              <input
                className="input"
                placeholder="Player name"
                value={newPlayerName}
                onChange={(e) => {
                  setNewPlayerName(e.target.value);
                  setAddError('');
                }}
                id="input-new-mid-player"
              />
              <div className="buyin-picker">
                <label className="text-muted">Buy-ins:</label>
                <div className="buyin-stepper">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setNewPlayerBuyIns(Math.max(1, newPlayerBuyIns - 1))}
                  >
                    −
                  </button>
                  <span className="buyin-count">{newPlayerBuyIns}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setNewPlayerBuyIns(newPlayerBuyIns + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            {addError && <div className="entry-error">{addError}</div>}
            <div className="add-player-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowAddPlayer(false);
                  setAddError('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddNewPlayer}
                disabled={!newPlayerName.trim()}
                id="btn-confirm-add-player"
              >
                Add Player
              </button>
            </div>
          </div>
        )}

        {/* End Game */}
        <div className="divider" />
        <button
          className="btn btn-danger btn-lg btn-full"
          onClick={() => navigate('/endgame')}
          id="btn-end-game"
        >
          End Game →
        </button>
      </div>
    </>
  );
}
