import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    console.log('GameLog teamGames:', teamGames);
    console.log('GameLog weeklyGrades:', weeklyGrades);
  }, [teamGames, weeklyGrades, year]);

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
          { key: 'ODG', label: 'ODG', align: 'center', minWidth: '60px' },
          { key: 'PRG', label: 'PRG', align: 'center', minWidth: '60px' },
          { key: 'RDG', label: 'RDG', align: 'center', minWidth: '60px' },
          { key: 'Snaps', label: 'Snaps', align: 'center', minWidth: '60px' },
          { key: 'HUR', label: 'HUR', align: 'center', minWidth: '60px' },
          { key: 'PRS', label: 'PRS', align: 'center', minWidth: '60px' },
          { key: 'HIT', label: 'HIT', align: 'center', minWidth: '60px' },
          { key: 'SACK', label: 'SACK', align: 'center', minWidth: '60px' },
          { key: 'TACK', label: 'TACK', align: 'center', minWidth: '60px' },
          { key: 'TLF', label: 'TLF', align: 'center', minWidth: '60px' },
        ]
      : [
          { key: 'Date', label: 'Date', align: 'left', minWidth: '60px' },
          { key: 'Opponent', label: 'Opponent', align: 'left', minWidth: '60px' },
          { key: 'Score', label: 'Score', align: 'left', minWidth: '60px' },
          { key: 'Snaps', label: 'Snaps', align: 'center', minWidth: '60px' },
          { key: 'HIT', label: 'HIT', align: 'center', minWidth: '60px' },
          { key: 'SACK', label: 'SACK', align: 'center', minWidth: '60px' },
          { key: 'TLF', label: 'TLF', align: 'center', minWidth: '60px' },
        ];

    return (
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-white z-2">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="p-1 text-[11px] font-semibold border-b border-gray-400 text-black"
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
                `${isHomeGame ? 'vs' : 'at'} ${opponentTeam.charAt(0).toUpperCase() + opponentTeam.slice(1) || '-' }`
              ),
              Score: gameScore,
              ODG: weekGrade['grades_defense'] !== undefined && weekGrade['grades_defense'] !== null ? weekGrade['grades_defense'].toFixed(1) : '-',
              PRG: weekGrade['grades_pass_rush_defense'] !== undefined && weekGrade['grades_pass_rush_defense'] !== null ? weekGrade['grades_pass_rush_defense'].toFixed(1) : '-',
              RDG: weekGrade['grades_run_defense'] !== undefined && weekGrade['grades_run_defense'] !== null ? weekGrade['grades_run_defense'] : '-',
              Snaps: weekGrade['snap_counts_defense'] !== undefined && weekGrade['snap_counts_defense'] !== null ? weekGrade['snap_counts_defense'] : '-',
              HUR: weekGrade['hurries'] !== undefined && weekGrade['hurries'] !== null ? weekGrade['hurries'].toFixed(1) : '-',
              PRS: weekGrade['total_pressures'] !== undefined && weekGrade['total_pressures'] !== null ? weekGrade['total_pressures'] : '-',
              HIT: weekGrade['hits'] !== undefined && weekGrade['hits'] !== null ? weekGrade['hits'] : '-',
              SACK: weekGrade['sacks'] !== undefined && weekGrade['sacks'] !== null ? weekGrade['sacks'] : '-',
              TACK: weekGrade['tackles'] !== undefined && weekGrade['tackles'] !== null ? weekGrade['tackles'] : '-',
              TLF: weekGrade['tackles_for_loss'] !== undefined && weekGrade['tackles_for_loss'] !== null ? weekGrade['tackles_for_loss'] : '-',
            };
            return (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#235347]/20'}>
                {columns.map(col => (
                  <td
                    key={col.key}
                    className="p-1 text-[10px]"
                    style={{ 
                      verticalAlign: 'middle', 
                      lineHeight: '1.1', 
                      textAlign: col.align 
                    }}
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
        <div className="sm:hidden">
          {renderTable(showFullColumns)}
        </div>
        <div className="hidden sm:block">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-2">
              <tr>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Date</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Opponent</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'left', lineHeight: '1.2' }}>Score</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>ODG</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>PRG</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>RDG</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>Snaps</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>HUR</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>PRS</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>HIT</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>SACK</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>TACK</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'center', lineHeight: '1.2' }}>TFL</th>
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
                let grades_defense = weekGrade['grades_defense'] !== undefined && weekGrade['grades_defense'] !== null ? weekGrade['grades_defense'].toFixed(1) : '-';
                let grades_pass_rush_defense = weekGrade['grades_pass_rush_defense'] !== undefined && weekGrade['grades_pass_rush_defense'] !== null ? weekGrade['grades_pass_rush_defense'].toFixed(1) : '-';
                let grades_run_defense = weekGrade['grades_run_defense'] !== undefined && weekGrade['grades_run_defense'] !== null ? weekGrade['grades_run_defense'] : '-';
                let snap_counts_defense = weekGrade['snap_counts_defense'] !== undefined && weekGrade['snap_counts_defense'] !== null ? weekGrade['snap_counts_defense'] : '-';
                let hurries = weekGrade['hurries'] !== undefined && weekGrade['hurries'] !== null ? weekGrade['hurries'].toFixed(1) : '-';
                let total_pressures = weekGrade['total_pressures'] !== undefined && weekGrade['total_pressures'] !== null ? weekGrade['total_pressures'] : '-';
                let hits = weekGrade['hits'] !== undefined && weekGrade['hits'] !== null ? weekGrade['hits'] : '-';
                let sacks = weekGrade['sacks'] !== undefined && weekGrade['sacks'] !== null ? weekGrade['sacks'] : '-';
                let tackles = weekGrade['tackles'] !== undefined && weekGrade['tackles'] !== null ? weekGrade['tackles'] : '-';
                let tackles_for_loss = weekGrade['tackles_for_loss'] !== undefined && weekGrade['tackles_for_loss'] !== null ? weekGrade['tackles_for_loss'] : '-';

                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#235347]/20'}>
                    <td className="p-1 text-xs" style={{ verticalAlign: 'middle', lineHeight: '1', textAlign: 'left' }}>{gameDate}</td>
                    <td className="p-1 text-xs" style={{ verticalAlign: 'middle', lineHeight: '1', textAlign: 'left' }}>
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
                        `${isHomeGame ? 'vs' : 'at'} ${opponentTeam.charAt(0).toUpperCase() + opponentTeam.slice(1) || '-' }`
                      )}
                    </td>
                    <td className="p-1 text-xs" style={{ verticalAlign: 'middle', lineHeight: '1', textAlign: 'left' }}>{gameScore}</td>
                    <td className="p-1 text-xs text-center" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_defense}</td>
                    <td className="p-1 text-xs text-center" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_pass_rush_defense}</td>
                    <td className="p-1 text-xs text-center" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{grades_run_defense}</td>
                    <td className="p-1 text-xs text-center" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{snap_counts_defense}</td>
                    <td className="p-1 text-xs text-center" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{hurries}</td>
                    <td className="p-1 text-xs text-center" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{total_pressures}</td>
                    <td className="p-1 text-xs text-center" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{hits}</td>
                    <td className="p-1 text-xs text-center" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{sacks}</td>
                    <td className="p-1 text-xs text-center" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{tackles}</td>
                    <td className="p-1 text-xs text-center" style={{ verticalAlign: 'middle', lineHeight: '1.1' }}>{tackles_for_loss}</td>
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