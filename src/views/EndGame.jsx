import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import Navbar from '../components/Navbar';
import PotSummary from '../components/PotSummary';
import './EndGame.css';

export default function EndGame() {
  const navigate = useNavigate();
  const { session, setRemainingChips, calculateResults } = useGame();
  const [chipInputs, setChipInputs] = useState(
    () => {
      if (!session) return [];
      return session.players.map((p) =>
        p.exitChips != null ? String(p.exitChips) : ''
      );
    }
  );

  // On mount, sync pre-filled exit chips with the context's remainingChips
  useEffect(() => {
    if (!session) return;
    session.players.forEach((p, i) => {
      if (p.exitChips != null) {
        setRemainingChips(i, p.exitChips);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) {
    navigate('/new', { state: { toastMessage: 'No active session — start a new one' } });
    return null;
  }

  const handleChipChange = (index, value) => {
    const newInputs = [...chipInputs];
    newInputs[index] = value;
    setChipInputs(newInputs);

    const numVal = value === '' ? null : parseFloat(value);
    setRemainingChips(index, numVal);
  };

  const enteredChips = chipInputs.reduce((sum, v) => {
    const n = parseFloat(v);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const allFilled = chipInputs.every((v) => v !== '' && !isNaN(parseFloat(v)));
  const isMatching = Math.abs(enteredChips - session.totalPotChips) < 0.01;
  const difference = enteredChips - session.totalPotChips;

  const handleCalculate = () => {
    calculateResults();
    navigate('/results');
  };

  return (
    <>
      <Navbar title="End Game" onBack={() => navigate('/game')} />
      <div className="page">
        <PotSummary
          totalChips={session.totalPotChips}
          totalRS={session.totalPotRS}
          ratio={session.ratio}
          label="Expected Total"
        />

        <h2 className="endgame-title animate-fade-in-up">
          Enter Remaining Chips
        </h2>
        <p className="text-secondary mb-lg animate-fade-in-up">
          How many chips does each player have?
        </p>

        <div className="endgame-players stagger-children">
          {session.players.map((player, i) => (
            <div key={i} className="endgame-player glass-card">
              <div className="endgame-player-info">
                <div className="player-avatar">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="player-name">{player.name}</div>
                  <div className="text-secondary" style={{ fontSize: '0.8rem' }}>
                    {player.buyIns} buy-in{player.buyIns > 1 ? 's' : ''} ·{' '}
                    {player.totalChips.toLocaleString()} chips in
                  </div>
                </div>
              </div>
              <div className="endgame-input-wrapper">
                <input
                  className="input endgame-input"
                  type="number"
                  inputMode="numeric"
                  placeholder="Chips"
                  value={chipInputs[i]}
                  onChange={(e) => handleChipChange(i, e.target.value)}
                  id={`input-chips-${i}`}
                />
                {player.exitChips != null && (
                  <span className="prefilled-label text-secondary">(pre-filled)</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Validation */}
        <div className={`endgame-validation glass-card ${allFilled ? (isMatching ? 'valid' : 'invalid') : ''}`}>
          <div className="validation-row">
            <span className="text-secondary">Entered total:</span>
            <span className="validation-value">
              {enteredChips.toLocaleString()} chips
            </span>
          </div>
          <div className="validation-row">
            <span className="text-secondary">Expected total:</span>
            <span className="validation-value">
              {session.totalPotChips.toLocaleString()} chips
            </span>
          </div>
          {allFilled && (
            <div className="validation-status">
              {isMatching ? (
                <span className="text-green">✅ Totals match!</span>
              ) : (
                <span className="text-red">
                  ❌ Off by {difference > 0 ? '+' : ''}
                  {difference.toLocaleString()} chips
                </span>
              )}
            </div>
          )}
        </div>

        <button
          className="btn btn-primary btn-lg btn-full mt-lg"
          disabled={!allFilled || !isMatching}
          onClick={handleCalculate}
          id="btn-calculate-results"
        >
          Calculate Results
        </button>
      </div>
    </>
  );
}
