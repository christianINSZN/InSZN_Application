import React, { useState, useEffect } from 'react';

const MatchupProjection = ({ teamId, year }) => {
  const [matchup, setMatchup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

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
        const response = await fetch(`http://localhost:3001/api/teams/${teamId}/${year}/matchups`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const matchups = await response.json();
        const nextMatchup = matchups
          .filter(m => m.status === 'scheduled')
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
        if (!nextMatchup) throw new Error('No scheduled matchups found');
        setMatchup(nextMatchup);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (teamId) fetchMatchup();
  }, [teamId, year]);

  if (loading) return <div className="p-4 text-gray-500">Loading matchup...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!matchup) return <div className="p-4 text-gray-500">No upcoming matchup available.</div>;

  // Format date and time from startDate
  const startDate = new Date(matchup.startDate);
  const dateStr = startDate.toLocaleDateString();
  const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white p-0 rounded-lg shadow-lg">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Next Matchup</h2>
      <div className="flex mt-2">
        {/* Left Container: Unchanged Matchup Details */}
        <div className="w-2/5 pr-2">
          <div className="flex items-center justify-between">
            {/* Away Team Image */}
            <div className="text-center">
              {matchup.awayTeamLogo && <img src={matchup.awayTeamLogo} alt={`${matchup.awayTeamName} logo`} className="w-16 h-16 mx-auto ml-6" />}
            </div>
            {/* Centered Date and Time */}
            <div className="text-center flex-1">
              <p className="text-lg text-gray-600">{dateStr}</p>
              <p className="text-md text-gray-500">{timeStr}</p>
            </div>
            {/* Home Team Image */}
            <div className="text-center">
              {matchup.homeTeamLogo && <img src={matchup.homeTeamLogo} alt={`${matchup.homeTeamName} logo`} className="w-16 h-16 mx-auto" />}
            </div>
          </div>
        </div>
        {/* Vertical Line Separator */}
        <div className="border-l-2 border-[#235347] h-16 mx-10"></div>
        {/* Right Container: Two Rows */}
        <div className="w-3/5 pl-2 flex flex-col justify-center items-center">
          <div className="flex flex-row space-x-6">
            <p className="text-lg text-black">Line: {matchup.homeMoneyline !== null ? `${matchup.homeMoneyline}` : 'N/A'}</p>
            <div className="h-7 border-l-[1px] border-[#235347]"></div>
            <p className="text-lg text-black">Spread: {matchup.spread !== null ? `${matchup.spread}` : 'N/A'}</p>
            <div className="h-7 border-l-[1px] border-[#235347]"></div>
            <p className="text-lg text-black">O/U: {matchup.overUnder !== null ? `${matchup.overUnder}` : 'N/A'}</p>
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
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <p className="text-lg font-semibold text-black">Scouting Report Coming Soon</p>
            <button
              className="mt-4 px-4 py-2 bg-[#235347] text-white rounded hover:bg-[#1b3e32]"
              onClick={() => setShowComingSoon(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchupProjection;