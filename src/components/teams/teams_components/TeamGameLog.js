import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamGameLog = ({ teamData, year, className = "text-sm" }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showFullColumns, setShowFullColumns] = useState(false);
  const isMobile = window.innerWidth < 640;

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
            totalTDs: (
              parseInt(stat.defensiveTDs || 0) +
              parseInt(stat.kickReturnTDs || 0) +
              parseInt(stat.interceptionTDs || 0) +
              parseInt(stat.passingTDs || 0) +
              parseInt(stat.puntReturnTDs || 0) +
              parseInt(stat.rushingTDs || 0)
            ),
          };
          return map;
        }, {});

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
              opponent: isHome ? game.awayTeamAbrev : game.homeTeamAbrev,
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

  if (loading) return <div className={`p-2 text-gray-500 ${className}`}>Loading game log...</div>;
  if (error) return <div className={`p-2 text-red-500 ${className}`}>Error: {error}</div>;

  const columns = [
    { key: 'Date', label: 'Date', align: 'left', minWidth: '60px' },
    { key: 'Score', label: 'Score', align: 'left', minWidth: '60px' },
    { key: 'Opponent', label: 'Opponent', align: 'left', minWidth: '60px' },
    { key: 'TotalYards', label: 'Total Yards', align: 'middle', minWidth: '60px' },
    { key: 'CompAtt', label: 'Comp-Att', align: 'middle', minWidth: '60px' },
    { key: 'PassYards', label: 'Pass Yards', align: 'middle', minWidth: '60px' },
    { key: 'RushAtt', label: 'Rush Att', align: 'middle', minWidth: '60px' },
    { key: 'RushYards', label: 'Rush Yards', align: 'middle', minWidth: '60px' },
    { key: 'FUM', label: 'FUM', align: 'middle', minWidth: '60px' },
    { key: 'INT', label: 'INT', align: 'middle', minWidth: '60px' },
    { key: 'TOP', label: 'TOP', align: 'middle', minWidth: '60px' },
    { key: 'TD', label: 'TD', align: 'middle', minWidth: '60px' },
  ];

  const renderTable = (isFullView) => {
    const visibleColumns = isFullView ? columns : columns.filter(col => col.key === 'Date' || col.key === 'Score' || col.key === 'Opponent');
    return (
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-white z-2">
          <tr>
            {visibleColumns.map(col => (
              <th
                key={col.key}
                className="p-0.5 text-[11px] font-semibold border-b border-gray-400 text-black"
                style={{ textAlign: col.align === 'middle' ? 'center' : 'left', lineHeight: '1.2', minWidth: col.minWidth }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {games.length > 0 ? (
            games.map((game, index) => {
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
              const data = {
                Date: game.date,
                Score: gameScore,
                Opponent: game.opponentId ? (
                  <>
                    <span>{game.isHomeGame ? 'vs' : 'at'} </span>
                    <Link
                      to={`/teams/${game.opponentId}/${year}`}
                      className="text-black hover:text-blue underline underline-offset-2 inline-block cursor-pointer"
                      style={{ display: 'inline-block' }}
                    >
                      {game.opponent.charAt(0).toUpperCase() + game.opponent.slice(1)}
                    </Link>
                  </>
                ) : (
                  `${game.isHomeGame ? 'vs' : 'at'} ${game.opponent.charAt(0).toUpperCase() + game.opponent.slice(1) || '-'}`
                ),
                TotalYards: game.totalYards || '-',
                CompAtt: game.completionAttempts || '-',
                PassYards: game.netPassingYards || '-',
                RushAtt: game.rushingAttempts || '-',
                RushYards: game.rushingYards || '-',
                FUM: game.fumblesLost || '-',
                INT: game.interceptions || '-',
                TOP: game.possessionTime || '-',
                TD: game.totalTDs || '-',
              };
              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#235347]/20'}>
                  {visibleColumns.map(col => (
                    <td
                      key={col.key}
                      className="p-0.5 text-[10px] text-middle"
                      style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: col.align === 'middle' ? 'center' : 'left' }}
                    >
                      {data[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={visibleColumns.length} className={`p-2 text-center text-gray-500 ${className}`}>
                No game data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <div className="bg-gray-100 p-2 sm:p-0 rounded-lg shadow-lg">
      <div className="sm:hidden mb-2">
        <button
          className="bg-[#235347] text-white px-3 py-1 rounded hover:bg-[#1b3e32] text-sm"
          onClick={() => setShowFullColumns(!showFullColumns)}
        >
          {showFullColumns ? 'Display Basic Log' : 'Display Full Log'}
        </button>
      </div>
      <div className={showFullColumns ? 'h-auto sm:h-100 overflow-x-auto sm:overflow-auto relative' : 'h-auto sm:h-100 overflow-x-hidden sm:overflow-auto relative'}>
        {/* Mobile Table */}
        <div className="sm:hidden">
          {renderTable(showFullColumns)}
        </div>
        {/* Non-Mobile Table */}
        <div className="hidden sm:block">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-2">
              <tr>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Date</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Score</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Opponent</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>Total Yards</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>Comp-Att</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>Pass Yards</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>Rush Att</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>Rush Yards</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>FUM</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>INT</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>TD</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>TOP</th>
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
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#235347]/20'}>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>{game.date}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>{gameScore}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>
                      {game.opponentId ? (
                        <>
                          <span>{game.isHomeGame ? 'vs' : 'at'} </span>
                          <Link
                            to={`/teams/${game.opponentId}/${year}`}
                            className="text-black hover:text-blue underline underline-offset-2 inline-block cursor-pointer"
                            style={{ display: 'inline-block' }}
                          >
                            {game.opponent.charAt(0).toUpperCase() + game.opponent.slice(1)}
                          </Link>
                        </>
                      ) : (
                        `${game.isHomeGame ? 'vs' : 'at'} ${game.opponent.charAt(0).toUpperCase() + game.opponent.slice(1) || '-'}`
                      )}
                    </td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{game.totalYards || '-'}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{game.completionAttempts || '-'}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{game.netPassingYards || '-'}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{game.rushingAttempts || '-'}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{game.rushingYards || '-'}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{game.fumblesLost || '-'}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{game.interceptions || '-'}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{game.totalTDs || '-'}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{game.possessionTime || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showComingSoon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-[90%] sm:w-auto">
            <p className="text-sm sm:text-lg font-semibold text-black">Game Recaps Coming Soon</p>
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
  );
};

export default TeamGameLog;