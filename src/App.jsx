import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import GlobalToastHelper from './components/GlobalToastHelper';
import Home from './views/Home';
import NewSession from './views/NewSession';
import PlayerEntry from './views/PlayerEntry';
import BuyInSummary from './views/BuyInSummary';
import ActiveGame from './views/ActiveGame';
import EndGame from './views/EndGame';
import SessionResults from './views/SessionResults';
import SessionDetail from './views/SessionDetail';
import Login from './views/Login';
import Roster from './views/Roster';
import League from './views/League';
import Dashboard from './views/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <GlobalToastHelper />
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
          <Route path="/league/:hostId/session/:id" element={<SessionDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/league/:hostId" element={<League />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}
