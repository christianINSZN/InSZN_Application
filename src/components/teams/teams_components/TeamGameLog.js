import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamGameLog = ({ teamData, year }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  useEffect(() => {
    const fetchGamesAndGrades = async () => {
      console.log('Fetching games and grades for teamId:', teamData.id, 'year:', year);
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

        // Fetch grades
        const gradesResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${teamData.id}/${year}/grades`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!gradesResponse.ok) {
          const errorText = await gradesResponse.text();
          throw new Error(`Failed to fetch grades: ${gradesResponse.status} - ${errorText}`);
        }
        const gradesData = await gradesResponse.json();
        console.log('Grades data received:', gradesData);

        // Map grades by game_id for merging
        const gradesMap = gradesData.reduce((map, grade) => {
          map[grade.game_id] = {
            team_grade_blocking_run: grade.team_grade_blocking_run,
            team_grade_blocking_pass: grade.team_grade_blocking_pass,
            team_grades_run: grade.team_grades_run,
            team_grades_pass: grade.team_grades_pass,
            team_grades_pass_route: grade.team_grades_pass_route,
            opponent_grades_run_defense: grade.opponent_grades_run_defense,
            opponent_grades_pass_rush_defense: grade.opponent_grades_pass_rush_defense,
            opponent_grades_coverage_defense: grade.opponent_grades_coverage_defense,
          };
          return map;
        }, {});

        // Filter unique games and merge with grades
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
              ...gradesMap[game.id] || {}, // Merge grades data
            };
          })
          .sort((a, b) => new Date(`2025-${a.date}`) - new Date(`2025-${b.date}`)); // Updated to 2025

        setGames(teamGames);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (teamData?.id && !isNaN(parseInt(year))) {
      fetchGamesAndGrades();
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
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Run Block</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Pass Block</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Run</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Pass</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Pass Route</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Opp Run Def</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Opp Pass Rush</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800" style={{ textAlign: 'left', lineHeight: '1.2' }}>Opp Coverage</th>
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
                      to={`/teams/${game.opponentId}/${year}`}
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
              <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                {game.team_grade_blocking_run ? game.team_grade_blocking_run.toFixed(1) : 'N/A'}
              </td>
              <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                {game.team_grade_blocking_pass ? game.team_grade_blocking_pass.toFixed(1) : 'N/A'}
              </td>
              <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                {game.team_grades_run ? game.team_grades_run.toFixed(1) : 'N/A'}
              </td>
              <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                {game.team_grades_pass ? game.team_grades_pass.toFixed(1) : 'N/A'}
              </td>
              <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                {game.team_grades_pass_route ? game.team_grades_pass_route.toFixed(1) : 'N/A'}
              </td>
              <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                {game.opponent_grades_run_defense ? game.opponent_grades_run_defense.toFixed(1) : 'N/A'}
              </td>
              <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                {game.opponent_grades_pass_rush_defense ? game.opponent_grades_pass_rush_defense.toFixed(1) : 'N/A'}
              </td>
              <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.2' }}>
                {game.opponent_grades_coverage_defense ? game.opponent_grades_coverage_defense.toFixed(1) : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeamGameLog;