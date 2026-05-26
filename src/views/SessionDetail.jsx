import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession } from '../services/storage';
import { calculateSettlements } from '../utils/settlement';
import Navbar from '../components/Navbar';
import './SessionResults.css';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      setLoading(true);
      try {
        const data = await getSession(id);
        setSession(data);
      } catch (err) {
        console.error('Failed to load session details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar title="Session" />
        <div className="page text-center" style={{ padding: '48px 0' }}>
          <div className="spinner"></div>
          <p className="text-secondary mt-sm">Loading session details...</p>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Navbar title="Session" />
        <div className="page text-center">
          <div style={{ padding: '48px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🃏</div>
            <p>Session not found</p>
            <button
              className="btn btn-primary mt-lg"
              onClick={() => navigate('/')}
            >
              Go Home
            </button>
          </div>
        </div>
      </>
    );
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

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Navbar title={`Session #${session.sessionNumber}`} />
      <div className="page">
        {/* Header */}
        <div className="results-header animate-fade-in-up">
          <div className="results-session-num">Session #{session.sessionNumber}</div>
          <h1>Game Summary</h1>
          <p className="text-secondary" style={{ marginTop: '4px', fontSize: '0.85rem' }}>
            {formatDate(session.startTime)}
          </p>
        </div>

        {/* Stats */}
        <div className="results-stats glass-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="stat-item">
            <div className="stat-value text-gold">₹{session.totalPotRS?.toLocaleString()}</div>
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

        {/* Buy-in config */}
        <div className="glass-card animate-fade-in-up" style={{ padding: 'var(--sp-md)', marginBottom: 'var(--sp-lg)', textAlign: 'center', animationDelay: '150ms' }}>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>
            ₹{session.buyInAmount} per buy-in · {session.chipsPerBuyIn} chips · ₹1 = {session.ratio} chips
          </span>
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
                    {net >= 0 ? '+' : ''}₹{Math.round(net)}
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

        <button
          className="btn btn-secondary btn-full mt-lg"
          onClick={() => navigate('/')}
        >
          ← Back to Home
        </button>
      </div>
    </>
  );
}
