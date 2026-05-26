import { useNavigate } from 'react-router-dom';
import { getSessions, getLeaderboard, deleteSession } from '../services/storage';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ConfirmModal from '../components/ConfirmModal';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sessionsData, leaderboardData] = await Promise.all([
          getSessions(),
          getLeaderboard()
        ]);
        setSessions(sessionsData);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error('Failed to load ledger data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const requestDelete = (id) => {
    setSessionToDelete(id);
  };

  const confirmDelete = async () => {
    if (sessionToDelete) {
      setLoading(true);
      try {
        await deleteSession(sessionToDelete);
        const [sessionsData, leaderboardData] = await Promise.all([
          getSessions(),
          getLeaderboard()
        ]);
        setSessions(sessionsData);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error('Failed to delete session:', err);
      } finally {
        setSessionToDelete(null);
        setLoading(false);
      }
    }
  };

  const cancelDelete = () => {
    setSessionToDelete(null);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDuration = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <>
      <Navbar />
      <div className="page">
        {/* Hero CTA */}
        <div className="home-hero animate-fade-in-up">
          <div className="hero-suits">
            <span className="suit-accent suit-spade">♠</span>
            <span className="suit-accent suit-heart">♥</span>
            <span className="suit-accent suit-diamond">♦</span>
            <span className="suit-accent suit-club">♣</span>
          </div>
          <h1>Ready to deal?</h1>
          <p className="text-secondary">Track your poker sessions like a pro.</p>
          <button
            className="btn btn-primary btn-lg btn-full mt-lg"
            onClick={() => navigate('/new')}
            id="btn-new-session"
          >
            🃏 New Session
          </button>
        </div>

        {loading ? (
          <div className="text-center animate-fade-in" style={{ padding: 'var(--sp-2xl) 0' }}>
            <div className="spinner"></div>
            <p className="text-secondary">Loading ledger data...</p>
          </div>
        ) : (
          <>
            {/* All-Time Leaderboard */}
            {leaderboard.length > 0 && (
              <section className="home-section animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <h2 className="section-title">
                  <span className="suit-accent suit-spade">♠</span> All-Time Leaderboard
                </h2>
                <div className="leaderboard glass-card">
                  <div className="leaderboard-header">
                    <span className="lb-rank">#</span>
                    <span className="lb-name">Player</span>
                    <span className="lb-sessions">Games</span>
                    <span className="lb-net">Net</span>
                  </div>
                  {leaderboard.map((p, i) => (
                    <div
                      key={p.name}
                      className={`leaderboard-row ${i < 3 ? 'top-three' : ''}`}
                    >
                      <span className="lb-rank">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                      <span className="lb-name">{p.name}</span>
                      <span className="lb-sessions">{p.sessionsPlayed}</span>
                      <span className={`lb-net ${p.totalNet >= 0 ? 'profit' : 'loss'}`}>
                        {p.totalNet >= 0 ? '+' : ''}₹{Math.round(p.totalNet)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Past Sessions */}
            <section className="home-section animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <h2 className="section-title">
                <span className="suit-accent suit-heart">♥</span> Past Sessions
              </h2>
              {sessions.length === 0 ? (
                <div className="empty-state glass-card">
                  <div className="empty-icon">🃏</div>
                  <p>No sessions yet.</p>
                  <p className="text-muted">Start your first game above!</p>
                </div>
              ) : (
                <div className="session-list stagger-children">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="session-card glass-card"
                      onClick={() => navigate(`/session/${s.id}`)}
                      role="button"
                      tabIndex={0}
                      id={`session-card-${s.id}`}
                    >
                      <div className="session-card-top">
                        <div className="session-number">#{s.sessionNumber}</div>
                        <div className="session-date">{formatDate(s.startTime)}</div>
                      </div>
                      <div className="session-card-body">
                        <div className="session-stat">
                          <span className="stat-value text-gold">₹{s.totalPotRS?.toLocaleString()}</span>
                          <span className="stat-label">pot</span>
                        </div>
                        <div className="session-stat">
                          <span className="stat-value">{s.players?.length}</span>
                          <span className="stat-label">players</span>
                        </div>
                        <div className="session-stat">
                          <span className="stat-value">{formatDuration(s.durationMinutes)}</span>
                          <span className="stat-label">duration</span>
                        </div>
                      </div>
                      <div className="session-card-footer">
                        <span className={`badge ${s.status === 'completed' ? 'badge-profit' : 'badge-gold'}`}>
                          {s.status === 'completed' ? '✓ Completed' : '● Active'}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDelete(s.id);
                          }}
                          title="Delete session"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Delete Session?"
        message="Are you sure you want to permanently delete this session? This will remove all associated P&L data from the leaderboard. This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </>
  );
}
