import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { supabase } from '../services/supabaseClient';
import { getSessionsByHost } from '../services/storage';
import Navbar from '../components/Navbar';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, authLoading } = useGame();
  const [claim, setClaim] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { toastMessage: 'Please log in to view your player dashboard' } });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    async function loadDashboardData() {
      setLoading(true);
      try {
        // 1. Fetch claims matching user_id
        const { data: claimData, error: claimErr } = await supabase
          .from('player_claims')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (claimErr) throw claimErr;

        if (claimData) {
          setClaim(claimData);

          // 2. Fetch sessions for the host this player claimed from
          const hostSessions = await getSessionsByHost(claimData.host_id);
          
          // 3. Filter sessions where the player participated
          const playerSessions = hostSessions.filter(s =>
            s.status === 'completed' &&
            s.players.some(p => p.name.toLowerCase() === claimData.player_name.toLowerCase())
          );
          setSessions(playerSessions);

          // 4. Calculate Player Stats & Chart Data
          let totalBuyIns = 0;
          let totalCashOuts = 0;
          let wins = 0;
          let losses = 0;
          let currentStreak = 0;
          let streakType = null; // 'win' or 'loss'
          let activeStreak = 0;

          // Sessions are newest first. Let's calculate streak from newest.
          playerSessions.forEach((s, idx) => {
            const p = s.players.find(pl => pl.name.toLowerCase() === claimData.player_name.toLowerCase());
            const net = p ? (p.netRS || 0) : 0;
            
            if (idx === 0) {
              streakType = net >= 0 ? 'win' : 'loss';
              activeStreak = 1;
            } else if (streakType) {
              const currentType = net >= 0 ? 'win' : 'loss';
              if (currentType === streakType) {
                activeStreak++;
              } else {
                streakType = null; // stop counting
              }
            }
          });

          // Invert chronological order (oldest first) to calculate cumulative metrics
          const chronological = [...playerSessions].reverse();
          let cumulativeNet = 0;
          const chartPoints = [];

          chronological.forEach((s) => {
            const p = s.players.find(pl => pl.name.toLowerCase() === claimData.player_name.toLowerCase());
            const buyIn = p ? (p.buyIns * s.buyInAmount) : 0;
            const cashOut = p ? ((p.remainingChips / s.ratio) || 0) : 0;
            const net = cashOut - buyIn;

            totalBuyIns += buyIn;
            totalCashOuts += cashOut;
            cumulativeNet += net;

            if (net > 0) wins++;
            else if (net < 0) losses++;

            chartPoints.push({
              date: new Date(s.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              sessionNum: s.sessionNumber,
              net: net,
              cumulative: cumulativeNet
            });
          });

          setChartData(chartPoints);
          setStats({
            sessionsPlayed: playerSessions.length,
            totalBuyIn: totalBuyIns,
            totalCashOut: totalCashOuts,
            netProfit: totalCashOuts - totalBuyIns,
            winRate: playerSessions.length > 0 ? Math.round((wins / playerSessions.length) * 100) : 0,
            streak: activeStreak > 0 ? `${activeStreak} ${streakType === 'win' ? '🔥' : '❄️'}` : '—'
          });
        }
      } catch (err) {
        console.error('Failed to load player dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const renderChart = () => {
    if (chartData.length === 0) return null;

    const values = chartData.map(d => d.cumulative);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(0, ...values);
    const valRange = maxVal - minVal || 100;

    const width = 500;
    const height = 200;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 20;

    const points = chartData.map((d, index) => {
      const x = paddingLeft + (index / (chartData.length - 1 || 1)) * (width - paddingLeft - paddingRight);
      const y = height - paddingBottom - ((d.cumulative - minVal) / valRange) * (height - paddingTop - paddingBottom);
      return { x, y };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    // Y position for baseline (₹0)
    const zeroY = height - paddingBottom - ((0 - minVal) / valRange) * (height - paddingTop - paddingBottom);

    // Create a closed path for gradient fill
    const fillPathD = points.length > 0 
      ? `${pathD} L ${points[points.length - 1].x} ${zeroY} L ${points[0].x} ${zeroY} Z`
      : '';

    return (
      <div className="chart-container glass-card mt-md animate-fade-in">
        <h3 className="chart-title">Cumulative Performance</h3>
        <svg viewBox={`0 0 ${width} ${height}`} className="performance-chart">
          <defs>
            <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} className="chart-grid-line" />
          <line x1={paddingLeft} y1={zeroY} x2={width - paddingRight} y2={zeroY} className="chart-grid-zero" />
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} className="chart-grid-line" />

          {/* Y Axis Labels */}
          <text x={paddingLeft - 8} y={paddingTop + 4} className="chart-label y-label">₹{Math.round(maxVal)}</text>
          <text x={paddingLeft - 8} y={zeroY + 4} className="chart-label y-label zero-label">₹0</text>
          <text x={paddingLeft - 8} y={height - paddingBottom + 4} className="chart-label y-label">₹{Math.round(minVal)}</text>

          {/* Fill Gradient */}
          {points.length > 0 && <path d={fillPathD} fill="url(#chart-grad)" />}

          {/* Path Line */}
          {points.length > 0 && <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Data Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="var(--bg-app)"
              stroke="var(--accent)"
              strokeWidth="2"
              className="chart-dot"
            />
          ))}
        </svg>
      </div>
    );
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (authLoading || (user && loading)) {
    return (
      <>
        <Navbar title="Player Dashboard" />
        <div className="page text-center" style={{ padding: 'var(--sp-2xl) 0' }}>
          <div className="spinner"></div>
          <p className="text-secondary mt-sm">Loading your profile stats...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar title="Player Dashboard" />
      <div className="page">
        {claim ? (
          <>
            <div className="dashboard-hero animate-fade-in-up">
              <div className="hero-suits">
                <span className="suit-accent suit-spade">♠</span>
                <span className="suit-accent suit-heart">♥</span>
              </div>
              <p className="welcome-text text-secondary">Verified Profile</p>
              <h1>{claim.player_name}</h1>
            </div>

            {/* Quick Metrics Grid */}
            {stats && (
              <div className="dashboard-stats-grid stagger-children mt-md">
                <div className="stat-card glass-card">
                  <div className="stat-value text-gold">₹{Math.round(stats.netProfit)}</div>
                  <div className="stat-label">Net Profit</div>
                </div>
                <div className="stat-card glass-card">
                  <div className="stat-value">{stats.sessionsPlayed}</div>
                  <div className="stat-label">Games</div>
                </div>
                <div className="stat-card glass-card">
                  <div className="stat-value">{stats.winRate}%</div>
                  <div className="stat-label">Win Rate</div>
                </div>
                <div className="stat-card glass-card">
                  <div className="stat-value">{stats.streak}</div>
                  <div className="stat-label">Current Streak</div>
                </div>
              </div>
            )}

            {/* Performance Chart */}
            {renderChart()}

            {/* Match History */}
            <section className="home-section animate-fade-in-up mt-xl" style={{ animationDelay: '150ms' }}>
              <h2 className="section-title">
                <span className="suit-accent suit-spade">♠</span> Game History
              </h2>
              {sessions.length === 0 ? (
                <div className="empty-state glass-card">
                  <p className="text-muted">No completed games recorded on your claimed roster.</p>
                </div>
              ) : (
                <div className="session-list stagger-children">
                  {sessions.map((s) => {
                    const p = s.players.find(pl => pl.name.toLowerCase() === claim.player_name.toLowerCase());
                    const net = p ? (p.netRS || 0) : 0;
                    return (
                      <div
                        key={s.id}
                        className="session-card glass-card"
                        onClick={() => navigate(`/league/${claim.host_id}/session/${s.id}`)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="session-card-top">
                          <div className="session-number">Session #{s.sessionNumber}</div>
                          <div className="session-date">{formatDate(s.startTime)}</div>
                        </div>
                        <div className="session-card-body">
                          <div className="session-stat">
                            <span className="stat-value">₹{p ? p.buyIns * s.buyInAmount : 0}</span>
                            <span className="stat-label">Buy-in</span>
                          </div>
                          <div className="session-stat">
                            <span className="stat-value">₹{p ? Math.round(p.remainingChips / s.ratio) : 0}</span>
                            <span className="stat-label">Cash-out</span>
                          </div>
                          <div className="session-stat">
                            <span className={`stat-value ${net >= 0 ? 'profit' : 'loss'}`}>
                              {net >= 0 ? '+' : ''}₹{Math.round(net)}
                            </span>
                            <span className="stat-label">Net</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="empty-state glass-card mt-xl animate-fade-in-up">
            <div className="empty-icon">👥</div>
            <h2>Claim a Profile</h2>
            <p className="text-secondary mt-sm" style={{ maxWidth: '320px', margin: 'var(--sp-sm) auto' }}>
              You haven't claimed a player profile yet. Visit a Host's public league dashboard and click "Claim" next to your name to connect your stats.
            </p>
            <button className="btn btn-primary mt-md" onClick={() => navigate('/')}>
              Go to Home
            </button>
          </div>
        )}
      </div>
    </>
  );
}
