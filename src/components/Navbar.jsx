import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import './Navbar.css';

export default function Navbar({ title, showBack = true, onBack }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authLoading, signOut } = useGame();
  const isHome = location.pathname === '/';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {showBack && !isHome ? (
          <button
            className="navbar-back btn-ghost"
            onClick={() => (onBack ? onBack() : navigate(-1))}
            aria-label="Go back"
          >
            ← Back
          </button>
        ) : (
          <div className="navbar-spacer" />
        )}
        <div className="navbar-title">
          {isHome ? (
            <span className="navbar-logo">
              <span className="suit-icon suit-spade">♠</span>
              <span className="suit-icon suit-heart">♥</span>
              Poker Ledger
              <span className="suit-icon suit-diamond">♦</span>
              <span className="suit-icon suit-club">♣</span>
            </span>
          ) : (
            title || ''
          )}
        </div>
        
        <div className="navbar-right">
          {authLoading ? (
            <span className="navbar-text">...</span>
          ) : user ? (
            <div className="navbar-actions">
              {!location.pathname.startsWith('/dashboard') && (
                <button className="btn-ghost btn-sm text-gold" onClick={() => navigate('/dashboard')} title="Player Stats">
                  📊 Stats
                </button>
              )}
              {!location.pathname.startsWith('/roster') && (
                <button className="btn-ghost btn-sm text-gold" onClick={() => navigate('/roster')} title="Host Roster">
                  👥 Roster
                </button>
              )}
              <button className="btn-ghost btn-sm" onClick={signOut}>
                Logout
              </button>
            </div>
          ) : (
            !location.pathname.startsWith('/login') && !location.pathname.startsWith('/league') && (
              <button className="btn-ghost btn-sm text-gold" onClick={() => navigate('/login')}>
                Host Login
              </button>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
