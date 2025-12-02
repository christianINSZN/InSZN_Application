import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Home from './components/Home';
import Players from './components/Players';
import Subscription from './components/Subscription';
import SignUpPage from './components/auth/SignUp';
import SignInPage from './components/auth/SignIn';
import OverviewQB from './components/playerprofiles/QB/Overview';
import FieldViewInterface from './components/playerprofiles/QB/FieldView';
import PassingAnalytics from './components/playerprofiles/QB/PassingAnalytics';
import HeadToHeadContainer from './components/playerprofiles/QB/HeadToHead';
import OverviewRB from './components/playerprofiles/RB/Overview';
import RushingAnalytics from './components/playerprofiles/RB/RushingAnalytics';
import HeadToHeadContainerRB from './components/playerprofiles/RB/HeadToHead';
import OverviewWR from './components/playerprofiles/WR/Overview';
import ReceivingAnalytics from './components/playerprofiles/WR/ReceivingAnalytics';
import HeadToHeadContainerWR from './components/playerprofiles/WR/HeadToHead';
import FieldViewInterfaceWR from './components/playerprofiles/WR/FieldView';
import OverviewTE from './components/playerprofiles/TE/Overview';
import ReceivingAnalyticsTE from './components/playerprofiles/TE/ReceivingAnalytics';
import HeadToHeadContainerTE from './components/playerprofiles/TE/HeadToHead';
import FieldViewInterfaceTE from './components/playerprofiles/TE/FieldView';
import GameRecap from './components/games/GameRecap';
import PortalLanding from './components/portal/PortalLanding';
import OverviewCB from './components/playerprofiles/CB/Overview';
import OverviewDL from './components/playerprofiles/DL/Overview';
import OverviewC from './components/playerprofiles/C/Overview';
import OverviewG from './components/playerprofiles/G/Overview';
import OverviewT from './components/playerprofiles/T/Overview';
import OverviewS from './components/playerprofiles/S/Overview';
import OverviewLBE from './components/playerprofiles/LBE/Overview';
import OverviewDB from './components/playerprofiles/DB/Overview';
import HeadToHead from './components/HeadToHead';
import HeadToHeadQB from './components/headtohead/headtohead_qb';
import HeadToHeadRB from './components/headtohead/headtohead_rb';
import HeadToHeadWR from './components/headtohead/headtohead_wr';
import HeadToHeadTE from './components/headtohead/headtohead_te';
import TeamsComponent from './components/Teams';
import TeamLanding from './components/teams/TeamLanding';
import TeamRoster from './components/teams/TeamRoster';
import TeamsRankings from './components/teams/TeamRankings';
import GamesLanding from './components/games/GamesLanding';
import SingleGamePreview from './components/games/SingleGamePreview';
import SingleGameRecap from './components/games/SingleGameRecap';
import './styles/App.css';
import { useState } from 'react';

function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [defaultYear, setDefaultYear] = useState(2025);

  return (
    <BrowserRouter>
      <NavBar isOpen={isOpen} setIsOpen={setIsOpen} />
      <div className="w-full pt-16 p-0 sm:p-4 overflow-auto bg-gray-100">
        <Routes>
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/" element={<Home />} />
          <Route path="/players" element={<Players year={defaultYear} />} />
          <Route path="/portal" element={<PortalLanding year={defaultYear} />} />
          <Route path="/players/qb/:playerId" element={<OverviewQB year={defaultYear} />} />
          <Route path="/players/qb/:playerId/passing" element={<PassingAnalytics year={defaultYear} />} />
          <Route path="/players/qb/:playerId/fieldview" element={<FieldViewInterface year={defaultYear} />} />
          <Route path="/players/qb/:playerId/h2h" element={<HeadToHeadContainer year={defaultYear} />} />
          <Route path="/players/rb/:playerId" element={<OverviewRB year={defaultYear} />} />
          <Route path="/players/rb/:playerId/rushing" element={<RushingAnalytics year={defaultYear} />} />
          <Route path="/players/rb/:playerId/h2h" element={<HeadToHeadContainerRB year={defaultYear} />} />
          <Route path="/players/wr/:playerId" element={<OverviewWR year={defaultYear} />} />
          <Route path="/players/wr/:playerId/receiving" element={<ReceivingAnalytics year={defaultYear} />} />
          <Route path="/players/wr/:playerId/fieldview" element={<FieldViewInterfaceWR year={defaultYear} />} />
          <Route path="/players/wr/:playerId/h2h" element={<HeadToHeadContainerWR year={defaultYear} />} />
          <Route path="/players/te/:playerId" element={<OverviewTE year={defaultYear} />} />
          <Route path="/players/te/:playerId/receiving" element={<ReceivingAnalyticsTE year={defaultYear} />} />
          <Route path="/players/te/:playerId/fieldview" element={<FieldViewInterfaceTE year={defaultYear} />} />
          <Route path="/players/te/:playerId/h2h" element={<HeadToHeadContainerTE year={defaultYear} />} />
          <Route path="/players/cb/:playerId" element={<OverviewCB year={defaultYear} />} />
          <Route path="/players/dl/:playerId" element={<OverviewDL year={defaultYear} />} />
          <Route path="/players/db/:playerId" element={<OverviewDB year={defaultYear} />} />
          <Route path="/players/c/:playerId" element={<OverviewC year={defaultYear} />} />
          <Route path="/players/g/:playerId" element={<OverviewG year={defaultYear} />} />
          <Route path="/players/t/:playerId" element={<OverviewT year={defaultYear} />} />
          <Route path="/players/s/:playerId" element={<OverviewS year={defaultYear} />} />
          <Route path="/players/lbe/:playerId" element={<OverviewLBE year={defaultYear} />} />
          <Route path="/teams" element={<TeamsComponent year={defaultYear} />} />
          <Route path="/team_rankings" element={<TeamsRankings year={defaultYear} />} />
          <Route path="/games" element={<GamesLanding year={defaultYear} />} />
          <Route path="/games/preview/:id" element={<SingleGamePreview year={defaultYear} />} />
          <Route path="/games/recap/:id" element={<SingleGameRecap year={defaultYear} />} />
          <Route path="/game/:id" element={<GameRecap />} />
          <Route path="/teams/:id/:year" element={<TeamLanding />} />
          <Route path="/teams/:id/:year/roster" element={<TeamRoster />} />
          <Route path="/h2h" element={<HeadToHead year={defaultYear} />} />
          <Route path="/h2h/qb" element={<HeadToHeadQB year={defaultYear} />} />
          <Route path="/h2h/rb" element={<HeadToHeadRB year={defaultYear} />} />
          <Route path="/h2h/wr" element={<HeadToHeadWR year={defaultYear} />} />
          <Route path="/h2h/te" element={<HeadToHeadTE year={defaultYear} />} />
          <Route path="/subscribe" element={<Subscription />} />
        </Routes>
      </div>
      <div className="h-16 bg-[#235347] flex items-center justify-center text-white/50 px-4 text-sm sm:text-base">
        © 2025 Perennial Data Group, LLC. All Rights Reserved.
      </div>
    </BrowserRouter>
  );
}

export default App;