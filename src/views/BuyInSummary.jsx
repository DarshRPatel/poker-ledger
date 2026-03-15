import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import Navbar from '../components/Navbar';
import PotSummary from '../components/PotSummary';
import './BuyInSummary.css';

export default function BuyInSummary() {
  const navigate = useNavigate();
  const { session, setStep } = useGame();

  if (!session) {
    navigate('/new');
    return null;
  }

  const totalBuyIns = session.players.reduce((s, p) => s + p.buyIns, 0);

  const handleStart = () => {
    setStep('active');
    navigate('/game');
  };

  return (
    <>
      <Navbar title="Buy-in Summary" />
      <div className="page">
        <PotSummary
          totalChips={session.totalPotChips}
          totalRS={session.totalPotRS}
          ratio={session.ratio}
        />

        <div className="summary-table glass-card animate-fade-in-up">
          <div className="summary-row header">
            <span className="col-name">Player</span>
            <span className="col-buyins">Buy-ins</span>
            <span className="col-chips">Chips</span>
            <span className="col-value">₹ Value</span>
          </div>
          {session.players.map((p, i) => (
            <div key={i} className="summary-row">
              <span className="col-name">
                <span className="mini-avatar">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                {p.name}
              </span>
              <span className="col-buyins">{p.buyIns}</span>
              <span className="col-chips text-gold">
                {p.totalChips.toLocaleString()}
              </span>
              <span className="col-value">
                ₹{(p.buyIns * session.buyInAmount).toLocaleString()}
              </span>
            </div>
          ))}
          <div className="summary-row footer">
            <span className="col-name">Total</span>
            <span className="col-buyins">{totalBuyIns}</span>
            <span className="col-chips text-gold">
              {session.totalPotChips.toLocaleString()}
            </span>
            <span className="col-value text-green">
              ₹{session.totalPotRS.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg btn-full mt-lg animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
          onClick={handleStart}
          id="btn-start-game"
        >
          ♠ Start Game
        </button>
      </div>
    </>
  );
}
