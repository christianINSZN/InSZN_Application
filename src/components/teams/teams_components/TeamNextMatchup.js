import React, { useState, useEffect } from 'react';

const MatchupProjection = ({ teamId, year }) => {
  const [matchup, setMatchup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const formatDate = (dateStr, startTimeTBD) => {
    if (startTimeTBD) return 'TBD';
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  const formatTime = (dateStr, startTimeTBD) => {
    if (startTimeTBD) return 'TBD';
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    const fetchMatchup = async () => {
      setLoading(true);
      setError(null);
      if (!teamId || !year) {
        console.log('teamId or year is undefined or null', { teamId, year });
        setLoading(false);
        setError('Team ID or year not available');
        return;
      }
      try {
        console.log(`Fetching games from /api/teams/${teamId}/${year}/games`);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${teamId}/${year}/games`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        const games = await response.json();
        console.log('Games data received:', games);
        const nextMatchup = games
          .filter(m => {
            const isMatch = (String(m.homeId) === String(teamId) || String(m.awayId) === String(teamId)) && !m.completed;
            console.log(`Game ${m.id}: homeId=${m.homeId}, awayId=${m.awayId}, completed=${m.completed}, isMatch=${isMatch}`);
            return isMatch;
          })
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
        if (!nextMatchup) {
          console.log('No scheduled matchups found for teamId:', teamId, 'year:', year);
          setMatchup(null);
          setLoading(false);
          return;
        }
        const mappedMatchup = {
          startDate: nextMatchup.startDate,
          startTimeTBD: nextMatchup.startTimeTBD,
          homeTeamName: nextMatchup.homeTeam,
          awayTeamName: nextMatchup.awayTeam,
          homeTeamLogo: nextMatchup.homeTeamLogo,
          awayTeamLogo: nextMatchup.awayTeamLogo,
          spread: nextMatchup.draftKingsSpread,
          overUnder: nextMatchup.draftKingsOverUnder,
          homeMoneyline: nextMatchup.draftKingsHomeMoneyline,
          status: 'scheduled',
        };
        console.log('Next matchup:', mappedMatchup);
        setMatchup(mappedMatchup);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (teamId && year) fetchMatchup();
  }, [teamId, year]);

  if (loading) return <div className="p-2 text-black text-base">Loading matchup...</div>;
  if (error) return <div className="p-2 text-red-500 text-base">Error: {error}</div>;
  if (!matchup) return <div className="p-2 text-black text-base">No upcoming matchup available</div>;

  const dateStr = formatDate(matchup.startDate, matchup.startTimeTBD);
  const timeStr = formatTime(matchup.startDate, matchup.startTimeTBD);
  const isMobile = window.innerWidth < 640;

  return (
    <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
      <h2 className={isMobile ? "flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded" : "flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded"}>Next Matchup</h2>
      <div className={isMobile ? "p-2" : "p-0"}>
        {/* Mobile View */}
        <div className="sm:hidden flex flex-col mt-1">
          <div className="w-full">
            <div className="flex flex-row items-center justify-between overflow-x-auto">
              <div className="text-center min-w-[80px]">
                {matchup.awayTeamLogo && <img src={matchup.awayTeamLogo} alt={`${matchup.awayTeamName} logo`} className="w-12 h-12 mx-auto ml-4" />}
              </div>
              <div className="text-center flex-1 min-w-[120px]">
                <p className="text-sm text-black">{dateStr}</p>
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
                <p className="text-sm text-black">Line: {matchup.homeMoneyline !== null ? `${matchup.homeMoneyline}` : 'TBD'}</p>
              </div>
              <div className="h-6 border-l-[1px] border-[#235347]"></div>
              <div className="text-center min-w-[80px]">
                <p className="text-sm text-black">Spread: {matchup.spread !== null ? `${matchup.spread}` : 'TBD'}</p>
              </div>
              <div className="h-6 border-l-[1px] border-[#235347]"></div>
              <div className="text-center min-w-[80px]">
                <p className="text-sm text-black">O/U: {matchup.overUnder !== null ? `${matchup.overUnder}` : 'TBD'}</p>
              </div>
            </div>
            <div className="mt-4">
              <span
                className="text-xs text-[#235347] hover:text-[#235347]/50 underline cursor-pointer"
                onClick={() => setShowComingSoon(true)}
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
                <p className="text-lg text-black">{dateStr}</p>
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
                <p className="text-lg text-black">Line: {matchup.homeMoneyline !== null ? `${matchup.homeMoneyline}` : 'TBD'}</p>
              </div>
              <div className="h-7 border-l-[1px] border-[#235347]"></div>
              <div className="text-center">
                <p className="text-lg text-black">Spread: {matchup.spread !== null ? `${matchup.spread}` : 'TBD'}</p>
              </div>
              <div className="h-7 border-l-[1px] border-[#235347]"></div>
              <div className="text-center">
                <p className="text-lg text-black">O/U: {matchup.overUnder !== null ? `${matchup.overUnder}` : 'TBD'}</p>
              </div>
            </div>
            <div className="mt-6">
              <span
                className="text-sm text-[#235347] hover:text-[#235347]/50 underline cursor-pointer"
                onClick={() => setShowComingSoon(true)}
              >
                Scouting Report
              </span>
            </div>
          </div>
        </div>
        {showComingSoon && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-[90%] sm:w-auto">
              <p className="text-sm sm:text-lg font-semibold text-black">Scouting Report Coming Soon</p>
              <button
                className="mt-2 sm:mt-4 px-3 sm:px-4 py-1 sm:py-2 bg-[#235347] text-white rounded hover:bg-[#1b3e32]"
                onClick={() => setShowComingSoon(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchupProjection;