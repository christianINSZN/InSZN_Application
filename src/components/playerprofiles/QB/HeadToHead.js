import React, { useState, useEffect, createContext } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import HeadToHeadContainer from './HeadToHead/HeadToHeadContainer';
import ContainerB from './HeadToHead/ContainerB';
import AttributionRadial from './HeadToHead/ContainerA';
import Header from './Overview/Header';

export const WeeklyGradesContext = createContext({});

function HeadToHeadQB() {
  const { playerId } = useParams();
  const location = useLocation();
  const { user } = useClerk();
  const year = location.state?.year || '2025';
  const [playerData, setPlayerData] = useState(null);
  const [basicData, setBasicData] = useState(null);
  const [teamGames, setTeamGames] = useState([]);
  const [weeklyGrades, setWeeklyGrades] = useState({ player1: {}, player2: {} });
  const [percentileGrades, setPercentileGrades] = useState(null);
  const [comparisonPlayers, setComparisonPlayers] = useState({ player1: null, player2: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
    const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium' ;
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    const fetchPlayerData = async () => {
      setLoading(true);
      try {
        const [gradesResponse, basicResponse, gamesResponse, percentilesResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/player_headline/${year}/${playerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${process.env.REACT_APP_API_URL}/api/player_metadata/${year}/${playerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${process.env.REACT_APP_API_URL}/api/player_games/${year}/${playerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_QB/${playerId}/${year}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);
        if (!gradesResponse.ok) throw new Error(`Failed to fetch grades data: ${await gradesResponse.text()}`);
        if (!basicResponse.ok) throw new Error(`Failed to fetch basic data: ${await basicResponse.text()}`);
        if (!gamesResponse.ok) throw new Error(`Failed to fetch team games data: ${await gamesResponse.text()}`);
        if (!percentilesResponse.ok) throw new Error(`Failed to fetch percentile data: ${await percentilesResponse.text()}`);
        const gradesData = await gradesResponse.json();
        const basicData = await basicResponse.json();
        const gamesData = await gamesResponse.json();
        const percentileGradesData = await percentilesResponse.json();
        console.log('Player 1 gradesData:', gradesData);
        console.log('Player 1 basicData:', basicData);
        console.log('Player 1 teamGames:', gamesData);
        console.log('Player 1 percentileGradesData:', percentileGradesData);
        setPlayerData(gradesData[0] || null);
        setBasicData(Array.isArray(basicData) ? basicData[0] : basicData);
        setTeamGames(gamesData || []);
        setPercentileGrades(percentileGradesData);
        setComparisonPlayers(prev => ({
          ...prev,
          player1: { playerId, year, name: gradesData[0]?.name || 'Unknown' },
        }));
        if (!gamesData || gamesData.length === 0) {
          console.warn('No games data for player1, setting empty weeklyGrades.player1');
          setWeeklyGrades(prev => ({ ...prev, player1: {} }));
          return;
        }
        const gradesPromises = gamesData.map(game => {
          const url = `${process.env.REACT_APP_API_URL}/api/player_passing_weekly_all/${playerId}/${year}/${game.week}/${game.seasonType}`;
          console.log(`Fetching grades for player1: ${url}`);
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
              return response.json().then(data => {
                console.log(`Grades data for ${url}:`, data);
                return { week: game.week, seasonType: game.seasonType, data: Array.isArray(data) && data.length > 0 ? data[0] : null };
              });
            });
        });
        const gradesResults = await Promise.all(gradesPromises);
        console.log('Player 1 gradesResults:', gradesResults);
        setWeeklyGrades(prev => {
          const newGrades = {
            ...prev,
            player1: gradesResults.reduce((acc, { week, seasonType, data }) => ({
              ...acc,
              [`${week}_${seasonType}`]: data || null,
            }), {}),
          };
          console.log('Set weeklyGrades.player1:', newGrades);
          return newGrades;
        });
      } catch (err) {
        console.error('Fetch player1 error:', err.message);
        setError(err.message);
        setWeeklyGrades(prev => ({ ...prev, player1: {} }));
      } finally {
        setLoading(false);
      }
    };
    if (playerId) {
      console.log('useParams playerId:', playerId);
      fetchPlayerData();
    }
  }, [playerId, year]);

  useEffect(() => {
    const fetchPlayer2Grades = async () => {
      if (comparisonPlayers.player2?.playerId && comparisonPlayers.player2?.year) {
        const player2Id = comparisonPlayers.player2.playerId;
        const player2Year = comparisonPlayers.player2.year;
        try {
          const gamesResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/player_games/${player2Year}/${player2Id}`);
          if (!gamesResponse.ok) throw new Error(`Failed to fetch team games data for player2: ${await gamesResponse.text()}`);
          const gamesData = await gamesResponse.json();
          console.log('Player 2 teamGames:', gamesData);
          if (!gamesData || gamesData.length === 0) {
            console.warn('No games data for player2, setting empty weeklyGrades.player2');
            setWeeklyGrades(prev => ({ ...prev, player2: {} }));
            return;
          }
          const gradesPromises = gamesData.map(game => {
            const url = `${process.env.REACT_APP_API_URL}/api/player_passing_weekly_all/${player2Id}/${player2Year}/${game.week}/${game.seasonType}`;
            console.log(`Fetching grades for player2: ${url}`);
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
                return response.json().then(data => {
                  console.log(`Grades data for ${url}:`, data);
                  return { week: game.week, seasonType: game.seasonType, data: Array.isArray(data) && data.length > 0 ? data[0] : null };
                });
              });
          });
          const gradesResults = await Promise.all(gradesPromises);
          console.log('Player 2 gradesResults:', gradesResults);
          setWeeklyGrades(prev => {
            const newGrades = {
              ...prev,
              player2: gradesResults.reduce((acc, { week, seasonType, data }) => ({
                ...acc,
                [`${week}_${seasonType}`]: data || null,
              }), {}),
            };
            console.log('Set weeklyGrades.player2:', newGrades);
            return newGrades;
          });
        } catch (err) {
          console.error(`Error fetching player2 grades: ${err.message}`);
          setWeeklyGrades(prev => ({ ...prev, player2: {} }));
        }
      }
    };
    console.log('comparisonPlayers:', comparisonPlayers);
    fetchPlayer2Grades();
  }, [comparisonPlayers.player2]);

  if (loading) return <div className="p-2 sm:p-4 text-gray-500 text-sm sm:text-base">Loading...</div>;
  if (error) return <div className="p-2 sm:p-4 text-red-500 text-sm sm:text-base">Error: {error}</div>;
  if (!playerData || !basicData) return <div className="p-2 sm:p-4 text-gray-500 text-sm sm:text-base">No player data available.</div>;

  const { name, school, position, yards, touchdowns, interceptions, grades_pass } = playerData;
  const [firstName, lastName] = name ? name.split(' ') : ['', ''];
  const { height, weight, jersey } = basicData;
  const teamID = basicData && 'teamID' in basicData ? basicData.teamID : (teamGames.length > 0 ? teamGames[0].homeId || teamGames[0].awayId : null);
  const isOverviewActive = location.pathname === `/players/qb/${playerId}`;
  const isPassingActive = location.pathname === `/players/qb/${playerId}/passing`;
  const isFieldViewActive = location.pathname === `/players/qb/${playerId}/fieldview`;
  const isH2hActive = location.pathname === `/players/qb/${playerId}/h2h`;
  const gradesData = {
    yards,
    touchdowns,
    interceptions,
    grades_pass,
  };
  const excludedMetrics = ['bats', 'pressure_to_sack_rate', 'sack_percent', 'sacks', 'scrambles', 'spikes', 'thrown_aways'];
  const metricRenames = {
    'ypa': 'YPA',
    'btt_rate': 'Big Time Throw Rate',
    'qb_rating': 'QB Rating',
    'twp_rate': 'Turnover Worthy Play Rate',
  };

  return (
    <WeeklyGradesContext.Provider value={weeklyGrades}>
      <div className="w-full min-h-fit overflow-y-auto bg-gray-50">
        <div className="px-2 sm:px-0 py-4 sm:py-8">
          <Header
            firstName={firstName}
            lastName={lastName}
            school={school}
            position={position}
            jersey={jersey}
            height={height}
            weight={weight}
            year={year}
            playerId={playerId}
            gradesData={gradesData}
            className="text-sm sm:text-base"
          />
          <div className="border-b border-gray-300 mb-4 sm:mb-4">
            <ul className="flex gap-1 sm:gap-4">
              <li>
                <Link
                  to={`/players/qb/${playerId || ''}`}
                  state={{ year }}
                  className={`text-[#235347] hover:text-[#235347] pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isOverviewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/qb/${playerId || ''}/passing`}
                  state={{ year }}
                  className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isPassingActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                >
                  Passing Analytics
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/qb/${playerId || ''}/fieldview`}
                  state={{ year }}
                  className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isFieldViewActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                >
                  FieldView
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/qb/${playerId || ''}/h2h`}
                  state={{ year }}
                  className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isH2hActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Head-to-Head
                </Link>
              </li>
            </ul>
          </div>
          <div className="relative">
            {isSubscribed ? (
              isMobile ? (
                <div className="flex flex-col gap-2 w-full p-2">
                  <HeadToHeadContainer year={year} onPlayerDataChange={setComparisonPlayers} />
                  <ContainerB
                    player1={comparisonPlayers.player1}
                    player2={comparisonPlayers.player2}
                    excludedMetrics={excludedMetrics}
                    metricRenames={metricRenames}
                  />
                  <AttributionRadial
                    player1={comparisonPlayers.player1}
                    player2={comparisonPlayers.player2}
                    excludedMetrics={excludedMetrics}
                    metricRenames={metricRenames}
                  />
                </div>
              ) : (
                <div className="w-full p-4">
                  <div className="grid grid-cols-[10%,70%,10%] gap-20" style={{ gridTemplateColumns: '10% 70% 10%' }}>
                    <div className="bg-gradient-to-b from-[#235347] to-gray-100 h-full ml-10"></div>
                    <div className="p-0 col-span-1 ml-5 mr-5">
                      <HeadToHeadContainer year={year} onPlayerDataChange={setComparisonPlayers} />
                    </div>
                    <div className="bg-gradient-to-b from-[#235347] to-gray-100 h-full mr-10"></div>
                  </div>
                  <div className="w-[100%] mx-auto grid grid-cols-[69%_30%] gap-4 mt-4">
                    <div className="bg-white rounded-lg shadow">
                      <ContainerB
                        player1={comparisonPlayers.player1}
                        player2={comparisonPlayers.player2}
                        excludedMetrics={excludedMetrics}
                        metricRenames={metricRenames}
                      />
                    </div>
                    <div className="bg-white rounded-lg shadow">
                      <AttributionRadial
                        player1={comparisonPlayers.player1}
                        player2={comparisonPlayers.player2}
                        excludedMetrics={excludedMetrics}
                        metricRenames={metricRenames}
                      />
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="relative">
                {isMobile ? (
                  <div className="flex flex-col gap-2 w-full p-2 filter blur-xs opacity-80">
                    <HeadToHeadContainer year={year} onPlayerDataChange={setComparisonPlayers} />
                    <ContainerB
                      player1={comparisonPlayers.player1}
                      player2={comparisonPlayers.player2}
                      excludedMetrics={excludedMetrics}
                      metricRenames={metricRenames}
                    />
                    <AttributionRadial
                      player1={comparisonPlayers.player1}
                      player2={comparisonPlayers.player2}
                      excludedMetrics={excludedMetrics}
                      metricRenames={metricRenames}
                    />
                  </div>
                ) : (
                  <div className="w-full p-4 filter blur-xs opacity-80">
                    <div className="grid grid-cols-[10%,70%,10%] gap-20" style={{ gridTemplateColumns: '10% 70% 10%' }}>
                      <div className="bg-gradient-to-b from-[#235347] to-gray-100 h-full ml-10"></div>
                      <div className="p-0 col-span-1 ml-5 mr-5">
                        <HeadToHeadContainer year={year} onPlayerDataChange={setComparisonPlayers} />
                      </div>
                      <div className="bg-gradient-to-b from-[#235347] to-gray-100 h-full mr-10"></div>
                    </div>
                    <div className="w-[100%] mx-auto grid grid-cols-[69%_30%] gap-4 mt-4">
                      <div className="bg-white rounded-lg shadow">
                        <ContainerB
                          player1={comparisonPlayers.player1}
                          player2={comparisonPlayers.player2}
                          excludedMetrics={excludedMetrics}
                          metricRenames={metricRenames}
                        />
                      </div>
                      <div className="bg-white rounded-lg shadow">
                        <AttributionRadial
                          player1={comparisonPlayers.player1}
                          player2={comparisonPlayers.player2}
                          excludedMetrics={excludedMetrics}
                          metricRenames={metricRenames}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-filter backdrop-blur-md rounded-lg">
                  <div className="p-4 sm:p-6 bg-white rounded-lg shadow-lg text-center">
                    <p className="text-gray-700 text-sm sm:text-lg font-semibold mb-2">Exclusive Content</p>
                    <p className="text-gray-500 text-sm sm:text-base mb-4">This content is exclusive to INSZN Insider subscribers.</p>
                    <Link
                      to="/subscribe"
                      className="px-3 sm:px-4 py-1 sm:py-2 bg-[#235347] text-white text-sm sm:text-base rounded hover:bg-[#1b3e32]"
                    >
                      Subscribe Now
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </WeeklyGradesContext.Provider>
  );
}

export default HeadToHeadQB;