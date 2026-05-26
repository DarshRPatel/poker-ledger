import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { supabase } from '../services/supabaseClient';
import Navbar from '../components/Navbar';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useGame();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (err) throw err;
      setSuccess(true);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to send magic link. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar title="Host Login" />
      <div className="page flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="login-card glass-card animate-fade-in-up">
          <div className="login-header">
            <span className="suit-accent suit-spade" style={{ fontSize: '2.5rem' }}>♠</span>
            <h2>Game Organizer Login</h2>
            <p className="text-secondary">Enter your email to receive a passwordless login link.</p>
          </div>

          {success ? (
            <div className="login-success-state animate-fade-in">
              <div className="success-icon">✉️</div>
              <h3>Check your inbox!</h3>
              <p className="text-secondary">
                We've sent a magic login link to <strong className="text-accent">{email}</strong>. 
                Click the link in your email to sign in instantly.
              </p>
              <button className="btn btn-secondary mt-lg btn-full" onClick={() => setSuccess(false)}>
                ← Try another email
              </button>
            </div>
          ) : (
            <form className="login-form stagger-children" onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  placeholder="e.g. host@poker.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  required
                  autoFocus
                />
              </div>

              {error && <div className="login-error-text mt-sm text-red">{error}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full mt-lg"
                disabled={loading || !email.trim()}
              >
                {loading ? 'Sending link...' : 'Send Magic Link ✉️'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
