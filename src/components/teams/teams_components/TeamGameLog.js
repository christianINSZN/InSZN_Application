import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamGameLog = ({ teamData, year }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  useEffect(() => {
    const fetchGamesAndStats = async () => {
      console.log('Fetching games and stats for teamId:', teamData.id, 'year:', year);
      try {
        setLoading(true);
        // Fetch games
        const gamesResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${teamData.id}/${year}/games`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!gamesResponse.ok) {
          const errorText = await gamesResponse.text();
          throw new Error(`Failed to fetch games: ${gamesResponse.status} - ${errorText}`);
        }
        const gamesData = await gamesResponse.json();
        console.log('Games data received:', gamesData);

        // Fetch stats
        const statsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/teams_stats/${teamData.id}/${year}/stats`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!statsResponse.ok) {
          const errorText = await statsResponse.text();
          throw new Error(`Failed to fetch stats: ${statsResponse.status} - ${errorText}`);
        }
        const statsData = await statsResponse.json();
        console.log('Stats data received:', statsData);

        // Map stats by game_id
        const statsMap = statsData.reduce((map, stat) => {
          map[stat.game_id] = {
            totalYards: stat.totalYards,
            netPassingYards: stat.netPassingYards,
            completionAttempts: stat.completionAttempts,
            rushingYards: stat.rushingYards,
            rushingAttempts: stat.rushingAttempts,
            fumblesLost: stat.fumblesLost,
            interceptions: stat.interceptions,
            possessionTime: stat.possessionTime,
            totalTDs: (parseInt(stat.defensiveTDs || 0) +
                       parseInt(stat.kickReturnTDs || 0) +
                       parseInt(stat.interceptionTDs || 0) +
                       parseInt(stat.passingTDs || 0) +
                       parseInt(stat.puntReturnTDs || 0) +
                       parseInt(stat.rushingTDs || 0)),
          };
          return map;
        }, {});

        // Filter unique games and merge with stats
        const uniqueGames = [];
        const seenGames = new Set();
        const teamGames = gamesData
          .filter(game => {
            const gameKey = `${game.id}-${game.homeId}-${game.awayId}`;
            if (!seenGames.has(gameKey) && (parseInt(game.homeId) === parseInt(teamData.id) || parseInt(game.awayId) === parseInt(teamData.id))) {
              seenGames.add(gameKey);
              return true;
            }
            return false;
          })
          .map(game => {
            const isHome = parseInt(game.homeId) === parseInt(teamData.id);
            console.log(`Game ${game.id}: isHome=${isHome}, homeId=${game.homeId}, awayId=${game.awayId}, teamId=${teamData.id}`);
            return {
              id: game.id,
              date: formatDate(game.startDate),
              teamPoints: isHome ? game.homePoints : game.awayPoints,
              opponentPoints: isHome ? game.awayPoints : game.homePoints,
              opponent: isHome ? game.awayTeam : game.homeTeam,
              opponentId: isHome ? game.awayId : game.homeId,
              isHomeGame: isHome,
              ...statsMap[game.id] || {},
            };
          })
          .sort((a, b) => new Date(`2025-${a.date}`) - new Date(`2025-${b.date}`));

        setGames(teamGames);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (teamData?.id && !isNaN(parseInt(year))) {
      fetchGamesAndStats();
    } else {
      setError('Invalid team data or year');
      setLoading(false);
    }
  }, [teamData, year]);

  if (loading) return <div className="p-0 text-gray-500">Loading game log...</div>;
  if (error) return <div className="p-0 text-red-500">Error: {error}</div>;

  return (
    <div className="relative">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-white z-10">
          <tr>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Date</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Score</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Opponent</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Total Yards</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Comp-Att</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Pass Yards</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Rush Att</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Rush Yards</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>FUM</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>INT</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>TOP</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>TD</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game, index) => {
            const hasScore = game.teamPoints != null && game.opponentPoints != null;
            const winLoss = game.teamPoints > game.opponentPoints ? 'W' : game.teamPoints < game.opponentPoints ? 'L' : '';
            const gameScore = !hasScore ? (
              <span>
                {winLoss && (
                  <span style={{ color: winLoss === 'W' ? 'green' : 'red', marginRight: '4px' }}>
                    {winLoss}
                  </span>
                )}
                {`${game.teamPoints ?? '-'}-${game.opponentPoints ?? '-'}`}
              </span>
            ) : (
              <span>
                {winLoss && (
                  <span style={{ color: winLoss === 'W' ? 'green' : 'red', marginRight: '4px' }}>
                    {winLoss}
                  </span>
                )}
                <span
                  className="text-black hover:text-blue underline underline-offset-2 inline-block cursor-pointer"
                  style={{ display: 'inline-block', lineHeight: '1.1' }}
                  onClick={() => setShowComingSoon(true)}
                >
                  {`${game.teamPoints}-${game.opponentPoints}`}
                </span>
              </span>
            );

            return (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-gray-200'}>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.date}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {gameScore}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.opponentId ? (
                    <>
                      <span>{game.isHomeGame ? 'vs' : 'at'} </span>
                      <Link
                        to={`/teams/${game.opponentId}/${year}`}
                        className="text-gray-700 hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
                        style={{ display: 'inline-block' }}
                      >
                        {game.opponent.charAt(0).toUpperCase() + game.opponent.slice(1)}
                      </Link>
                    </>
                  ) : (
                    `${game.isHomeGame ? 'vs' : 'at'} ${game.opponent.charAt(0).toUpperCase() + game.opponent.slice(1) || '-'}`
                  )}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.totalYards || '-'}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.completionAttempts || '-'}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.netPassingYards || '-'}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.rushingAttempts || '-'}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.rushingYards || '-'}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.fumblesLost || '-'}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.interceptions || '-'}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.possessionTime || '-'}
                </td>
                <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                  {game.totalTDs || '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {showComingSoon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <p className="text-lg font-semibold text-black">Game Recaps Coming Soon</p>
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

export default TeamGameLog;