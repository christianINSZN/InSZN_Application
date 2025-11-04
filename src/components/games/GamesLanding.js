// src/components/games/GamesComponent.js
import React, { useEffect, useMemo, useState, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ScoutingReport from './ScoutingReport';
import GameRecap from './GameRecap';

const conferences = [
  'ACC', 'American Athletic', 'Big 12', 'Big Ten', 'Conference USA',
  'FBS Independents', 'Mid-American', 'Mountain West',
  'Pac-12', 'SEC', 'Sun Belt'
];
const filterTabs = ['All', ...conferences];
const weeks = Array.from({ length: 15 }, (_, i) => i + 1);

function GamesComponent({ year = '2025' }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [gamesData, setGamesData] = useState([]);
  const [activeWeek, setActiveWeek] = useState(11); // HERE SET WEEK
  const [activeTab, setActiveTab] = useState('All');
  const [showScoutingReport, setShowScoutingReport] = useState(false);
  const [showGameRecap, setShowGameRecap] = useState(false);
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (isLoading) {
      fetch(`${process.env.REACT_APP_API_URL}/api/teams_games`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(text => {
          if (isMounted) {
            try {
              const data = JSON.parse(text);
              console.log('Raw gamesData:', data);
              const uniqueGames = [];
              const seenIds = new Set();
              for (const game of data) {
                if (!seenIds.has(game.id)) {
                  seenIds.add(game.id);
                  uniqueGames.push(game);
                }
              }
              const validData = Array.isArray(uniqueGames)
                ? uniqueGames.filter(
                    game =>
                      game &&
                      typeof game === 'object' &&
                      game.seasonType === 'regular' &&
                      game.season === parseInt(year) &&
                      (game.homeClassification === 'fbs' || game.awayClassification === 'fbs')
                  )
                : [];
              console.log('Filtered validData:', validData);
              setGamesData(validData);
            } catch (e) {
              console.error('JSON parsing error:', e.message, 'Raw response:', text);
            } finally {
              setIsLoading(false);
            }
          }
        })
        .catch(error => {
          if (isMounted) {
            console.error('API error:', error);
            setIsLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isLoading, year]);

  if (isLoading) {
    return <div className="p-2 sm:p-4"><p className="text-black text-base sm:text-lg">Loading games...</p></div>;
  }
  if (gamesData.length === 0) {
    return <div className="p-2 sm:p-4"><p className="text-black text-base sm:text-lg">No games data available.</p></div>;
  }

  const filteredGames = gamesData.filter(game => {
    const weekMatch = game.week === activeWeek;
    let conferenceMatch = true;
    if (activeTab === 'All') {
      conferenceMatch = true;
    } else if (activeTab === 'Top 25') {
      conferenceMatch = (game.homePregameElo && game.homePregameElo > 1500) || (game.awayPregameElo && game.awayPregameElo > 1500);
    } else {
      conferenceMatch = game.homeConference === activeTab || game.awayConference === activeTab;
    }
    return weekMatch && conferenceMatch;
  });

  console.log('Filtered games:', filteredGames);

  const handleScoutingReportClick = (matchup) => {
    setSelectedMatchup({
      awayId: matchup.awayId,
      homeId: matchup.homeId,
      awayTeamName: matchup.awayTeam,
      homeTeamName: matchup.homeTeam,
      awayTeamLogo: matchup.awayTeamLogo,
      homeTeamLogo: matchup.homeTeamLogo,
    });
    setShowScoutingReport(true);
  };

  const handleGameRecapClick = (game) => {
    setSelectedMatchup({
      awayId: game.awayId,
      homeId: game.homeId,
      awayTeamName: game.awayTeam,
      homeTeamName: game.homeTeam,
      awayTeamLogo: game.awayTeamLogo,
      homeTeamLogo: game.homeTeamLogo,
    });
    setSelectedGameId(game.id);
    setShowGameRecap(true);
  };

  const handleCloseScoutingReport = () => {
    setShowScoutingReport(false);
    setSelectedMatchup(null);
  };

  const handleCloseGameRecap = () => {
    setShowGameRecap(false);
    setSelectedMatchup(null);
    setSelectedGameId(null);
  };

  // NEW: Format "Fri - 6:00PM ET" or "Fri - TBD"
  const formatGameTime = (game) => {
    if (game.startTimeTBD === 1) {
      const date = new Date(game.startDate);
      const weekday = date.toLocaleString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
      return `${weekday} - TBD`;
    }

    const date = new Date(game.startDate);
    const options = {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    };
    return date.toLocaleString('en-US', options)
      .replace(',', '')
      .replace(' PM', 'PM')
      .replace(' AM', 'AM')
      .replace(/ET$/, '') + ' ET';
  };

  return (
    <div className="p-2 sm:p-4 shadow-xl rounded-lg mt-0 sm:mt-12">
      {/* Year + Week Controls */}
      <div className="mb-4 sm:mb-6 mt-3 flex flex-col sm:flex-row items-end gap-4 sm:gap-6 bg-gray-200 p-2 sm:p-4 rounded-lg shadow-xl">
        <div className="w-full">
          <label htmlFor="yearSelect" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
            Year
          </label>
          <select
            id="yearSelect"
            value={year}
            onChange={(e) => navigate(`/games/${e.target.value}`)}
            className="w-full p-2 border border-gray-300 rounded text-black text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#235347]"
          >
            <option value="2025">2025</option>
          </select>
        </div>
        <div className="w-full sm:max-w-[70%]">
          <div className="text-sm sm:text-base font-medium text-gray-700 mb-1">Week</div>
          <div className="block sm:hidden">
            <select
              value={activeWeek}
              onChange={(e) => setActiveWeek(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded text-black text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#235347]"
            >
              {weeks.map(week => (
                <option key={week} value={week}>
                  {week}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block">
            <div className="overflow-x-auto whitespace-nowrap">
              <div className="flex flex-row gap-0">
                {weeks.map(week => (
                  <button
                    key={week}
                    className={`w-12 sm:w-16 md:w-20 h-8 sm:h-10 md:h-12 text-center text-sm sm:text-base ${
                      activeWeek === week ? 'bg-[#235347] text-white' : 'bg-gray-200 hover:bg-gray-300'
                    } border border-gray-300`}
                    onClick={() => setActiveWeek(week)}
                  >
                    {week}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFERENCE TABS */}
      <div className="border-b border-gray-300 mb-4 sm:mb-6">
        <div className="overflow-x-auto whitespace-nowrap py-2">
          <ul className="flex gap-2 sm:gap-4 px-4 min-w-max">
            {filterTabs.map(tab => (
              <li key={tab}>
                <button
                  className={`text-black hover:text-gray-900 pb-2 border-b-2 text-sm sm:text-base px-2 sm:px-3 py-1 rounded ${
                    activeTab === tab ? 'border-[#235347] bg-[#235347]/10' : 'border-transparent hover:border-[#235347]'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 p-2 sm:p-4">
        {filteredGames.map((game, index) => {
          const homeWins = game.homePoints !== null && game.awayPoints !== null && game.homePoints > game.awayPoints;
          const awayWins = game.awayPoints !== null && game.homePoints !== null && game.awayPoints > game.homePoints;
          const isFBSMatchup = conferences.includes(game.homeConference) && conferences.includes(game.awayConference);
          const isClickable = game.completed === 1;

          const handleContainerClick = (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) return;
            if (isClickable) {
              navigate(`/games/recap/${game.id}`);
            }
          };

          const formattedTime = formatGameTime(game);

          return (
            <div
              key={game.id || index}
              className={`p-2 sm:p-4 shadow-xl rounded-lg bg-white border border-gray-200 h-24 flex flex-col justify-between ${
                isClickable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
              }`}
              onClick={handleContainerClick}
            >
              <div className="flex justify-between items-center min-h-[1.5rem]">
                <div className="text-xs sm:text-sm text-gray-600">
                  {formattedTime}
                </div>
                {game.completed === 0 ? (
                  isFBSMatchup ? (
                    <div>
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleScoutingReportClick(game);
                        }}
                        className="text-blue-500 hover:text-blue-700 underline text-xs sm:text-sm"
                      >
                        Scouting Report
                      </Link>
                    </div>
                  ) : null
                ) : (
                  <div>
                    <Link
                      to="#"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleGameRecapClick(game);
                      }}
                      className="text-blue-500 hover:text-blue-700 underline text-xs sm:text-sm"
                    >
                      Game Summary
                    </Link>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center h-full">
                <div className="text-sm sm:text-base text-left">
                  <div className="flex items-center">
                    {game.awayTeamLogo && <img src={game.awayTeamLogo} alt={`${game.awayTeam} logo`} className="w-6 h-6 sm:w-5 h-5 mr-1 sm:mr-2" />}
                    <Link
                      to={`/teams/${game.awayId}/${year}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`inline ${awayWins ? 'font-bold' : ''}`}
                    >
                      {game.awayTeam}
                    </Link>
                  </div>
                  <div className="flex items-center">
                    {game.homeTeamLogo && <img src={game.homeTeamLogo} alt={`${game.homeTeam} logo`} className="w-6 h-6 sm:w-5 h-5 mr-1 sm:mr-2" />}
                    <Link
                      to={`/teams/${game.homeId}/${year}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`inline ${homeWins ? 'font-bold' : ''}`}
                    >
                      {game.homeTeam}
                    </Link>
                  </div>
                </div>
                <div className="text-sm sm:text-base text-right">
                  <div>{awayWins ? <span className="font-bold">{game.awayPoints ?? '-'}</span> : game.awayPoints ?? '-'}</div>
                  <div>{homeWins ? <span className="font-bold">{game.homePoints ?? '-'}</span> : game.homePoints ?? '-'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showScoutingReport && selectedMatchup && (
        <ScoutingReport
          matchup={selectedMatchup}
          onClose={handleCloseScoutingReport}
          year={year}
        />
      )}
      {showGameRecap && selectedMatchup && selectedGameId && (
        <GameRecap
          matchup={selectedMatchup}
          gameId={selectedGameId}
          year={year}
          onClose={handleCloseGameRecap}
        />
      )}
    </div>
  );
}

export default memo(GamesComponent);