import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const GameLog = ({ teamGames, weeklyGrades, weeklyBlockingGrades, year }) => {
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showFullColumns, setShowFullColumns] = useState(false);

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
    console.log('GameLog weeklyBlockingGrades:', weeklyBlockingGrades);
  }, [teamGames, weeklyGrades, weeklyBlockingGrades, year]);

  const sortedGames = Array.isArray(teamGames) ? [...teamGames].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return isNaN(dateA) ? a.week - b.week : dateA - dateB;
  }) : [];

  const renderTable = (isFullView) => {
    const columns = isFullView
      ? [
          { key: 'Date', label: 'Date', align: 'left', minWidth: '60px' },
          { key: 'Opponent', label: 'Opponent', align: 'left', minWidth: '60px' },
          { key: 'Score', label: 'Score', align: 'left', minWidth: '60px' },
          { key: 'OVR', label: 'OVR', align: 'middle', minWidth: '60px' },
          { key: 'RecG', label: 'RecG', align: 'middle', minWidth: '60px' },
          { key: 'PassBlock', label: 'PBLK', align: 'middle', minWidth: '60px' },
          { key: 'TAR', label: 'TAR', align: 'middle', minWidth: '60px' },
          { key: 'REC', label: 'REC', align: 'middle', minWidth: '60px' },
          { key: 'YPC', label: 'YPC', align: 'middle', minWidth: '60px' },
          { key: 'LONG', label: 'LONG', align: 'middle', minWidth: '60px' },
          { key: 'YDS', label: 'YDS', align: 'middle', minWidth: '60px' },
          { key: 'TD', label: 'TD', align: 'middle', minWidth: '60px' },
        ]
      : [
          { key: 'Date', label: 'Date', align: 'left', minWidth: '60px' },
          { key: 'Opponent', label: 'Opponent', align: 'left', minWidth: '60px' },
          { key: 'Score', label: 'Score', align: 'left', minWidth: '60px' },
          { key: 'TAR', label: 'TAR', align: 'middle', minWidth: '60px' },
          { key: 'REC', label: 'REC', align: 'middle', minWidth: '60px' },
          { key: 'YDS', label: 'YDS', align: 'middle', minWidth: '60px' },
          { key: 'TD', label: 'TD', align: 'middle', minWidth: '60px' },
        ];

    return (
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-white z-2">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black"
                style={{ textAlign: col.align, lineHeight: '1.2', minWidth: col.minWidth }}
              >
                {col.label}
              </th>
            ))}
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
              let weekBlockingGrade = weeklyBlockingGrades[weekGradeKey] || {};
              if (!weekGrade && seasonType === 'postseason') {
                const matchingGrade = Object.values(weeklyGrades).find(g => g && g.startDate === game.startDate);
                if (matchingGrade) weekGrade = matchingGrade;
              }
              if (!weekBlockingGrade && seasonType === 'postseason') {
                const matchingBlockingGrade = Object.values(weeklyBlockingGrades).find(g => g && g.startDate === game.startDate);
                if (matchingBlockingGrade) weekBlockingGrade = matchingBlockingGrade;
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
                RecG: weekGrade['grades_pass_route'] !== undefined && weekGrade['grades_pass_route'] !== null ? weekGrade['grades_pass_route'].toFixed(1) : '-',
                PassBlock: weekGrade['grades_pass_block'] !== undefined && weekGrade['grades_pass_block'] !== null ? weekGrade['grades_pass_block'].toFixed(1) : '-',
                TAR: weekGrade['targets'] !== undefined && weekGrade['targets'] !== null ? weekGrade['targets'] : '-',
                REC: weekGrade['receptions'] !== undefined && weekGrade['receptions'] !== null ? weekGrade['receptions'] : '-',
                YPC: weekGrade['yards_per_reception'] !== undefined && weekGrade['yards_per_reception'] !== null ? weekGrade['yards_per_reception'].toFixed(1) : '-',
                LONG: weekGrade['longest'] !== undefined && weekGrade['longest'] !== null ? weekGrade['longest'] : '-',
                YDS: weekGrade['yards'] !== undefined && weekGrade['yards'] !== null ? weekGrade['yards'] : '-',
                TD: weekGrade['touchdowns'] !== undefined && weekGrade['touchdowns'] !== null ? weekGrade['touchdowns'] : '-',
              };

              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#235347]/20'}>
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className="p-1 text-xs text-middle"
                      style={{ verticalAlign: 'middle', lineHeight: '1', textAlign: col.align === 'middle' ? 'center' : 'left' }}
                    >
                      {data[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={columns.length} className="p-2 sm:p-4 text-center text-gray-500">
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
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Opponent</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Score</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>OVR</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>RecG</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>PBLK</th>
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
                let weekBlockingGrade = weeklyBlockingGrades[weekGradeKey] || {};
                if (!weekGrade && seasonType === 'postseason') {
                  const matchingGrade = Object.values(weeklyGrades).find(g => g && g.startDate === game.startDate);
                  if (matchingGrade) weekGrade = matchingGrade;
                }
                if (!weekBlockingGrade && seasonType === 'postseason') {
                  const matchingBlockingGrade = Object.values(weeklyBlockingGrades).find(g => g && g.startDate === game.startDate);
                  if (matchingBlockingGrade) weekBlockingGrade = matchingBlockingGrade;
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
                  RecG: weekGrade['grades_pass_route'] !== undefined && weekGrade['grades_pass_route'] !== null ? weekGrade['grades_pass_route'].toFixed(1) : '-',
                  PassBlock: weekGrade['grades_pass_block'] !== undefined && weekGrade['grades_pass_block'] !== null ? weekGrade['grades_pass_block'].toFixed(1) : '-',
                  TAR: weekGrade['targets'] !== undefined && weekGrade['targets'] !== null ? weekGrade['targets'] : '-',
                  REC: weekGrade['receptions'] !== undefined && weekGrade['receptions'] !== null ? weekGrade['receptions'] : '-',
                  YPC: weekGrade['yards_per_reception'] !== undefined && weekGrade['yards_per_reception'] !== null ? weekGrade['yards_per_reception'].toFixed(1) : '-',
                  LONG: weekGrade['longest'] !== undefined && weekGrade['longest'] !== null ? weekGrade['longest'] : '-',
                  YDS: weekGrade['yards'] !== undefined && weekGrade['yards'] !== null ? weekGrade['yards'] : '-',
                  TD: weekGrade['touchdowns'] !== undefined && weekGrade['touchdowns'] !== null ? weekGrade['touchdowns'] : '-',
                };

                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#235347]/20'}>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>{data.Date}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>{data.Opponent}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1' }}>{data.Score}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{data.OVR}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{data.RecG}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{data.PassBlock}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{data.TAR}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{data.REC}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{data.YPC}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{data.LONG}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{data.YDS}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{data.TD}</td>
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
              className="mt-2 sm:mt-4 px-3 sm:px-4 py-1 sm:py-2 bg-[#235347] text-white rounded hover:bg-[#1b3e32] text-sm"
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