// In src/components/teams/teams_components/TeamGameLog.js
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamGameLog = ({ teamData, year }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  useEffect(() => {
    console.log('TeamGameLog re-rendered with teamData:', teamData, 'year:', year);
  }, [teamData, year]);

  const [games, setGames] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    const fetchGames = async () => {
      console.log('Fetching games for teamId:', teamData.id, 'year:', year); // Debug log
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3001/api/teams/${teamData.id}/${year}/games`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch games: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Games data received:', data); // Debug log
        // Filter for unique games where team is home or away, using id to avoid duplicates
        const uniqueGames = [];
        const seenGames = new Set();
        const teamGames = data.filter(game => {
          const gameKey = `${game.id}-${game.homeId}-${game.awayId}`;
          if (!seenGames.has(gameKey) && (parseInt(game.homeId) === parseInt(teamData.id) || parseInt(game.awayId) === parseInt(teamData.id))) {
            seenGames.add(gameKey);
            return true;
          }
          return false;
        }).map(game => {
          const isHome = parseInt(game.homeId) === parseInt(teamData.id);
          console.log(`Game ${game.id}: isHome=${isHome}, homeId=${game.homeId}, awayId=${game.awayId}, teamId=${teamData.id}`); // Debug
          return {
            date: formatDate(game.startDate),
            teamPoints: isHome ? game.homePoints : game.awayPoints,
            opponentPoints: isHome ? game.awayPoints : game.homePoints,
            opponent: isHome ? game.awayTeam : game.homeTeam,
            opponentId: isHome ? game.awayId : game.homeId,
            isHomeGame: isHome,
          };
        }).sort((a, b) => new Date(`2024-${a.date}`) - new Date(`2024-${b.date}`)); // Sort by date
        setGames(teamGames);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [teamData, year]);

  if (loading) return <div className="p-0 text-gray-500">Loading game log...</div>;
  if (error) return <div className="p-0 text-red-500">Error: {error}</div>;

  return (
    <>
      <div className="relative"> {/* Removed h-64 and overflow-auto */}
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-gray-300 z-10">
            <tr>
              <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Date</th>
              <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Score</th>
              <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Opponent</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-gray-200'}>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.date}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.teamPoints > game.opponentPoints ? 'W' : 'L'} {game.teamPoints} - {game.opponentPoints}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.opponentId ? (
                    <>
                      <span>{game.isHomeGame ? 'vs' : 'at'} </span>
                      <Link
                        to={`/teams/${game.opponentId}/${year}`} // Link to TeamLanding with opponent teamID and year
                        className="text-gray-700 hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
                        style={{ display: 'inline-block' }}
                      >
                        {game.opponent.charAt(0).toUpperCase() + game.opponent.slice(1)}
                      </Link>
                    </>
                  ) : (
                    `${game.isHomeGame ? 'vs' : 'at'} ${game.opponent.charAt(0).toUpperCase() + game.opponent.slice(1) || 'N/A'}`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TeamGameLog;