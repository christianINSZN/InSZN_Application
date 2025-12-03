// src/components/games/GamesComponent.js
import React, { useEffect, useState, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
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
  const { user } = useClerk();
  const [isLoading, setIsLoading] = useState(true);
  const [gamesData, setGamesData] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [activeWeek, setActiveWeek] = useState(14);
  const [activeTab, setActiveTab] = useState('All');
  const [showScoutingReport, setShowScoutingReport] = useState(false);
  const [showGameRecap, setShowGameRecap] = useState(false);
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [showProbabilities, setShowProbabilities] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showConvictionHelp, setShowConvictionHelp] = useState(false);

  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
  const isProOrPremium = subscriptionPlan === 'pro' || subscriptionPlan === 'premium';

  useEffect(() => {
    setShowProbabilities(isProOrPremium);
  }, [isProOrPremium]);

  // Week 15 → "CC"
  const getWeekLabel = (week) => (week === 15 ? 'CC' : week);

  // Fetch games
  useEffect(() => {
    let isMounted = true;
    if (isLoading) {
      fetch(`${process.env.REACT_APP_API_URL}/api/teams_games`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.text();
        })
        .then(text => {
          if (isMounted) {
            try {
              const data = JSON.parse(text);
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
    return () => { isMounted = false; };
  }, [isLoading, year]);

  // Fetch predictions
  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/teams_games_predictions_v2`)
      .then(r => r.json())
      .then(data => {
        const predMap = {};
        data.forEach(p => { predMap[p.game_id] = p; });
        setPredictions(predMap);
      })
      .catch(() => setPredictions({}));
  }, [year]);

  const handleToggleClick = (e) => {
    if (!isProOrPremium) {
      e.preventDefault();
      setShowSubscribeModal(true);
    } else {
      setShowProbabilities(e.target.checked);
    }
  };

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

  const handleScoutingReportClick = (matchup) => {
    setSelectedMatchup({
      id: matchup.id,
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
      id: game.id,
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
    <div className="p-2 sm:p-4 shadow-xl rounded-lg mt-0 sm:mt-12 relative">
      {/* Year & Week Selector */}
      <div className="mb-4 sm:mb-6 mt-3 flex flex-col sm:flex-row items-end gap-4 sm:gap-6 bg-gray-200 p-2 sm:p-4 rounded-lg shadow-xl">
        <div className="w-full">
          <label htmlFor="yearSelect" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">Year</label>
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
          {/* Mobile */}
          <div className="block sm:hidden">
            <select
              value={activeWeek}
              onChange={(e) => setActiveWeek(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded text-black text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#235347]"
            >
              {weeks.map(week => (
                <option key={week} value={week}>
                  Week {getWeekLabel(week)}
                </option>
              ))}
            </select>
          </div>
          {/* Desktop */}
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
                    {getWeekLabel(week)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conference Tabs */}
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

      {/* Win Probability Toggle */}
      <div className="flex justify-end mb-4 px-4">
        <label className="flex items-center cursor-pointer" onClick={handleToggleClick}>
          <input
            type="checkbox"
            checked={isProOrPremium ? showProbabilities : false}
            readOnly
            className="sr-only peer"
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#235347]"></div>
          <span className="ms-3 text-sm font-medium text-gray-700">Show INSZN AI Win Prediction %</span>
        </label>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2 sm:p-4">
        {filteredGames.map((game, index) => {
          const homeWins = game.homePoints !== null && game.awayPoints !== null && game.homePoints > game.awayPoints;
          const awayWins = game.awayPoints !== null && game.homePoints !== null && game.awayPoints > game.homePoints;
          const isFBSMatchup = conferences.includes(game.homeConference) && conferences.includes(game.awayConference);
          const isClickable = game.completed === 1;
          const pred = predictions[game.id];
          const homeProb = pred?.predicted_home_win_prob != null ? (100 * pred.predicted_home_win_prob).toFixed(0) + '%' : '';
          const awayProb = pred?.predicted_home_win_prob != null ? (100 * (1 - pred.predicted_home_win_prob)).toFixed(0) + '%' : '';
          const homeSpread = pred?.spread != null ? pred.spread.toFixed(1) : null;
          const hasConviction = showProbabilities && pred?.conviction != null;

          const handleContainerClick = (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) return;
            if (isClickable) navigate(`/games/recap/${game.id}`);
          };

          const formattedTime = formatGameTime(game);

          return (
            <div
              key={game.id || index}
              className={`bg-white border border-gray-200 rounded-lg shadow-xl p-4 flex flex-col ${
                hasConviction ? 'h-40' : 'h-36'
              } ${isClickable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
              onClick={handleContainerClick}
            >
              {/* Header */}
              <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600 mb-2">
                <div>
                  {formattedTime}
                  {showProbabilities && homeSpread !== null && (
                    <span className="ml-2 font-medium">
                      [{game.homeTeam}: {homeSpread.startsWith('-') ? homeSpread : `+${homeSpread}`}]
                    </span>
                  )}
                </div>
                {game.completed === 0 ? (
                  isFBSMatchup ? (
                    <Link
                      to="#"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleScoutingReportClick(game); }}
                      className="text-blue-500 hover:text-blue-700 underline"
                    >
                      Scouting Report
                    </Link>
                  ) : null
                ) : (
                  <Link
                    to="#"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGameRecapClick(game); }}
                    className="text-blue-500 hover:text-blue-700 underline"
                  >
                    Game Summary
                  </Link>
                )}
              </div>

              {/* Teams */}
              <div className="flex-1 flex flex-col justify-center">
                {/* Away */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center flex-1">
                    {game.awayTeamLogo && <img src={game.awayTeamLogo} alt="" className="w-6 h-6 mr-2" />}
                    <Link
                      to={`/teams/${game.awayId}/${year}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-sm sm:text-base ${awayWins ? 'font-bold' : ''}`}
                    >
                      {game.awayTeam}
                    </Link>
                    {showProbabilities && awayProb && (
                      <span className={`ml-2 text-xs font-medium ${parseFloat(awayProb) > 50 ? 'text-green-600' : 'text-red-600'}`}>
                        ({awayProb})
                      </span>
                    )}
                  </div>
                  <div className="text-sm sm:text-base text-right w-12">
                    {awayWins ? <strong>{game.awayPoints ?? '-'}</strong> : (game.awayPoints ?? '-')}
                  </div>
                </div>

                {/* Home */}
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center flex-1">
                    {game.homeTeamLogo && <img src={game.homeTeamLogo} alt="" className="w-6 h-6 mr-2" />}
                    <Link
                      to={`/teams/${game.homeId}/${year}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-sm sm:text-base ${homeWins ? 'font-bold' : ''}`}
                    >
                      {game.homeTeam}
                    </Link>
                    {showProbabilities && homeProb && (
                      <span className={`ml-2 text-xs font-medium ${parseFloat(homeProb) > 50 ? 'text-green-600' : 'text-red-600'}`}>
                        ({homeProb})
                      </span>
                    )}
                  </div>
                  <div className="text-sm sm:text-base text-right w-12">
                    {homeWins ? <strong>{game.homePoints ?? '-'}</strong> : (game.homePoints ?? '-')}
                  </div>
                </div>

                {/* Conviction */}
                {hasConviction && (
                  <div className="text-center mt-4 pt-3 border-t border-gray-200 text-xs">
                    <span className="text-gray-600 font-medium">Pick Conviction: </span>
                    <span className={`font-bold ${
                      pred.conviction >= 0.80 ? 'text-green-700' :
                      pred.conviction >= 0.60 ? 'text-green-600' :
                      pred.conviction >= 0.40 ? 'text-yellow-600' :
                      pred.conviction >= 0.20 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {pred.conviction >= 0.80 ? 'LOCK' :
                       pred.conviction >= 0.60 ? 'HIGH' :
                       pred.conviction >= 0.40 ? 'MEDIUM' :
                       pred.conviction >= 0.20 ? 'LOW' :
                       'TOSS-UP'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowConvictionHelp(true);
                      }}
                      className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-500 text-white text-[10px] font-bold hover:bg-gray-600 transition"
                    >
                      ?
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSubscribeModal(false)}>
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">INSZN Insider Required</h3>
            <p className="text-sm text-gray-600 mb-4">Win probabilities are exclusive to INSZN Insider subscribers.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubscribeModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                Cancel
              </button>
              <Link to="/subscribe" onClick={() => setShowSubscribeModal(false)} className="flex-1 px-4 py-2 bg-[#235347] text-white rounded hover:bg-[#1b3e32] text-center">
                Subscribe Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Conviction Help Modal */}
      {showConvictionHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4" onClick={() => setShowConvictionHelp(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-screen overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Conviction Tiers & Historical Accuracy</h3>
              <button onClick={() => setShowConvictionHelp(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="font-bold text-green-700">LOCK</div>
                <div><strong>Historical Accuracy: ~92%</strong></div>
                <div>Extremely confident prediction — our strongest plays</div>
                <div className="text-gray-600 text-xs mt-1">Ex: Top-5 team vs unranked opponent</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="font-bold text-green-600">HIGH</div>
                <div><strong>Historical Accuracy: ~87%</strong></div>
                <div>Strong conviction — very reliable picks</div>
                <div className="text-gray-600 text-xs mt-1">Ex: Ranked team favored by 10+ points</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="font-bold text-yellow-700">MEDIUM</div>
                <div><strong>Historical Accuracy: ~80%</strong></div>
                <div>Favorable odds but not a guarantee</div>
                <div className="text-gray-600 text-xs mt-1">Ex: Ranked team favored by 3–7 points</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="font-bold text-orange-700">LOW</div>
                <div><strong>Historical Accuracy: ~75%</strong></div>
                <div>Slight edge — game could go either way</div>
                <div className="text-gray-600 text-xs mt-1">Ex: Evenly matched conference rivals</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="font-bold text-red-700">TOSS-UP</div>
                <div><strong>Historical Accuracy: ~70%</strong></div>
                <div>Nearly 50/50 — highly unpredictable</div>
                <div className="text-gray-600 text-xs mt-1">Ex: Game with spread less than 3 points or metric conflicting opponents</div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-[#235347]/10 rounded-lg text-center font-semibold text-[#235347]">
              Recommendation: For best results, focus on picks with <strong>HIGH conviction</strong>.<br />
              These games have historically been correct <strong>~87% of the time</strong>.
            </div>
          </div>
        </div>
      )}

      {showScoutingReport && selectedMatchup && (
        <ScoutingReport matchup={selectedMatchup} onClose={handleCloseScoutingReport} year={year} />
      )}
      {showGameRecap && selectedMatchup && selectedGameId && (
        <GameRecap matchup={selectedMatchup} gameId={selectedGameId} year={year} onClose={handleCloseGameRecap} />
      )}
    </div>
  );
}

export default memo(GamesComponent);