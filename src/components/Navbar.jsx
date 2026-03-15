import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

export default function Navbar({ title, showBack = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {showBack && !isHome ? (
          <button
            className="navbar-back btn-ghost"
            onClick={() => navigate(-1)}
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
        <div className="navbar-spacer" />
      </div>
    </nav>
  );
}
