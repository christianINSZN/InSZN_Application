import React, { useState, useEffect } from 'react';
import ScoutingReport from '../../../games/ScoutingReport';

const MatchupProjection = ({ teamId, year }) => {
  const [matchup, setMatchup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScoutingReport, setShowScoutingReport] = useState(false);
  

  useEffect(() => {
    const fetchMatchup = async () => {
      setLoading(true);
      setError(null);
      if (!teamId) {
        console.log('teamId is undefined or null');
        setLoading(false);
        setError('Team ID not available');
        return;
      }
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${teamId}/${year}/games`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const games = await response.json();
const nextMatchup = games
  .filter(m => (m.homeId === teamId || m.awayId === teamId) && !m.completed)
  .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] 
  ?? "Awaiting Next Matchup - Stay Tuned";
        console.log('nextMatchup:', nextMatchup); // Log the object to inspect its structure
        const mappedMatchup = {
          startDate: nextMatchup.startDate,
          startTimeTBD: nextMatchup.startTimeTBD,
          homeTeamName: nextMatchup.homeTeam,
          awayTeamName: nextMatchup.awayTeam,
          homeId: nextMatchup.homeId,
          awayId: nextMatchup.awayId,
          homeTeamLogo: nextMatchup.homeTeamLogo,
          awayTeamLogo: nextMatchup.awayTeamLogo,
          spread: nextMatchup.draftKingsSpread,
          overUnder: nextMatchup.draftKingsOverUnder,
          homeMoneyline: nextMatchup.draftKingsHomeMoneyline,
          status: 'scheduled',
        };
        setMatchup(mappedMatchup);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (teamId) fetchMatchup();
  }, [teamId, year]);

  if (loading) return <div className="p-2 sm:p-4 text-gray-500 text-sm sm:text-base">Loading matchup...</div>;
  if (error) return <div className="p-2 sm:p-4 text-red-500 text-sm sm:text-base">Error: {error}</div>;
  if (!matchup) return <div className="p-2 sm:p-4 text-gray-500 text-sm sm:text-base">No upcoming matchup available.</div>;

  const dateStr = matchup.startTimeTBD ? 'TBD' : new Date(matchup.startDate).toLocaleDateString();
  const timeStr = matchup.startTimeTBD ? 'TBD' : new Date(matchup.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white p-2 sm:p-0 rounded-lg shadow-lg">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Next Matchup</h2>
      {/* Mobile View */}
      <div className="sm:hidden flex flex-col mt-1">
        <div className="w-full">
          <div className="flex flex-row items-center justify-between overflow-x-auto">
            <div className="text-center min-w-[80px]">
              {matchup.awayTeamLogo && <img src={matchup.awayTeamLogo} alt={`${matchup.awayTeamName} logo`} className="w-12 h-12 mx-auto ml-4" />}
            </div>
            <div className="text-center flex-1 min-w-[120px]">
              <p className="text-sm text-gray-600">{dateStr}</p>
              <p className="text-xs text-gray-500">{timeStr}</p>
            </div>
            <div className="text-center min-w-[80px]">
              {matchup.homeTeamLogo && <img src={matchup.homeTeamLogo} alt={`${matchup.homeTeamName} logo`} className="w-12 h-12 mx-auto" />}
            </div>
          </div>
        </div>
        <div className="border-t-2 border-[#235347] h-0 my-4 mx-0"></div>
        <div className="w-full flex flex-col justify-center items-center">
          <div className="flex flex-row space-x-4 overflow-x-auto">
            <div className="text-center min-w-[80px]">
              <p className="text-sm text-black">Line: {matchup.homeMoneyline !== null ? `${matchup.homeMoneyline}` : 'N/A'}</p>
            </div>
            <div className="h-6 border-l-[1px] border-[#235347]"></div>
            <div className="text-center min-w-[80px]">
              <p className="text-sm text-black">Spread: {matchup.spread !== null ? `${matchup.spread}` : 'N/A'}</p>
            </div>
            <div className="h-6 border-l-[1px] border-[#235347]"></div>
            <div className="text-center min-w-[80px]">
              <p className="text-sm text-black">O/U: {matchup.overUnder !== null ? `${matchup.overUnder}` : 'N/A'}</p>
            </div>
          </div>
          <div className="mt-4">
            <span
              className="text-xs text-[#235347] hover:text-[#235347]/50 underline cursor-pointer"
              onClick={() => setShowScoutingReport(true)}
            >
              Scouting Report
            </span>
          </div>
        </div>
      </div>
      {/* Non-Mobile View */}
      <div className="hidden sm:flex mt-2">
        <div className="w-2/5 pr-2">
          <div className="flex items-center justify-between">
            <div className="text-center">
              {matchup.awayTeamLogo && <img src={matchup.awayTeamLogo} alt={`${matchup.awayTeamName} logo`} className="w-16 h-16 mx-auto ml-6" />}
            </div>
            <div className="text-center flex-1">
              <p className="text-lg text-gray-600">{dateStr}</p>
              <p className="text-md text-gray-500">{timeStr}</p>
            </div>
            <div className="text-center">
              {matchup.homeTeamLogo && <img src={matchup.homeTeamLogo} alt={`${matchup.homeTeamName} logo`} className="w-16 h-16 mx-auto" />}
            </div>
          </div>
        </div>
        <div className="border-l-2 border-[#235347] h-16 mx-10"></div>
        <div className="w-3/5 pl-2 flex flex-col justify-center items-center">
          <div className="flex flex-row space-x-6">
            <div className="text-center">
              <p className="text-lg text-black">Home Line: {matchup.homeMoneyline !== null ? `${matchup.homeMoneyline}` : 'TBD'}</p>
            </div>
            <div className="h-7 border-l-[1px] border-[#235347]"></div>
            <div className="text-center">
              <p className="text-lg text-black">Home Spread: {matchup.spread !== null ? `${matchup.spread}` : 'TBD'}</p>
            </div>
            <div className="h-7 border-l-[1px] border-[#235347]"></div>
            <div className="text-center">
              <p className="text-lg text-black">O/U: {matchup.overUnder !== null ? `${matchup.overUnder}` : 'TBD'}</p>
            </div>
          </div>
          <div className="mt-6">
            <span
              className="text-sm text-[#235347] hover:text-[#235347]/50 underline cursor-pointer"
              onClick={() => setShowScoutingReport(true)}
            >
              Scouting Report
            </span>
          </div>
        </div>
      </div>
      {showScoutingReport && (
        <ScoutingReport matchup={matchup} year={year} onClose={() => setShowScoutingReport(false)} />
      )}
    </div>
  );
};

export default MatchupProjection;