// In src/components/players/Overview/MatchupProjection.js
import React, { useState, useEffect } from 'react';

const MatchupProjection = ({ teamId, year }) => {
  const [matchup, setMatchup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <div className="flex">
        {/* Left Container: Unchanged Matchup Details */}
        <div className="w-2/5 pr-2">
          <h3 className="text-xl font-semibold text-gray-700 mb-2 text-center">Next Matchup</h3>
          <div className="flex items-center justify-between">
            {/* Away Team Image */}
            <div className="text-center">
              {matchup.awayTeamLogo && <img src={matchup.awayTeamLogo} alt={`${matchup.awayTeamName} logo`} className="w-16 h-16 mx-auto" />}
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
        <div className="border-l-2 border-gray-300 h-auto mx-2"></div>
        {/* Right Container: Two Columns and Scouting Report */}
        <div className="w-3/5 pl-2">
          <div className="flex justify-between">
            {/* Left Column of Right Container */}
            <div className="w-1/2 pr-2">
              <p className="text-sm text-gray-600 text-center">Team Odds: {matchup.homeMoneyline !== null ? `${matchup.homeMoneyline}` : 'N/A'}</p>
              <p className="text-sm text-gray-600 text-center">Spread: {matchup.spread !== null ? `${matchup.spread}` : 'N/A'}</p>
              <p className="text-sm text-gray-600 text-center">O/U: {matchup.overUnder !== null ? `${matchup.overUnder}` : 'N/A'}</p>
            </div>
            {/* Right Column of Right Container */}
            <div className="w-1/2 pl-2">
              <p className="text-sm text-gray-600 text-center">Team Odds: {matchup.homeMoneyline !== null ? `${matchup.homeMoneyline}` : 'N/A'}</p>
              <p className="text-sm text-gray-600 text-center">Spread: {matchup.spread !== null ? `${matchup.spread}` : 'N/A'}</p>
              <p className="text-sm text-gray-600 text-center">O/U: {matchup.overUnder !== null ? `${matchup.overUnder}` : 'N/A'}</p>
            </div>
          </div>
          {/* Third Row: Scouting Report */}
          <div className="mt-6 text-center">
            <p className="text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer">Scouting Report</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchupProjection;