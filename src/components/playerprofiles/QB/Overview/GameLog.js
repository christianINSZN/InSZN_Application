import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const GameLog = ({ teamGames, weeklyGrades, year }) => {
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showFullColumns, setShowFullColumns] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  useEffect(() => {}, [teamGames, weeklyGrades, year]);

  const sortedGames = [...teamGames].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return isNaN(dateA) ? a.week - b.week : dateA - dateB;
  });

  const renderTable = (isFullView) => {
    const columns = isFullView
      ? [
          { key: 'Date', label: 'Date', align: 'left', minWidth: '60px' },
          { key: 'Opponent', label: 'Opponent', align: 'left', minWidth: '60px' },
          { key: 'Score', label: 'Score', align: 'left', minWidth: '60px' },
          { key: 'OVR', label: 'OVR', align: 'middle', minWidth: '60px' },
          { key: 'PG', label: 'PG', align: 'middle', minWidth: '60px' },
          { key: 'RG', label: 'RG', align: 'middle', minWidth: '60px' },
          { key: 'ATT', label: 'ATT', align: 'middle', minWidth: '60px' },
          { key: 'COMP', label: 'COMP', align: 'middle', minWidth: '60px' },
          { key: 'COMP%', label: 'COMP%', align: 'middle', minWidth: '60px' },
          { key: 'ACC%', label: 'ACC%', align: 'middle', minWidth: '60px' },
          { key: 'YDS', label: 'YDS', align: 'middle', minWidth: '60px' },
          { key: 'TD', label: 'TD', align: 'middle', minWidth: '60px' },
          { key: 'INT', label: 'INT', align: 'middle', minWidth: '60px' },
          { key: 'QBR', label: 'QBR', align: 'middle', minWidth: '60px' },
        ]
      : [
          { key: 'Date', label: 'Date', align: 'left', minWidth: '60px' },
          { key: 'Opponent', label: 'Opponent', align: 'left', minWidth: '60px' },
          { key: 'Score', label: 'Score', align: 'left', minWidth: '60px' },
          { key: 'ATT', label: 'ATT', align: 'middle', minWidth: '60px' },
          { key: 'COMP', label: 'COMP', align: 'middle', minWidth: '60px' },
          { key: 'YDS', label: 'YDS', align: 'middle', minWidth: '60px' },
          { key: 'TD', label: 'TD', align: 'middle', minWidth: '60px' },
          { key: 'INT', label: 'INT', align: 'middle', minWidth: '60px' },
        ];

    return (
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-white z-2">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="p-0.5 text-[11px] font-semibold border-b border-gray-400 text-black"
                style={{ textAlign: col.align, lineHeight: '1.2', minWidth: col.minWidth }}
              >
                {col.label}
              </th>
            ))}
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
            const playerPoints = isHomeGame ? game.homePoints : game.awayPoints;
            const opponentPoints = isHomeGame ? game.awayPoints : game.homePoints;
            const winLoss = playerPoints > opponentPoints ? "W" : playerPoints < opponentPoints ? "L" : "";
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
            const data = {
              Date: gameDate,
              Opponent: opponentTeamId ? (
                <>
                  <span>{isHomeGame ? 'vs' : 'at'} </span>
                  <Link
                    to={`/teams/${opponentTeamId}/${year || game.season}`}
                    className="text-black hover:text-blue underline underline-offset-2 inline-block cursor-pointer"
                    style={{ display: 'inline-block' }}
                  >
                    {opponentTeam.charAt(0).toUpperCase() + opponentTeam.slice(1)}
                  </Link>
                </>
              ) : (
                `${isHomeGame ? 'vs' : 'at'} ${opponentTeam.charAt(0).toUpperCase() + opponentTeam.slice(1) || '-'}`
              ),
              Score: gameScore,
              OVR: weekGrade['grades_offense'] !== undefined && weekGrade['grades_offense'] !== null ? weekGrade['grades_offense'].toFixed(1) : '-',
              PG: weekGrade['grades_pass'] !== undefined && weekGrade['grades_pass'] !== null ? weekGrade['grades_pass'].toFixed(1) : '-',
              RG: weekGrade['grades_run'] !== undefined && weekGrade['grades_run'] !== null ? weekGrade['grades_run'].toFixed(1) : '-',
              ATT: weekGrade['attempts'] !== undefined && weekGrade['attempts'] !== null ? weekGrade['attempts'] : '-',
              COMP: weekGrade['completions'] !== undefined && weekGrade['completions'] !== null ? weekGrade['completions'] : '-',
              'COMP%': weekGrade['completion_percent'] !== undefined && weekGrade['completion_percent'] !== null ? `${weekGrade['completion_percent'].toFixed(1)}%` : '-',
              'ACC%': weekGrade['accuracy_percent'] !== undefined && weekGrade['accuracy_percent'] !== null ? `${weekGrade['accuracy_percent'].toFixed(1)}%` : '-',
              YDS: weekGrade['yards'] !== undefined && weekGrade['yards'] !== null ? weekGrade['yards'] : '-',
              TD: weekGrade['touchdowns'] !== undefined && weekGrade['touchdowns'] !== null ? weekGrade['touchdowns'] : '-',
              INT: weekGrade['interceptions'] !== undefined && weekGrade['interceptions'] !== null ? weekGrade['interceptions'] : '-',
              QBR: weekGrade['qb_rating'] !== undefined && weekGrade['qb_rating'] !== null ? weekGrade['qb_rating'].toFixed(1) : '-',
            };
            return (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#235347]/20'}>
                {columns.map(col => (
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
          })}
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
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Opponent</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Score</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>OVR</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>PG</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>RG</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>ATT</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>COMP</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>COMP%</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>ACC%</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>YDS</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>TD</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>INT</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>QBR</th>
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
                const playerPoints = isHomeGame ? game.homePoints : game.awayPoints;
                const opponentPoints = isHomeGame ? game.awayPoints : game.homePoints;
                const winLoss = playerPoints > opponentPoints ? "W" : playerPoints < opponentPoints ? "L" : "";
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
                let grades_pass = weekGrade['grades_pass'] !== undefined && weekGrade['grades_pass'] !== null ? weekGrade['grades_pass'].toFixed(1) : '-';
                let grades_run = weekGrade['grades_run'] !== undefined && weekGrade['grades_run'] !== null ? weekGrade['grades_run'].toFixed(1) : '-';
                let attempts = weekGrade['attempts'] !== undefined && weekGrade['attempts'] !== null ? weekGrade['attempts'] : '-';
                let completions = weekGrade['completions'] !== undefined && weekGrade['completions'] !== null ? weekGrade['completions'] : '-';
                let completion_percent = weekGrade['completion_percent'] !== undefined && weekGrade['completion_percent'] !== null ? `${weekGrade['completion_percent'].toFixed(1)}%` : '-';
                let accuracy_percent = weekGrade['accuracy_percent'] !== undefined && weekGrade['accuracy_percent'] !== null ? `${weekGrade['accuracy_percent'].toFixed(1)}%` : '-';
                let yards = weekGrade['yards'] !== undefined && weekGrade['yards'] !== null ? weekGrade['yards'] : '-';
                let touchdowns = weekGrade['touchdowns'] !== undefined && weekGrade['touchdowns'] !== null ? weekGrade['touchdowns'] : '-';
                let interceptions = weekGrade['interceptions'] !== undefined && weekGrade['interceptions'] !== null ? weekGrade['interceptions'] : '-';
                let qb_rating = weekGrade['qb_rating'] !== undefined && weekGrade['qb_rating'] !== null ? weekGrade['qb_rating'].toFixed(1) : '-';
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#235347]/20'}>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>{gameDate}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>
                      {opponentTeamId ? (
                        <>
                          <span>{isHomeGame ? 'vs' : 'at'} </span>
                          <Link
                            to={`/teams/${opponentTeamId}/${year || game.season}`}
                            className="text-black hover:text-blue underline underline-offset-2 inline-block cursor-pointer"
                            style={{ display: 'inline-block' }}
                          >
                            {opponentTeam.charAt(0).toUpperCase() + opponentTeam.slice(1)}
                          </Link>
                        </>
                      ) : (
                        `${isHomeGame ? 'vs' : 'at'} ${opponentTeam.charAt(0).toUpperCase() + opponentTeam.slice(1) || '-'}`
                      )}
                    </td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>{gameScore}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_offense}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_pass}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_run}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{attempts}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{completions}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{completion_percent}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{accuracy_percent}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{yards}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{touchdowns}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{interceptions}</td>
                    <td className="p-1 text-xs text-left" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{qb_rating}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showComingSoon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-[90%] sm:w-auto h-[50%] sm:h-auto">
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

export default GameLog;