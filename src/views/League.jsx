import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { supabase } from '../services/supabaseClient';
import { getSessionsByHost, calculateLeaderboard } from '../services/storage';
import Navbar from '../components/Navbar';
import './League.css';

export default function League() {
  const { hostId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useGame();
  const [sessions, setSessions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [claims, setClaims] = useState({}); // { playerNameInLowercase: userId }
  const [loading, setLoading] = useState(true);
  const [claimingName, setClaimingName] = useState('');

  useEffect(() => {
    async function loadLeagueData() {
      setLoading(true);
      try {
        const hostSessions = await getSessionsByHost(hostId);
        setSessions(hostSessions);
        setLeaderboard(calculateLeaderboard(hostSessions));

        // Fetch player claims for this league
        const { data: claimsData } = await supabase
          .from('player_claims')
          .select('player_name, user_id')
          .eq('host_id', hostId);

        const claimsMap = {};
        if (claimsData) {
          claimsData.forEach(c => {
            claimsMap[c.player_name.toLowerCase()] = c.user_id;
          });
        }
        setClaims(claimsMap);
      } catch (err) {
        console.error('Failed to load league data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLeagueData();
  }, [hostId]);

  const handleClaim = async (playerName) => {
    if (!user) {
      // Redirect to login with state to return here
      navigate('/login', { state: { redirect: location.pathname } });
      return;
    }

    setClaimingName(playerName);
    try {
      const { error } = await supabase
        .from('player_claims')
        .insert({
          user_id: user.id,
          host_id: hostId,
          player_name: playerName,
          status: 'approved'
        });

      if (error) throw error;

      // Update state
      setClaims(prev => ({
        ...prev,
        [playerName.toLowerCase()]: user.id
      }));
    } catch (err) {
      console.error('Failed to claim profile:', err);
      alert(err.message || 'Failed to claim profile. (Note: Each user can only claim one profile globally.)');
    } finally {
      setClaimingName('');
    }
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
      <Navbar title="League Dashboard" />
      <div className="page">
        <div className="league-hero animate-fade-in-up">
          <div className="hero-suits">
            <span className="suit-accent suit-spade">♠</span>
            <span className="suit-accent suit-heart">♥</span>
            <span className="suit-accent suit-diamond">♦</span>
            <span className="suit-accent suit-club">♣</span>
          </div>
          <h1>Public Standings</h1>
          <p className="text-secondary">Viewing poker results for this organizer.</p>
        </div>

        {loading ? (
          <div className="text-center animate-fade-in" style={{ padding: 'var(--sp-2xl) 0' }}>
            <div className="spinner"></div>
            <p className="text-secondary">Loading standings...</p>
          </div>
        ) : (
          <>
            {/* All-Time Leaderboard */}
            {leaderboard.length > 0 ? (
              <section className="home-section animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <h2 className="section-title">
                  <span className="suit-accent suit-spade">♠</span> All-Time Standings
                </h2>
                <div className="leaderboard glass-card">
                  <div className="leaderboard-header">
                    <span className="lb-rank">#</span>
                    <span className="lb-name">Player</span>
                    <span className="lb-sessions">Games</span>
                    <span className="lb-net">Net</span>
                  </div>
                  {leaderboard.map((p, i) => {
                    const claimedBy = claims[p.name.toLowerCase()];
                    return (
                      <div
                        key={p.name}
                        className={`leaderboard-row ${i < 3 ? 'top-three' : ''}`}
                      >
                        <span className="lb-rank">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </span>
                        <span className="lb-name" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-xs)', flexWrap: 'wrap' }}>
                          <span>{p.name}</span>
                          {claimedBy ? (
                            claimedBy === user?.id ? (
                              <span className="badge badge-profit" style={{ fontSize: '0.65rem', padding: '2px 6px', height: 'fit-content' }}>👤 You</span>
                            ) : (
                              <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '2px 6px', height: 'fit-content', opacity: 0.85 }}>✓ Verified</span>
                            )
                          ) : (
                            <button
                              className="btn-claim-profile"
                              onClick={() => handleClaim(p.name)}
                              disabled={!!claimingName}
                              style={{
                                fontSize: '0.65rem',
                                padding: '2px 6px',
                                background: 'transparent',
                                border: '1px solid var(--border-focus)',
                                color: 'var(--accent)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {claimingName === p.name ? '...' : 'Claim'}
                            </button>
                          )}
                        </span>
                        <span className="lb-sessions">{p.sessionsPlayed}</span>
                        <span className={`lb-net ${p.totalNet >= 0 ? 'profit' : 'loss'}`}>
                          {p.totalNet >= 0 ? '+' : ''}₹{Math.round(p.totalNet)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <div className="empty-state glass-card animate-fade-in-up">
                <div className="empty-icon">🃏</div>
                <p>No completed games yet in this league.</p>
              </div>
            )}

            {/* Past Sessions */}
            {sessions.length > 0 && (
              <section className="home-section animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <h2 className="section-title">
                  <span className="suit-accent suit-heart">♥</span> Match History
                </h2>
                <div className="session-list stagger-children">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="session-card glass-card"
                      onClick={() => navigate(`/league/${hostId}/session/${s.id}`)}
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
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <button className="btn btn-secondary btn-full mt-lg" onClick={() => navigate('/')}>
          ← Go to Home
        </button>
      </div>
    </>
  );
}
