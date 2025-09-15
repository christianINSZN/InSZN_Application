import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const GameLog = ({ teamGames, weeklyGrades, weeklyBlockingGrades, year }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  useEffect(() => {
    // Removed console.log for brevity
  }, [teamGames, weeklyGrades, weeklyBlockingGrades, year]);

  const sortedGames = [...teamGames].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return isNaN(dateA) ? a.week - b.week : dateA - dateB;
  });

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
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>RecG</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>RBG</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>PBG</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>TAR</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>REC</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>YPC</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>LONG</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>YDS</th>
              <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>TD</th>
            </tr>
          </thead>
          <tbody>
            {sortedGames.map((game, index) => {
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
              
              let weekBlockingGrade = weeklyBlockingGrades[weekGradeKey] || {};
              if (!weekBlockingGrade && seasonType === 'postseason') {
                const matchingGrade = Object.values(weeklyBlockingGrades).find(g => g && g.startDate === game.startDate);
                if (matchingGrade) weekBlockingGrade = matchingGrade;
              }

              // Determine win/loss based on playerTeam's points
              const playerPoints = isHomeGame ? game.homePoints : game.awayPoints;
              const opponentPoints = isHomeGame ? game.awayPoints : game.homePoints;
              const winLoss = playerPoints > opponentPoints ? "W" : playerPoints < opponentPoints ? "L" : ""; // Tie handled as empty
              // Create styled game score
              const scorePart = `${String(game.homePoints)}-${String(game.awayPoints)}`;
              const gameScore = (
                <>
                  
                  {winLoss && (
                    <span style={{ color: winLoss === "W" ? "green" : "red", marginRight: "4px" }}>
                      {winLoss}
                    </span>
                  )}
                  {scorePart}
                </>
              );

              let grades_offense = weekGrade['grades_offense'] !== undefined && weekGrade['grades_offense'] !== null ? weekGrade['grades_offense'].toFixed(1) : 'N/A';
              let grades_pass_route = weekGrade['grades_pass_route'] !== undefined && weekGrade['grades_pass_route'] !== null ? weekGrade['grades_pass_route'].toFixed(1) : 'N/A';
              let grades_run_block = weekBlockingGrade['grades_run_block'] !== undefined && weekBlockingGrade['grades_run_block'] !== null ? weekBlockingGrade['grades_run_block'].toFixed(1) : 'N/A';
              let grades_pass_block = weekBlockingGrade['grades_pass_block'] !== undefined && weekBlockingGrade['grades_pass_block'] !== null ? weekBlockingGrade['grades_pass_block'].toFixed(1) : 'N/A';
              let targets = weekGrade['targets'] !== undefined && weekGrade['targets'] !== null ? weekGrade['targets'] : 'N/A';
              let receptions = weekGrade['receptions'] !== undefined && weekGrade['receptions'] !== null ? weekGrade['receptions'] : 'N/A';
              let yards_per_reception = weekGrade['yards_per_reception'] !== undefined && weekGrade['yards_per_reception'] !== null ? weekGrade['yards_per_reception'] : 'N/A';
              let longest = weekGrade['longest'] !== undefined && weekGrade['longest'] !== null ? weekGrade['longest'] : 'N/A';
              let yards = weekGrade['yards'] !== undefined && weekGrade['yards'] !== null ? weekGrade['yards'] : 'N/A';
              let touchdowns = weekGrade['touchdowns'] !== undefined && weekGrade['touchdowns'] !== null ? weekGrade['touchdowns'] : 'N/A';

              const linkYear = year || game.season;
              const prefix = isHomeGame ? 'vs' : 'at';

              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-navy-400'}>
                  <td className="p-1 text-xs text-middle border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1' }}>{gameDate}</td>
                  <td className="p-1 text-xs text-middle border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1' }}>
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
                      `${prefix} ${opponentTeam.charAt(0).toUpperCase() + opponentTeam.slice(1) || 'N/A'}`
                    )}
                  </td>
                  <td className="p-1 text-xs text-middle border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1' }}>{gameScore}</td>
                  <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_offense}</td>
                  <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_pass_route}</td>
                  <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_run_block}</td>
                  <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_pass_block}</td>
                  <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{targets}</td>
                  <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{receptions}</td>
                  <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{yards_per_reception}</td>
                  <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{longest}</td>
                  <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{yards}</td>
                  <td className="p-1 text-xs text-left border-b border-gray-300" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{touchdowns}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GameLog;