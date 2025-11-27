// src/pages/home/WeeklyGames.js
import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ScoutingReport from '../../components/games/ScoutingReport';
import GameRecap from '../../components/games/GameRecap';

const WeeklyGames = ({ year = '2025', week = 14 }) => {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef(null);

  const [showScoutingReport, setShowScoutingReport] = useState(false);
  const [showGameRecap, setShowGameRecap] = useState(false);
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);

  useEffect(() => {
    const fetchWeeklyGames = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams_games`);
        if (!response.ok) throw new Error('Failed to fetch games');
        const data = await response.json();

        const uniqueMap = new Map();
        data.forEach(game => {
          if (game.id) uniqueMap.set(game.id, game);
        });
        const uniqueGames = Array.from(uniqueMap.values());

        const filtered = uniqueGames.filter(game =>
          game.season === parseInt(year) &&
          game.seasonType === 'regular' &&
          game.week === week &&
          (game.homeClassification === 'fbs' || game.awayClassification === 'fbs')
        );

        // SORT: earliest → latest, TBD at end
        const sorted = filtered.sort((a, b) => {
          if (a.startTimeTBD === 1 && b.startTimeTBD !== 1) return 1;
          if (b.startTimeTBD === 1 && a.startTimeTBD !== 1) return -1;
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        setGames(sorted);
      } catch (err) {
        console.error('WeeklyGames fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyGames();
  }, [year, week]);

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.9;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const openScoutingReport = (game) => {
    setSelectedMatchup({
      id: game.id,
      awayId: game.awayId,
      homeId: game.homeId,
      awayTeamName: game.awayTeam,
      homeTeamName: game.homeTeam,
      awayTeamLogo: game.awayTeamLogo,
      homeTeamLogo: game.homeTeamLogo,
    });
    setShowScoutingReport(true);
  };

  const openGameRecap = (game) => {
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

  const closeScoutingReport = () => {
    setShowScoutingReport(false);
    setSelectedMatchup(null);
  };

  const closeGameRecap = () => {
    setShowGameRecap(false);
    setSelectedMatchup(null);
    setSelectedGameId(null);
  };

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

  if (loading) {
    return (
      <div className="mb-0 bg-gray-100 rounded-lg p-0 h-32 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (games.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-0 bg-gray-100 p-0 h-32 relative overflow-hidden">
        {/* Desktop Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-0 bg-white/90 hover:bg-white p-1.5 rounded-r shadow-lg transition-all"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-0 bg-white/90 hover:bg-white p-1.5 rounded-l shadow-lg transition-all"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-700" />
        </button>

        {/* Scrollable Container – LEFT PADDING ONLY */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide h-full pl-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-3 pb-2 h-full items-center">
            {games.map((game) => {
              const homeWins = game.homePoints > game.awayPoints;
              const awayWins = game.awayPoints > game.homePoints;
              const isClickable = game.completed === 1;

              const handleCardClick = (e) => {
                if (e.target.tagName === 'A' || e.target.closest('a')) return;
                if (isClickable) {
                  navigate(`/games/recap/${game.id}`);
                }
              };

              const formattedTime = formatGameTime(game);

              return (
                <div
                  key={game.id}
                  className={`p-2 shadow-xl rounded-lg bg-white border border-gray-200 h-24 flex flex-col justify-between min-w-[180px] flex-shrink-0 ${
                    isClickable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
                  }`}
                  onClick={handleCardClick}
                >
                  <div className="text-xs text-gray-600 text-left">
                    {formattedTime}
                  </div>

                  <div className="flex justify-between items-center flex-1">
                    <div className="text-xs text-left">
                      <div className="flex items-center">
                        {game.awayTeamLogo && (
                          <img src={game.awayTeamLogo} alt="" className="w-5 h-5 mr-1" />
                        )}
                        <Link
                          to={`/teams/${game.awayId}/${year}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`inline ${awayWins ? 'font-bold' : ''}`}
                        >
                          {game.awayTeam}
                        </Link>
                      </div>
                      <div className="flex items-center">
                        {game.homeTeamLogo && (
                          <img src={game.homeTeamLogo} alt="" className="w-5 h-5 mr-1" />
                        )}
                        <Link
                          to={`/teams/${game.homeId}/${year}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`inline ${homeWins ? 'font-bold' : ''}`}
                        >
                          {game.homeTeam}
                        </Link>
                      </div>
                    </div>
                    <div className="text-xs text-right">
                      <div>{awayWins ? <strong>{game.awayPoints}</strong> : game.awayPoints ?? '-'}</div>
                      <div>{homeWins ? <strong>{game.homePoints}</strong> : game.homePoints ?? '-'}</div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    {game.completed === 0 ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openScoutingReport(game);
                        }}
                        className="text-blue-500 hover:text-blue-700 underline text-xs"
                      >
                        Scouting Report
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openGameRecap(game);
                        }}
                        className="text-blue-500 hover:text-blue-700 underline text-xs"
                      >
                        Game Summary
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showScoutingReport && selectedMatchup && (
        <ScoutingReport
          matchup={selectedMatchup}
          onClose={closeScoutingReport}
          year={year}
        />
      )}
      {showGameRecap && selectedMatchup && selectedGameId && (
        <GameRecap
          matchup={selectedMatchup}
          gameId={selectedGameId}
          year={year}
          onClose={closeGameRecap}
        />
      )}
    </>
  );
};

export default WeeklyGames;