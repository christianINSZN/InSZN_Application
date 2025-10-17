import React, { useState, useEffect, createContext } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Header from './Overview/Header';
import HeadlineAnalytics from './PassingAnalytics/HeadlineAnalytics';
import ProductionContainer from './PassingAnalytics/ProductionContainer';
import ConsistencyContainer from './PassingAnalytics/ConsistencyContainer';
import PocketProduction from './PassingAnalytics/PocketProduction';

export const WeeklyGradesContext = createContext({});

function PassingAnalytics() {
  const { playerId } = useParams();
  const location = useLocation();
  const year = location.state?.year || 2025;
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [basicData, setBasicData] = useState(null);
  const [teamGames, setTeamGames] = useState([]);
  const [weeklyGrades, setWeeklyGrades] = useState({});
  const [percentileGrades, setPercentileGrades] = useState(null);
  const [allPlayerPercentiles, setAllPlayerPercentiles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      setLoading(true);
      try {
        const [gradesResponse, basicResponse, gamesResponse, percentilesResponse, allPercentilesResponse] = await Promise.all([
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
          fetch(`${process.env.REACT_APP_API_URL}/api/all_player_percentiles_QB/${year}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);

        if (!gradesResponse.ok) throw new Error('Failed to fetch grades data');
        if (!basicResponse.ok) throw new Error('Failed to fetch basic data');
        if (!gamesResponse.ok) {
          const errorText = await gamesResponse.text();
          throw new Error(`Failed to fetch team games data: ${errorText}`);
        }
        if (!percentilesResponse.ok) {
          const errorText = await percentilesResponse.text();
          throw new Error(`Failed to fetch percentile data: ${errorText}`);
        }
        if (!allPercentilesResponse.ok) {
          const errorText = await allPercentilesResponse.text();
          throw new Error(`Failed to fetch all player percentiles data: ${errorText}`);
        }

        const gradesData = await gradesResponse.json();
        const basicData = await basicResponse.json();
        const gamesData = await gamesResponse.json();
        const percentileGradesData = await percentilesResponse.json();
        const allPlayerPercentilesData = await allPercentilesResponse.json();

        setPlayerData(gradesData[0] || null);
        setBasicData(Array.isArray(basicData) ? basicData[0] : basicData);
        setTeamGames(gamesData || []);
        setPercentileGrades(percentileGradesData);
        setAllPlayerPercentiles(allPlayerPercentilesData);
        console.log('percentileGrades:', percentileGradesData);
        console.log('allPlayerPercentiles:', allPlayerPercentilesData);

        let derivedTeamID = null;
        if (basicData && 'teamID' in basicData) {
          derivedTeamID = basicData.teamID;
        } else if (gamesData.length > 0) {
          derivedTeamID = gamesData[0].homeId || gamesData[0].awayId;
        }

        const gradesPromises = gamesData.map(game => {
          const url = `${process.env.REACT_APP_API_URL}/api/player_passing_weekly_all/${playerId}/${year}/${game.week}/${game.seasonType}`;
          return fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).catch(error => {
            console.error(`Fetch error for ${url}: ${error.message}`);
            return { ok: false, status: 404 };
          }).then(response => {
            if (!response.ok) {
              const allGrades = Object.values(weeklyGrades).filter(g => g && g.startDate === game.startDate);
              return { week: game.week, seasonType: game.seasonType, data: allGrades[0] || null };
            }
            return response.json().then(data => ({ week: game.week, seasonType: game.seasonType, data: data[0] || null }));
          });
        });

        const gradesResults = await Promise.all(gradesPromises);
        setWeeklyGrades(gradesResults.reduce((acc, { week, seasonType, data }) => ({ ...acc, [`${week}_${seasonType}`]: data }), {}));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (playerId) fetchPlayerData();
  }, [playerId, year]);

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
  const ish2hActive = location.pathname === `/players/qb/${playerId}/h2h`;

  const gradesData = {
    yards,
    touchdowns,
    interceptions,
    grades_pass,
  };

  return (
    <WeeklyGradesContext.Provider value={weeklyGrades}>
    <div className="w-full min-h-screen bg-gray-50">
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
                  className={`text-gray-500 hover:text-gray-700 pb-1 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isOverviewActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/qb/${playerId || ''}/passing`}
                  state={{ year }}
                  className={`text-[#235347] hover:text-[#235347] pb-1 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isPassingActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Passing Analytics
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/qb/${playerId || ''}/fieldview`}
                  state={{ year }}
                  className={`text-gray-500 hover:text-gray-700 pb-1 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isFieldViewActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                >
                  FieldView
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/qb/${playerId || ''}/h2h`}
                  state={{ year }}
                  className={`text-gray-500 hover:text-gray-700 pb-1 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${ish2hActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                >
                  Head-to-Head
                </Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 sm:gap-4 px-2 sm:px-2">
            {isPassingActive && (
              <>
                <div className="analytics-container bg-white rounded-lg shadow-lg mt-2 sm:mt-4 text-sm sm:text-base">
                  <h2 className="flex items-center justify-center text-lg sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Headline Analytics</h2>
                  <div className="top-container">
                    <HeadlineAnalytics
                      playerId={playerId}
                      year={year}
                      weeklyGrades={weeklyGrades}
                      teamGames={teamGames}
                      isPopupOpen={isPopupOpen}
                      percentileGrades={percentileGrades}
                      setIsPopupOpen={setIsPopupOpen}
                      setSelectedContainer={setSelectedContainer}
                      selectedContainer={selectedContainer}
                      className="text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="production-container bg-white rounded-lg shadow-lg mt-2 sm:mt-4 text-sm sm:text-base">
                  <h2 className="flex items-center justify-center text-lg sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Production Metrics</h2>
                  <ProductionContainer
                    playerId={playerId}
                    year={year}
                    weeklyGrades={weeklyGrades}
                    teamGames={teamGames}
                    allPlayerPercentiles={allPlayerPercentiles}
                    className="text-sm sm:text-base"
                  />
                </div>
                <div className="production-container bg-white rounded-lg shadow-lg mt-2 sm:mt-4 text-sm sm:text-base">
                  <h2 className="flex items-center justify-center text-lg sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Performance Metrics</h2>
                  <ConsistencyContainer
                    playerId={playerId}
                    year={year}
                    weeklyGrades={weeklyGrades}
                    teamGames={teamGames}
                    allPlayerPercentiles={allPlayerPercentiles}
                    className="text-sm sm:text-base"
                  />
                </div>
                <div className="production-container bg-white rounded-lg shadow-lg mt-2 sm:mt-4 text-sm sm:text-base">
                  <h2 className="flex items-center justify-center text-lg sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Pocket Metrics</h2>
                  <PocketProduction
                    playerId={playerId}
                    year={year}
                    weeklyGrades={weeklyGrades}
                    teamGames={teamGames}
                    allPlayerPercentiles={allPlayerPercentiles}
                    className="text-sm sm:text-base"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </WeeklyGradesContext.Provider>
  );
}

export default PassingAnalytics;