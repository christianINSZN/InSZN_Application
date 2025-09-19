import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const GameLog = ({ teamGames, weeklyGrades, year }) => {
  const [showComingSoon, setShowComingSoon] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  useEffect(() => {
    console.log('GameLog teamGames:', teamGames);
    console.log('GameLog weeklyGrades:', weeklyGrades);
  }, [teamGames, weeklyGrades, year]);

  const sortedGames = Array.isArray(teamGames) ? [...teamGames].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return isNaN(dateA) ? a.week - b.week : dateA - dateB;
  }) : [];

  return (
    <div className="bg-gray-100 rounded-lg shadow-lg">
      <div className="h-100 overflow-auto relative">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white z-2">
            <tr>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Date</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Opponent</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Score</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>OVR</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>RG</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>ATT</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>YDS</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>YPC</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>TD</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>FUM</th>
            </tr>
          </thead>
          <tbody>
            {sortedGames.length > 0 ? (
              sortedGames.map((game, index) => {
                const playerTeam = game.team;
                const isHomeGame = playerTeam === game.homeTeam;
                const opponentTeam = isHomeGame ? game.awayTeamAbrev : game.homeTeamAbrev;
                const opponentTeamId = isHomeGame ? game.awayId : game.homeId;
                const gameDate = formatDate(game.startDate);
                const weekStr = String(game.week);
                const seasonType = game.seasonType || 'regular';
                const weekGradeKey = `${weekStr}_${seasonType}`;
                let weekGrade = weeklyGrades[weekGradeKey] || {};
                if (!weekGrade && seasonType === 'postseason') {
                  const matchingGrade = Object.values(weeklyGrades).find(g => g && g.startDate === game.startDate);
                  if (matchingGrade) weekGrade = matchingGrade;
                }

                // Determine win/loss based on playerTeam's points
                const playerPoints = isHomeGame ? game.homePoints : game.awayPoints;
                const opponentPoints = isHomeGame ? game.awayPoints : game.homePoints;
                const winLoss = playerPoints > opponentPoints ? "W" : playerPoints < opponentPoints ? "L" : "";

                // Create game score, showing popup for scored games
                const hasScore = playerPoints != null && opponentPoints != null;
                const gameScore = game.status === 'scheduled' || !hasScore ? (
                  <span>
                    {winLoss && (
                      <span style={{ color: winLoss === "W" ? "green" : "red", marginRight: "4px" }}>
                        {winLoss}
                      </span>
                    )}
                    {`${playerPoints ?? '-'}-${opponentPoints ?? '-'}`}
                  </span>
                ) : (
                  <span>
                    {winLoss && (
                      <span style={{ color: winLoss === "W" ? "green" : "red", marginRight: "4px" }}>
                        {winLoss}
                      </span>
                    )}
                    <span
                      className="text-black hover:text-blue underline underline-offset-2 inline-block cursor-pointer"
                      style={{ display: 'inline-block', lineHeight: '1.1' }}
                      onClick={() => setShowComingSoon(true)}
                    >
                      {`${playerPoints}-${opponentPoints}`}
                    </span>
                  </span>
                );

                let grades_offense = weekGrade['grades_offense'] !== undefined && weekGrade['grades_offense'] !== null ? weekGrade['grades_offense'].toFixed(1) : '-';
                let grades_run = weekGrade['grades_run'] !== undefined && weekGrade['grades_run'] !== null ? weekGrade['grades_run'].toFixed(1) : '-';
                let attempts = weekGrade['attempts'] !== undefined && weekGrade['attempts'] !== null ? weekGrade['attempts'] : '-';
                let yards = weekGrade['yards'] !== undefined && weekGrade['yards'] !== null ? weekGrade['yards'] : '-';
                let ypa = weekGrade['ypa'] !== undefined && weekGrade['ypa'] !== null ? weekGrade['ypa'].toFixed(1) : '-';
                let touchdowns = weekGrade['touchdowns'] !== undefined && weekGrade['touchdowns'] !== null ? weekGrade['touchdowns'] : '-';
                let fumbles = weekGrade['fumbles'] !== undefined && weekGrade['fumbles'] !== null ? weekGrade['fumbles'] : '-';

                const linkYear = year || game.season;
                const prefix = isHomeGame ? 'vs' : 'at';

                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#235347]/20'}>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>{gameDate}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>
                      {opponentTeamId ? (
                        <>
                          <span>{prefix} </span>
                          <Link
                            to={`/teams/${opponentTeamId}/${linkYear}`}
                            className="text-black hover:text-blue underline underline-offset-2 inline-block cursor-pointer"
                            style={{ display: 'inline-block' }}
                          >
                            {opponentTeam.charAt(0).toUpperCase() + opponentTeam.slice(1)}
                          </Link>
                        </>
                      ) : (
                        `${prefix} ${opponentTeam.charAt(0).toUpperCase() + opponentTeam.slice(1) || '-'}`
                      )}
                    </td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>
                      {gameScore}
                    </td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_offense}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_run}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{attempts}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{yards}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{ypa}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{touchdowns}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{fumbles}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" className="p-4 text-center text-gray-500">No game data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

export default GameLog;