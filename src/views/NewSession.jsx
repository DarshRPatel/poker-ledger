import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import Navbar from '../components/Navbar';
import './NewSession.css';

export default function NewSession() {
  const navigate = useNavigate();
  const { initSession } = useGame();
  const [buyInAmount, setBuyInAmount] = useState('');
  const [chipsPerBuyIn, setChipsPerBuyIn] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const amount = parseFloat(buyInAmount) || 0;
  const chips = parseFloat(chipsPerBuyIn) || 0;
  const ratio = amount > 0 ? chips / amount : 0;
  const isValid = amount >= 1 && chips >= 1;

  const isAmountInvalid = buyInAmount !== '' && amount < 1;
  const isChipsInvalid = chipsPerBuyIn !== '' && chips < 1;

  const handleNext = async () => {
    setIsLoading(true);
    await initSession({ buyInAmount: amount, chipsPerBuyIn: chips });
    setIsLoading(false);
    navigate('/players');
  };

  return (
    <>
      <Navbar title="New Session" />
      <div className="page">
        <div className="setup-header animate-fade-in-up">
          <div className="setup-icon">🃏</div>
          <h1>Session Setup</h1>
          <p className="text-secondary">Configure the buy-in for this game</p>
        </div>

        <div className="setup-form animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="input-group">
            <label htmlFor="buyInAmount">Buy-in Amount (₹)</label>
            <input
              id="buyInAmount"
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 100"
              value={buyInAmount}
              onChange={(e) => setBuyInAmount(e.target.value)}
              autoFocus
              min="1"
            />
            {isAmountInvalid && <span className="error-text text-sm mt-sm text-red">Buy-in must be at least ₹1</span>}
          </div>

          <div className="input-group">
            <label htmlFor="chipsPerBuyIn">Chips per Buy-in</label>
            <input
              id="chipsPerBuyIn"
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 500"
              value={chipsPerBuyIn}
              onChange={(e) => setChipsPerBuyIn(e.target.value)}
              min="1"
            />
            {isChipsInvalid && <span className="error-text text-sm mt-sm text-red">Chips must be at least 1</span>}
          </div>
        </div>

        {/* Ratio Display */}
        {isValid && (
          <div className="ratio-card glass-card animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="ratio-label">Playing at</div>
            <div className="ratio-value">
              <span className="text-green">₹1</span>
              <span className="ratio-eq">=</span>
              <span className="text-gold">{ratio} chips</span>
            </div>
            <div className="ratio-reverse">
              1 chip = ₹{(1 / ratio).toFixed(2)}
            </div>
          </div>
        )}

        <div className="setup-actions animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <button
            className="btn btn-primary btn-lg btn-full mt-md"
            onClick={handleNext}
            disabled={!isValid || isAmountInvalid || isChipsInvalid || isLoading}
            id="btn-next-players"
          >
            {isLoading ? 'Creating Session...' : 'Next: Add Players →'}
          </button>
        </div>
      </div>
    </>
  );
}
