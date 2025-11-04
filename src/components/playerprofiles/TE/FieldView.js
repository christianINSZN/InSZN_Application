import React, { useState, useEffect, createContext } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import Header from './Overview/Header';
import GameLogPassing from './FieldView/GameLogPassing';
import MetricChart from './FieldView/MetricChart';
import FieldView from './FieldView/FieldView';

export const WeeklyGradesContext = createContext({});

function FieldViewInterface() {
  const { playerId } = useParams();
  const location = useLocation();
  const { user } = useClerk();
  const [playerData, setPlayerData] = useState(null);
  const [basicData, setBasicData] = useState(null);
  const [teamGames, setTeamGames] = useState([]);
  const [weeklyGrades, setWeeklyGrades] = useState({});
  const [percentileGrades, setPercentileGrades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('grades_pass_route'); // Updated default metric
  const [selectedDistance, setSelectedDistance] = useState('deep');
  const [depthData, setDepthData] = useState(null);
  const [colLabels, setColLabels] = useState(['Left', 'Center', 'Right']);
  const year = location.state?.year || 2025;
  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
    const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium' ;
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    console.log('Component mounted with selectedMetric:', selectedMetric, 'selectedDistance:', selectedDistance);
    const fetchPlayerData = async () => {
      setLoading(true);
      try {
        const [gradesResponse, basicResponse, gamesResponse] = await Promise.all([
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
        ]);
        if (!gradesResponse.ok) throw new Error('Failed to fetch grades data');
        if (!basicResponse.ok) throw new Error('Failed to fetch basic data');
        if (!gamesResponse.ok) {
          const errorText = await gamesResponse.text();
          throw new Error(`Failed to fetch team games data: ${errorText}`);
        }
        const gradesData = await gradesResponse.json();
        const basicData = await basicResponse.json();
        const gamesData = await gamesResponse.json();
        setPlayerData(gradesData[0] || null);
        setBasicData(basicData[0] || null);
        setTeamGames(gamesData || []);
        const gradesPromises = gamesData.map(game => {
          const url = `${process.env.REACT_APP_API_URL}/api/player_receiving_weekly_all/${playerId}/${year}/${game.week}/${game.seasonType}`;
          console.log(`Fetching receiving data for game ${game.week} (${game.startDate}, ${game.seasonType}): ${url}`);
          return fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).catch(error => {
            console.error(`Fetch error for ${url}: ${error.message}`);
            return { week: game.week, seasonType: game.seasonType, data: null };
          }).then(response => {
            if (!response.ok) {
              console.log(`No data for ${url}, returning null`);
              return { week: game.week, seasonType: game.seasonType, data: null };
            }
            return response.json().then(data => ({ week: game.week, seasonType: game.seasonType, data: data[0] || null }));
          });
        });
        const gradesResults = await Promise.all(gradesPromises);
        const aggregatedGrades = gradesResults.reduce((acc, { week, seasonType, data }) => {
          const key = `${week}_${seasonType}`;
          acc[key] = data;
          return acc;
        }, {});
        setWeeklyGrades(aggregatedGrades);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    const fetchDepthData = async () => {
      if (playerId && year) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/player_receiving_season_depth/${playerId}/${year}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!response.ok) throw new Error('Failed to fetch receiving depth data');
          const data = await response.json();
          console.log('Fetched depth data:', data);
          setDepthData(data);
        } catch (err) {
          console.error('Error fetching receiving depth data:', err);
        }
      }
    };
    if (playerId) {
      fetchPlayerData();
      fetchDepthData();
    }
  }, [playerId, year]);

  useEffect(() => {
    console.log('Selected Zone updated:', selectedZone, 'Selected Metric:', selectedMetric, 'Selected Distance:', selectedDistance, 'Weekly Grades:', weeklyGrades);
  }, [selectedZone, selectedMetric, selectedDistance, weeklyGrades]);

  const handleZoneSelect = (data) => {
    console.log('Handling zone select:', data);
    setSelectedZone(data.zone.split('_')[0]);
    setSelectedMetric(data.metric || selectedMetric);
    const distanceMatch = data.zone.match(/(deep|medium|short|behind_los)/);
    setSelectedDistance(distanceMatch ? distanceMatch[0] : selectedDistance);
  };

  if (loading) return <div className="p-2 sm:p-4 text-gray-500 text-sm sm:text-base">Loading...</div>;
  if (error) return <div className="p-2 sm:p-4 text-red-500 text-sm sm:text-base">Error: {error}</div>;
  if (!playerData || !basicData) return <div className="p-2 sm:p-4 text-gray-500 text-sm sm:text-base">No player data available.</div>;

  const { name, school, position, yards, touchdowns, receptions, grades_pass_route } = playerData;
  const [firstName, lastName] = name ? name.split(' ') : ['', ''];
  const { height, weight, jersey } = basicData;
  const teamID = basicData && 'teamID' in basicData ? basicData.teamID : (teamGames.length > 0 ? teamGames[0].homeId || teamGames[0].awayId : null);
  const isOverviewActive = location.pathname === `/players/te/${playerId}`;
  const isReceivingActive = location.pathname === `/players/te/${playerId}/receiving`;
  const isFieldViewActive = location.pathname === `/players/te/${playerId}/fieldview`;
  const isH2hActive = location.pathname === `/players/te/${playerId}/h2h`;
  const gradesData = {
    yards,
    touchdowns,
    receptions,
    grades_pass_route
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
                  to={`/players/te/${playerId || ''}`}
                  state={{ year }}
                  className={`text-[#235347] hover:text-[#235347] pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isOverviewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/te/${playerId || ''}/receiving`}
                  state={{ year }}
                  className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isReceivingActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                >
                  Receiving Analytics
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/te/${playerId || ''}/fieldview`}
                  state={{ year }}
                  className={`text-[#235347] hover:text-[#235347] pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isFieldViewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  FieldView
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/te/${playerId || ''}/h2h`}
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
                <div className="flex flex-col gap-4 w-full">
                  <FieldView playerId={playerId} year={year} onZoneSelect={handleZoneSelect} colLabels={colLabels} />
                  <GameLogPassing
                    playerId={playerId}
                    year={year}
                    selectedZone={selectedZone}
                    selectedMetric={selectedMetric}
                    selectedDistance={selectedDistance}
                    teamGames={teamGames}
                    className="text-sm sm:text-base"
                  />
                  <MetricChart
                    playerId={playerId}
                    year={year}
                    selectedZone={selectedZone}
                    selectedMetric={selectedMetric}
                    selectedDistance={selectedDistance}
                    teamGames={teamGames}
                    className="text-sm sm:text-base"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-[71%_28%] gap-4 w-full">
                  <div className="space-y-6">
                    <GameLogPassing
                      playerId={playerId}
                      year={year}
                      selectedZone={selectedZone}
                      selectedMetric={selectedMetric}
                      selectedDistance={selectedDistance}
                      teamGames={teamGames}
                      className="text-sm sm:text-base"
                    />
                    <MetricChart
                      playerId={playerId}
                      year={year}
                      selectedZone={selectedZone}
                      selectedMetric={selectedMetric}
                      selectedDistance={selectedDistance}
                      teamGames={teamGames}
                      className="text-sm sm:text-base"
                    />
                  </div>
                  <div className="grid grid-rows-[1fr] gap-4 h-full">
                    <FieldView playerId={playerId} year={year} onZoneSelect={handleZoneSelect} colLabels={colLabels} />
                  </div>
                </div>
              )
            ) : (
              <div className="relative">
                {isMobile ? (
                  <div className="flex flex-col gap-4 w-full filter blur-xs opacity-80">
                    <FieldView playerId={playerId} year={year} onZoneSelect={handleZoneSelect} colLabels={colLabels} />
                    <GameLogPassing
                      playerId={playerId}
                      year={year}
                      selectedZone={selectedZone}
                      selectedMetric={selectedMetric}
                      selectedDistance={selectedDistance}
                      teamGames={teamGames}
                      className="text-sm sm:text-base"
                    />
                    <MetricChart
                      playerId={playerId}
                      year={year}
                      selectedZone={selectedZone}
                      selectedMetric={selectedMetric}
                      selectedDistance={selectedDistance}
                      teamGames={teamGames}
                      className="text-sm sm:text-base"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-[71%_28%] gap-4 w-full filter blur-xs opacity-80">
                    <div className="space-y-6">
                      <GameLogPassing
                        playerId={playerId}
                        year={year}
                        selectedZone={selectedZone}
                        selectedMetric={selectedMetric}
                        selectedDistance={selectedDistance}
                        teamGames={teamGames}
                        className="text-sm sm:text-base"
                      />
                      <MetricChart
                        playerId={playerId}
                        year={year}
                        selectedZone={selectedZone}
                        selectedMetric={selectedMetric}
                        selectedDistance={selectedDistance}
                        teamGames={teamGames}
                        className="text-sm sm:text-base"
                      />
                    </div>
                    <div className="grid grid-rows-[1fr] gap-4 h-full">
                      <FieldView playerId={playerId} year={year} onZoneSelect={handleZoneSelect} colLabels={colLabels} />
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

export default FieldViewInterface;