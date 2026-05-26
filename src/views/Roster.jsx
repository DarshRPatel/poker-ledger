import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { supabase } from '../services/supabaseClient';
import Navbar from '../components/Navbar';
import './Roster.css';

export default function Roster() {
  const navigate = useNavigate();
  const { user, authLoading } = useGame();
  const [roster, setRoster] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  // Authentication Guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { toastMessage: 'Please log in to manage your roster' } });
    }
  }, [user, authLoading, navigate]);

  // Load Roster on Mount
  useEffect(() => {
    if (!user) return;
    fetchRoster();
  }, [user]);

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('rosters')
        .select('*')
        .eq('host_id', user.id)
        .order('name', { ascending: true });

      if (err) throw err;
      setRoster(data || []);
    } catch (err) {
      console.error('Failed to load roster:', err);
      setError('Failed to load roster from cloud.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !user) return;

    if (roster.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Player name already exists in your roster.');
      return;
    }

    setAdding(true);
    setError('');

    try {
      const { data, error: err } = await supabase
        .from('rosters')
        .insert({ name: trimmed, host_id: user.id })
        .select()
        .single();

      if (err) throw err;
      setRoster(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
    } catch (err) {
      console.error('Failed to add player to roster:', err);
      setError('Failed to add player. Try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, playerName) => {
    if (!confirm(`Are you sure you want to delete ${playerName} from your roster?`)) return;

    setError('');
    try {
      const { error: err } = await supabase
        .from('rosters')
        .delete()
        .eq('id', id);

      if (err) throw err;
      setRoster(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete player from roster:', err);
      setError('Failed to delete player. Check if they have existing game data.');
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <>
        <Navbar title="Manage Roster" />
        <div className="page text-center" style={{ padding: 'var(--sp-2xl) 0' }}>
          <div className="spinner"></div>
          <p className="text-secondary mt-sm">Checking authentication...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar title="Manage Roster" />
      <div className="page">
        <div className="roster-header animate-fade-in-up">
          <h2>Your Player Roster</h2>
          <p className="text-secondary">Save friends names here to easily autocomplete them in sessions.</p>
        </div>

        {/* Add Entry Form */}
        <form className="add-roster-row animate-fade-in-up" onSubmit={handleAdd} style={{ animationDelay: '60ms' }}>
          <input
            className="input"
            type="text"
            placeholder="Player name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            maxLength={20}
            disabled={adding}
            id="input-roster-name"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={adding || !name.trim()}
            id="btn-add-roster"
          >
            {adding ? 'Adding...' : '+ Add'}
          </button>
        </form>

        {error && <div className="roster-error animate-fade-in">{error}</div>}

        {/* Roster List */}
        <section className="roster-section mt-lg animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          {loading ? (
            <div className="text-center" style={{ padding: 'var(--sp-xl) 0' }}>
              <div className="spinner"></div>
            </div>
          ) : roster.length === 0 ? (
            <div className="empty-state glass-card">
              <div className="empty-icon">👥</div>
              <p>Roster is empty.</p>
              <p className="text-muted">Type a name above to start building your players list.</p>
            </div>
          ) : (
            <div className="roster-list stagger-children">
              {roster.map((player) => (
                <div key={player.id} className="roster-player-card glass-card">
                  <div className="roster-player-info">
                    <div className="player-avatar">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="player-name">{player.name}</span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(player.id, player.name)}
                    title="Remove from roster"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <button className="btn btn-secondary btn-full mt-xl" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
      </div>
    </>
  );
}
