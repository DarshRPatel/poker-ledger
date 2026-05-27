import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { saveSession } from '../services/storage';
import { calculateSettlements } from '../utils/settlement';
import Navbar from '../components/Navbar';
import ShareModal from '../components/ShareModal';
import './SessionResults.css';

// Duration presets in minutes
const DURATION_PRESETS = [
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '1 hr 30 min', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '2 hr 30 min', value: 150 },
  { label: '3 hr', value: 180 },
  { label: '3 hr 30 min', value: 210 },
  { label: '4 hr', value: 240 },
  { label: '5 hr', value: 300 },
  { label: '6 hr', value: 360 },
];

export default function SessionResults() {
  const navigate = useNavigate();
  const { session, updateDuration, reset, setStep } = useGame();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customDuration, setCustomDuration] = useState(false);
  const [customHrs, setCustomHrs] = useState('');
  const [customMins, setCustomMins] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const shareAreaRef = useRef(null);

  if (!session) {
    navigate('/');
    return null;
  }

  const totalBuyIns = session.players.reduce((s, p) => s + p.buyIns, 0);
  const sortedPlayers = [...session.players].sort(
    (a, b) => (b.netRS || 0) - (a.netRS || 0)
  );

  const settlements = calculateSettlements(
    session.players.map((p) => ({
      name: p.name,
      netRS: p.netRS || 0,
    }))
  );

  const formatDuration = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSession(session);
      setSaved(true);
      setTimeout(() => {
        reset();
        navigate('/');
      }, 1200);
    } catch (err) {
      console.error('Failed to save session:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDurationSelect = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setCustomDuration(true);
      // Pre-fill with current duration
      const h = Math.floor((session.durationMinutes || 0) / 60);
      const m = (session.durationMinutes || 0) % 60;
      setCustomHrs(h > 0 ? String(h) : '');
      setCustomMins(m > 0 ? String(m) : '');
    } else {
      setCustomDuration(false);
      updateDuration(parseInt(val, 10));
    }
  };

  const handleCustomDurationApply = () => {
    const h = parseInt(customHrs, 10) || 0;
    const m = parseInt(customMins, 10) || 0;
    const total = h * 60 + m;
    if (total > 0) {
      updateDuration(total);
    }
  };

  const handleBackToGame = () => {
    // Re-activate the session so user can continue
    setStep('active');
    navigate('/game');
  };

  // Check if current duration matches a preset
  const currentPreset = DURATION_PRESETS.find(
    (p) => p.value === session.durationMinutes
  );
  const selectValue = customDuration
    ? 'custom'
    : currentPreset
    ? String(currentPreset.value)
    : 'custom';

  return (
    <>
      <Navbar title="Results" showBack={false} />
      <div className="page">
        <div ref={shareAreaRef} className="share-capture-area" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="results-header animate-fade-in-up">
            <div className="results-session-num">Session #{session.sessionNumber}</div>
            <h1>Game Summary</h1>
          </div>

          {/* Stats Grid */}
          <div className="results-stats glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="stat-item">
              <div className="stat-value text-accent">₹{session.totalPotRS?.toLocaleString()}</div>
              <div className="stat-label">Total Pot</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{totalBuyIns}</div>
              <div className="stat-label">Buy-ins</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{session.players.length}</div>
              <div className="stat-label">Players</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatDuration(session.durationMinutes)}</div>
              <div className="stat-label">Duration</div>
            </div>
          </div>

          {/* Duration Editor — Dropdown + Custom */}
          <div className="duration-editor animate-fade-in-up" style={{ animationDelay: '150ms' }} data-html2canvas-ignore="true">
            <label className="duration-label">Adjust Duration</label>
            <select
              className="select"
              value={selectValue}
              onChange={handleDurationSelect}
              id="select-duration"
            >
              {DURATION_PRESETS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
              <option value="custom">Custom...</option>
            </select>

            {/* Custom duration input */}
            {customDuration && (
              <div className="custom-duration animate-fade-in">
                <div className="custom-duration-inputs">
                  <div className="input-group">
                    <label>Hours</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="0"
                      min="0"
                      max="24"
                      value={customHrs}
                      onChange={(e) => setCustomHrs(e.target.value)}
                      id="input-custom-hrs"
                    />
                  </div>
                  <div className="input-group">
                    <label>Minutes</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="0"
                      min="0"
                      max="59"
                      value={customMins}
                      onChange={(e) => setCustomMins(e.target.value)}
                      id="input-custom-mins"
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm custom-apply-btn"
                    onClick={handleCustomDurationApply}
                    disabled={!customHrs && !customMins}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <section className="results-section animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <h2 className="section-title">
              <span className="suit-accent suit-spade">♠</span> Leaderboard
            </h2>
            <div className="results-leaderboard glass-card">
              <div className="lb-header-row">
                <span className="lb-col-rank">#</span>
                <span className="lb-col-name">Player</span>
                <span className="lb-col-in">In (₹)</span>
                <span className="lb-col-out">Out (₹)</span>
                <span className="lb-col-net">Net</span>
              </div>
              {sortedPlayers.map((p, i) => {
                const buyInRS = p.buyIns * session.buyInAmount;
                const outRS = Math.round((p.remainingChips / session.ratio) * 100) / 100;
                const net = p.netRS || 0;
                return (
                  <div key={p.name} className={`lb-row ${i < 3 ? 'top-three' : ''}`}>
                    <span className="lb-col-rank">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                    <span className="lb-col-name">{p.name}</span>
                    <span className="lb-col-in text-secondary">₹{buyInRS}</span>
                    <span className="lb-col-out">₹{outRS}</span>
                    <span className={`lb-col-net ${net >= 0 ? 'profit' : 'loss'}`}>
                      {net >= 0 ? '+' : '-'}₹{Math.abs(Math.round(net))}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Settlements */}
          {settlements.length > 0 && (
            <section className="results-section animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <h2 className="section-title">
                <span className="suit-accent suit-heart">♥</span> Settlements
              </h2>
              <div className="settlements stagger-children">
                {settlements.map((s, i) => (
                  <div key={i} className="settlement-card glass-card">
                    <div className="settlement-from">{s.from}</div>
                    <div className="settlement-arrow">
                      <span className="arrow-line" />
                      <span className="settlement-amount">₹{s.amount}</span>
                      <span className="arrow-head">→</span>
                    </div>
                    <div className="settlement-to">{s.to}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Action Buttons */}
        <div className="results-actions" data-html2canvas-ignore="true">
          <button
            className="btn btn-secondary btn-lg btn-full"
            onClick={handleBackToGame}
            disabled={saved || saving}
            id="btn-back-to-game"
          >
            ← Back to Game
          </button>
          <button
            className="btn btn-secondary btn-lg btn-full"
            onClick={() => setShareModalOpen(true)}
            id="btn-share-results"
          >
            🔗 Share Results
          </button>
          <button
            className={`btn btn-lg btn-full ${saved ? 'btn-saved' : 'btn-primary'}`}
            onClick={handleSave}
            disabled={saved || saving}
            id="btn-save-session"
          >
            {saved ? '✓ Session Saved!' : saving ? '💾 Saving...' : '💾 Save Session'}
          </button>
        </div>
      </div>
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        session={session}
        settlements={settlements}
        captureRef={shareAreaRef}
      />
    </>
  );
}
