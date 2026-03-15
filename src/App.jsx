import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import Home from './views/Home';
import NewSession from './views/NewSession';
import PlayerEntry from './views/PlayerEntry';
import BuyInSummary from './views/BuyInSummary';
import ActiveGame from './views/ActiveGame';
import EndGame from './views/EndGame';
import SessionResults from './views/SessionResults';
import SessionDetail from './views/SessionDetail';

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<NewSession />} />
          <Route path="/players" element={<PlayerEntry />} />
          <Route path="/summary" element={<BuyInSummary />} />
          <Route path="/game" element={<ActiveGame />} />
          <Route path="/endgame" element={<EndGame />} />
          <Route path="/results" element={<SessionResults />} />
          <Route path="/session/:id" element={<SessionDetail />} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}
