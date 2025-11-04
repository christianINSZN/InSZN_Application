import React, { useState, useEffect, createContext, Component } from 'react';
import { useLocation, Link } from 'react-router-dom';
import HeadToHeadContainer from './positions/QB/HeadToHeadContainer';
import ContainerA from './positions/QB/ContainerA';
import ContainerB from './positions/QB/ContainerB';

export const WeeklyGradesContext = createContext({});

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) return <div className="p-4 text-red-500 text-sm sm:text-base">Error: {this.state.error.message}</div>;
    return this.props.children;
  }
}

function HeadToHeadQB() {
  const location = useLocation();
  const year = '2025';
  const [playerData, setPlayerData] = useState({ player1: null, player2: null });
  const [weeklyGrades, setWeeklyGrades] = useState({ player1: {}, player2: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMobile = window.innerWidth < 640;
  const currentDate = new Date('2025-09-27');
  const currentWeek = Math.min(4, Math.ceil((currentDate - new Date(`${year}-09-01`)) / (7 * 24 * 60 * 60 * 1000)));
  const excludedMetrics = ['bats', 'pressure_to_sack_rate', 'sack_percent', 'sacks', 'scrambles', 'spikes', 'thrown_aways'];
  const metricRenames = {
    'ypa': 'YPA',
    'btt_rate': 'Big Time Throw Rate',
    'qb_rating': 'QB Rating',
    'twp_rate': 'Turnover Worthy Play Rate',
  };

  useEffect(() => {
    const fetchPlayerData = async (player, playerKey) => {
      if (!player?.playerId || !player?.year) return;
      setLoading(true);
      try {
        const [gradesResponse, basicResponse, gamesResponse, percentilesResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/player_headline/${player.year}/${player.playerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${process.env.REACT_APP_API_URL}/api/player_metadata/${player.year}/${player.playerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${process.env.REACT_APP_API_URL}/api/player_games/${player.year}/${player.playerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_QB/${player.playerId}/${player.year}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);
        if (!gradesResponse.ok) throw new Error(`Failed to fetch grades data for ${playerKey}: ${await gradesResponse.text()}`);
        if (!basicResponse.ok) throw new Error(`Failed to fetch basic data for ${playerKey}: ${await basicResponse.text()}`);
        if (!gamesResponse.ok) throw new Error(`Failed to fetch games data for ${playerKey}: ${await gamesResponse.text()}`);
        if (!percentilesResponse.ok) throw new Error(`Failed to fetch percentile data for ${playerKey}: ${await percentilesResponse.text()}`);
        const gradesData = await gradesResponse.json();
        const basicData = await basicResponse.json();
        const gamesData = await gamesResponse.json();
        const percentileGradesData = await percentilesResponse.json();
        console.log(`Games data for ${playerKey}:`, gamesData);
        setPlayerData(prev => ({
          ...prev,
          [playerKey]: {
            ...player,
            grades: gradesData[0] || null,
            basic: Array.isArray(basicData) ? basicData[0] : basicData,
            percentiles: percentileGradesData,
          },
        }));
        if (!gamesData || gamesData.length === 0) {
          console.warn(`No games data for ${playerKey}, setting empty weeklyGrades`);
          setWeeklyGrades(prev => ({ ...prev, [playerKey]: {} }));
          return;
        }
        const validGames = gamesData.filter(game => game.week <= currentWeek);
        const uniqueGames = Array.from(
          new Map(validGames.map(game => [`${game.week}_${game.seasonType}`, game])).values()
        );
        const gradesPromises = uniqueGames.map(game => {
          const url = `${process.env.REACT_APP_API_URL}/api/player_passing_weekly_all/${player.playerId}/${player.year}/${game.week}/${game.seasonType}`;
          console.log(`Fetching grades for ${playerKey}: ${url}`);
          return fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
            .catch(error => {
              console.error(`Fetch error for ${url}: ${error.message}`);
              return { ok: false, status: 404, data: null };
            })
            .then(response => {
              if (!response.ok) {
                console.warn(`Response not ok for ${url}: ${response.status}`);
                return { week: game.week, seasonType: game.seasonType, data: null };
              }
              return response.json().then(data => ({
                week: game.week,
                seasonType: game.seasonType,
                data: Array.isArray(data) && data.length > 0 ? data[0] : null,
              }));
            });
        });
        const gradesResults = await Promise.all(gradesPromises);
        console.log(`Grades results for ${playerKey}:`, gradesResults);
        setWeeklyGrades(prev => ({
          ...prev,
          [playerKey]: gradesResults.reduce((acc, { week, seasonType, data }) => ({
            ...acc,
            [`${week}_${seasonType}`]: data || null,
          }), {}),
        }));
      } catch (err) {
        console.error(`Error fetching data for ${playerKey}:`, err.message);
        setError(err.message);
        setWeeklyGrades(prev => ({ ...prev, [playerKey]: {} }));
      } finally {
        setLoading(false);
      }
    };
    if (playerData.player1?.playerId && playerData.player1?.year) {
      fetchPlayerData(playerData.player1, 'player1');
    }
    if (playerData.player2?.playerId && playerData.player2?.year) {
      fetchPlayerData(playerData.player2, 'player2');
    }
  }, [playerData.player1?.playerId, playerData.player1?.year, playerData.player2?.playerId, playerData.player2?.year, currentWeek]);

  if (loading) return <div className="p-4 text-gray-500 text-sm sm:text-base">Loading...</div>;
  if (error) return <div className="p-4 text-red-500 text-sm sm:text-base">Error: {error}</div>;

  return (
    <WeeklyGradesContext.Provider value={weeklyGrades}>
      <div className="w-full min-h-screen bg-gray-50 mt-0 sm:mt-12">
        <div className="border-b border-gray-300 mb-4">
          <ul className={`flex gap-4 px-4 py-2 justify-center ${isMobile ? 'flex-wrap' : ''}`}>
            {[
              { path: '/h2h/qb', label: 'Quarterback' },
              { path: '/h2h/rb', label: 'Running Back' },
              { path: '/h2h/te', label: 'Tight End' },
              { path: '/h2h/wr', label: 'Wide Receiver' },
            ].map(({ path, label }) => (
              <li key={path} className={isMobile ? 'w-auto' : ''}>
                <Link
                  to={path}
                  state={{ year }}
                  className={`block text-[#235347] hover:text-[#1b3e32] px-2 py-2 text-sm border-b-2 ${
                    location.pathname === path
                      ? 'border-[#235347]'
                      : 'border-transparent hover:border-[#235347]'
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <ErrorBoundary>
          {isMobile ? (
            <div className="flex flex-col gap-2 w-full p-4">
              <div className="bg-white rounded-lg shadow">
                <HeadToHeadContainer year={year} onPlayerDataChange={setPlayerData} />
              </div>
            </div>
          ) : (
            <div className="w-full p-4">
              <div className="grid grid-cols-[10%,70%,10%] gap-20" style={{ gridTemplateColumns: '10% 70% 10%' }}>
                <div className="bg-gradient-to-b from-[#235347] to-gray-100 h-full"></div>
                <div className="col-span-1">
                  <div className="bg-white rounded-lg shadow">
                    <HeadToHeadContainer year={year} onPlayerDataChange={setPlayerData} />
                  </div>
                </div>
                <div className="bg-gradient-to-b from-[#235347] to-gray-100 h-full"></div>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </WeeklyGradesContext.Provider>
  );
}

export default HeadToHeadQB;