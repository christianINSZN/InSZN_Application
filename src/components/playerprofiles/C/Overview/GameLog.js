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
          { key: 'OBG', label: 'OBG', align: 'middle', minWidth: '60px' },
          { key: 'PBG', label: 'PBG', align: 'middle', minWidth: '60px' },
          { key: 'RBG', label: 'RBG', align: 'middle', minWidth: '60px' },
          { key: 'Snaps', label: 'Snaps', align: 'middle', minWidth: '60px' },
          { key: 'HUR', label: 'HUR', align: 'middle', minWidth: '60px' },
          { key: 'PRS', label: 'PRS', align: 'middle', minWidth: '60px' },
          { key: 'HIT', label: 'HIT', align: 'middle', minWidth: '60px' },
          { key: 'SACK', label: 'SACK', align: 'middle', minWidth: '60px' },
          { key: 'PBE', label: 'PBE', align: 'middle', minWidth: '60px' },
        ]
      : [
          { key: 'Date', label: 'Date', align: 'left', minWidth: '60px' },
          { key: 'Opponent', label: 'Opponent', align: 'left', minWidth: '60px' },
          { key: 'Score', label: 'Score', align: 'left', minWidth: '60px' },
          { key: 'Snaps', label: 'Snaps', align: 'middle', minWidth: '60px' },
          { key: 'HIT', label: 'HIT', align: 'middle', minWidth: '60px' },
          { key: 'SACK', label: 'SACK', align: 'middle', minWidth: '60px' },
          { key: 'PBE', label: 'PBE', align: 'middle', minWidth: '60px' },
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
              OBG: weekGrade['grades_offense'] !== undefined && weekGrade['grades_offense'] !== null ? weekGrade['grades_offense'].toFixed(1) : '-',
              PBG: weekGrade['grades_pass_block'] !== undefined && weekGrade['grades_pass_block'] !== null ? weekGrade['grades_pass_block'].toFixed(1) : '-',
              RBG: weekGrade['grades_run_block'] !== undefined && weekGrade['grades_run_block'] !== null ? weekGrade['grades_run_block'] : '-',
              Snaps: weekGrade['snap_counts_offense'] !== undefined && weekGrade['snap_counts_offense'] !== null ? weekGrade['snap_counts_offense'] : '-',
              HUR: weekGrade['hurries_allowed'] !== undefined && weekGrade['hurries_allowed'] !== null ? weekGrade['hurries_allowed'].toFixed(1) : '-',
              PRS: weekGrade['pressures_allowed'] !== undefined && weekGrade['pressures_allowed'] !== null ? weekGrade['pressures_allowed'] : '-',
              HIT: weekGrade['hits_allowed'] !== undefined && weekGrade['hits_allowed'] !== null ? weekGrade['hits_allowed'] : '-',
              SACK: weekGrade['sacks_allowed'] !== undefined && weekGrade['sacks_allowed'] !== null ? weekGrade['sacks_allowed'] : '-',
              PBE: weekGrade['pbe'] !== undefined && weekGrade['pbe'] !== null ? weekGrade['pbe'] : '-',

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
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>OBG</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>PBG</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>RBG</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>Snaps</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>HUR</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>PRS</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>HIT</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>SACK</th>
                <th className="p-1 text-[13px] font-semibold border-b border-gray-400 text-black" style={{ textAlign: 'middle', lineHeight: '1.2' }}>PBE</th>

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
                let grades_pass_block = weekGrade['grades_pass_block'] !== undefined && weekGrade['grades_pass_block'] !== null ? weekGrade['grades_pass_block'].toFixed(1) : '-';
                let grades_run_block = weekGrade['grades_run_block'] !== undefined && weekGrade['grades_run_block'] !== null ? weekGrade['grades_run_block'] : '-';
                let snap_counts_offense = weekGrade['snap_counts_offense'] !== undefined && weekGrade['snap_counts_offense'] !== null ? weekGrade['snap_counts_offense'] : '-';
                let hurries_allowed = weekGrade['hurries_allowed'] !== undefined && weekGrade['hurries_allowed'] !== null ? weekGrade['hurries_allowed'].toFixed(1) : '-';
                let pressures_allowed = weekGrade['pressures_allowed'] !== undefined && weekGrade['pressures_allowed'] !== null ? weekGrade['pressures_allowed'] : '-';
                let hits_allowed = weekGrade['hits_allowed'] !== undefined && weekGrade['hits_allowed'] !== null ? weekGrade['hits_allowed'] : '-';
                let sacks_allowed = weekGrade['sacks_allowed'] !== undefined && weekGrade['sacks_allowed'] !== null ? weekGrade['sacks_allowed'] : '-';
                let pbe = weekGrade['pbe'] !== undefined && weekGrade['pbe'] !== null ? weekGrade['pbe'] : '-';

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
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{grades_offense}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{grades_pass_block}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{grades_run_block}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{snap_counts_offense}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{hurries_allowed}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{pressures_allowed}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{hits_allowed}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{sacks_allowed}</td>
                    <td className="p-1 text-xs text-middle" style={{ verticalAlign: 'middle', lineHeight: '1.1', textAlign: 'center' }}>{pbe}</td>
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