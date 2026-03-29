import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { saveExitChips, getExitChips } from '../services/storage';
import Navbar from '../components/Navbar';
import PotSummary from '../components/PotSummary';
import './ActiveGame.css';

export default function ActiveGame() {
  const navigate = useNavigate();
  const {
    session, addBuyIn, removeBuyIn, updatePlayerBuyIns, addPlayer,
    setPlayerExitChips, clearPlayerExitChips,
  } = useGame();
  const [elapsed, setElapsed] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerBuyIns, setNewPlayerBuyIns] = useState(1);
  const [addError, setAddError] = useState('');
  const [editingBuyIn, setEditingBuyIn] = useState(null);
  const [editBuyInValue, setEditBuyInValue] = useState('');
  const [cashingOut, setCashingOut] = useState(null); // index of player showing exit input
  const [exitChipInput, setExitChipInput] = useState('');
  const [cashoutError, setCashoutError] = useState('');

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

  // Load persisted exit chips on mount
  useEffect(() => {
    if (!session) return;
    const saved = getExitChips(session.id);
    Object.entries(saved).forEach(([idx, chips]) => {
      const i = parseInt(idx, 10);
      if (session.players[i] && session.players[i].exitChips == null) {
        setPlayerExitChips(i, chips);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) {
    navigate('/new', { state: { toastMessage: 'No active session — start a new one' } });
    return null;
  }

  const handleBuyInEditStart = (index) => {
    setEditingBuyIn(index);
    setEditBuyInValue(String(session.players[index].buyIns));
  };

  const handleBuyInEditConfirm = (index) => {
    const parsed = parseInt(editBuyInValue, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      updatePlayerBuyIns(index, parsed);
      setEditingBuyIn(null);
    } else {
      // Invalid — shake and revert
      setEditBuyInValue(String(session.players[index].buyIns));
      const el = document.getElementById(`buyin-edit-input-${index}`);
      if (el) {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 400);
      }
    }
  };

  const handleBuyInEditKeyDown = (e, index) => {
    if (e.key === 'Enter') handleBuyInEditConfirm(index);
    if (e.key === 'Escape') setEditingBuyIn(null);
  };

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

  const handleCashOutStart = (index) => {
    setCashingOut(index);
    setExitChipInput('');
    setCashoutError('');
  };

  const handleCashOutConfirm = (index) => {
    const raw = exitChipInput.trim();
    if (raw === '') {
      setCashoutError('Enter a chip count');
      return;
    }
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) {
      setCashoutError('Must be a valid number');
      return;
    }
    if (parsed < 0) {
      setCashoutError('Chips cannot be negative');
      return;
    }
    if (!Number.isInteger(parsed)) {
      setCashoutError('Chips must be a whole number');
      return;
    }
    if (parsed > session.totalPotChips) {
      setCashoutError(`Cannot exceed pot (${session.totalPotChips.toLocaleString()} chips)`);
      return;
    }
    setCashoutError('');
    setPlayerExitChips(index, parsed);
    saveExitChips(session.id, index, parsed);
    setCashingOut(null);
    setExitChipInput('');
  };

  const handleCashOutUndo = (index) => {
    clearPlayerExitChips(index);
    saveExitChips(session.id, index, null);
  };

  const handleExitChipKeyDown = (e, index) => {
    if (e.key === 'Enter') handleCashOutConfirm(index);
    if (e.key === 'Escape') setCashingOut(null);
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
            const isCashedOut = player.exitChips != null;
            return (
              <div key={i} className={`game-player-card glass-card ${isCashedOut ? 'cashed-out' : ''}`}>
                <div className="game-player-main">
                  <div className="player-avatar">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="game-player-info">
                    <div className="player-name">
                      {player.name}
                      {isCashedOut && (
                        <span className="cashed-out-badge">CASHED OUT</span>
                      )}
                    </div>
                    <div className="player-stats text-secondary">
                      {player.buyIns} buy-in{player.buyIns > 1 ? 's' : ''} ·{' '}
                      <span className="text-gold">{player.totalChips.toLocaleString()} chips</span> ·{' '}
                      ₹{buyInRS}
                      {isCashedOut && (
                        <span className="exit-chips-display">
                          {' '}· Exit: {player.exitChips.toLocaleString()} chips
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Buy-in stepper — hidden when cashed out */}
                {!isCashedOut && (
                  <div className="buyin-stepper-row">
                    <button
                      className="btn btn-sm btn-secondary buyin-step-btn"
                      onClick={() => removeBuyIn(i)}
                      disabled={player.buyIns <= 1}
                      id={`btn-remove-buyin-${i}`}
                      title="Remove 1 buy-in"
                    >
                      −
                    </button>
                    {editingBuyIn === i ? (
                      <input
                        className="input buyin-edit-input"
                        id={`buyin-edit-input-${i}`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={editBuyInValue}
                        onChange={(e) => setEditBuyInValue(e.target.value)}
                        onBlur={() => handleBuyInEditConfirm(i)}
                        onKeyDown={(e) => handleBuyInEditKeyDown(e, i)}
                        autoFocus
                      />
                    ) : (
                      <button
                        className="buyin-count-btn"
                        onClick={() => handleBuyInEditStart(i)}
                        title="Click to edit buy-in count"
                        id={`btn-buyin-count-${i}`}
                      >
                        {player.buyIns}
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-secondary buyin-step-btn"
                      onClick={() => addBuyIn(i)}
                      id={`btn-add-buyin-${i}`}
                      title="Add 1 buy-in"
                    >
                      +
                    </button>
                    <button
                      className="btn btn-sm btn-ghost cashout-btn"
                      onClick={() => handleCashOutStart(i)}
                      id={`btn-cashout-${i}`}
                      title="Cash out this player"
                    >
                      💰 Cash Out
                    </button>
                  </div>
                )}

                {/* Cash-out inline input */}
                {cashingOut === i && !isCashedOut && (
                  <div className="cashout-input-section animate-fade-in">
                    <div className="cashout-input-row">
                      <label className="text-secondary">Exit Chips:</label>
                      <input
                        className={`input cashout-input ${cashoutError ? 'input-error' : ''}`}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max={session.totalPotChips}
                        placeholder="0"
                        value={exitChipInput}
                        onChange={(e) => { setExitChipInput(e.target.value); setCashoutError(''); }}
                        onKeyDown={(e) => handleExitChipKeyDown(e, i)}
                        id={`input-exit-chips-${i}`}
                        autoFocus
                      />
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleCashOutConfirm(i)}
                        id={`btn-confirm-cashout-${i}`}
                      >
                        ✓
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => { setCashingOut(null); setCashoutError(''); }}
                      >
                        ✕
                      </button>
                    </div>
                    {cashoutError && (
                      <div className="cashout-error" id="cashout-error">{cashoutError}</div>
                    )}
                  </div>
                )}

                {/* Undo cash-out */}
                {isCashedOut && (
                  <div className="cashout-undo-row">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleCashOutUndo(i)}
                      id={`btn-undo-cashout-${i}`}
                    >
                      ↩ Undo Cash Out
                    </button>
                  </div>
                )}
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
