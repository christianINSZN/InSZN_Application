// In src/components/playerprofiles/WR/PassingAnalytics/PassingAnalytics.js
import React, { useState, useEffect, createContext } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Header from './Overview/Header';
import GameLogPassing from './FieldView/GameLogPassing';
import MetricChart from './FieldView/MetricChart';
import FieldView from './FieldView/FieldView';
export const WeeklyGradesContext = createContext({});

function FieldViewInterface() {
  const { playerId } = useParams();
  const location = useLocation();
  const [playerData, setPlayerData] = useState(null);
  const [basicData, setBasicData] = useState(null);
  const [teamGames, setTeamGames] = useState([]);
  const [weeklyGrades, setWeeklyGrades] = useState({});
  const [percentileGrades, setPercentileGrades] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('grades_pass'); // Default metric
  const [selectedDistance, setSelectedDistance] = useState('deep'); // Default distance
  const [depthData, setDepthData] = useState(null);
  const [colLabels, setColLabels] = useState(['Left', 'Center', 'Right']);
  
  // Get year from navigation state, default to 2024 if not provided
  const year = location.state?.year || 2024;

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
          })
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

        // Fetch passing depth data for each game
        const gradesPromises = gamesData.map(game => {
          const url = `${process.env.REACT_APP_API_URL}/api/player_receiving_weekly_all/${playerId}/${year}/${game.week}/${game.seasonType}`;
          console.log(`Fetching passing depth for game ${game.week} (${game.startDate}, ${game.seasonType}): ${url}`);
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
          console.error('Error fetching passing depth data:', err);
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
    console.log('Handling zone select:', data); // Debug the input
    setSelectedZone(data.zone.split('_')[0]); // Extract zone prefix (e.g., 'left' from 'left_short')
    setSelectedMetric(data.metric || selectedMetric); // Ensure metric is set
    const distanceMatch = data.zone.match(/(deep|medium|short|behind_los)/);
    setSelectedDistance(distanceMatch ? distanceMatch[0] : selectedDistance); // Extract distance
  };

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!playerData || !basicData) return <div className="p-4 text-gray-500">No player data available.</div>;

  const { name, school, position, yards, touchdowns, receptions, grades_pass_route } = playerData;
  const [firstName, lastName] = name ? name.split(' ') : ['', ''];
  const { height, weight, jersey } = basicData;
  const teamID = basicData && 'teamID' in basicData ? basicData.teamID : (teamGames.length > 0 ? teamGames[0].homeId || teamGames[0].awayId : null);
  const isOverviewActive = location.pathname === `/players/wr/${playerId}`;
  const isPassingActive = location.pathname === `/players/wr/${playerId}/passing`;
  const isFieldViewActive = location.pathname === `/players/wr/${playerId}/fieldview`;
  const ish2hActive = location.pathname === `/players/wr/${playerId}/h2h`;

  // Create gradesData object from playerData
  const gradesData = {
    yards,
    touchdowns,
    receptions,
    grades_pass_route
  };

  return (
    <WeeklyGradesContext.Provider value={weeklyGrades}>
      <div className="w-full min-h-screen bg-gray-0">
        <div className="px-0 py-0">
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
            gradesData={gradesData} // Pass the consolidated gradesData object
          />
          <div className="border-b border-gray-300 mb-4">
            <ul className="flex gap-4">
              <li>
                <Link
                  to={`/players/wr/${playerId || ''}`}
                  state={{ year }}
                  className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${isOverviewActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/wr/${playerId || ''}/receiving`}
                  state={{ year }}
                  className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${isPassingActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                >
                  Receiving Analytics
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/wr/${playerId || ''}/fieldview`}
                  state={{ year }}
                  className={`text-[#235347] hover:text-[#235347] pb-2 border-b-2 ${isFieldViewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  FieldView
                </Link>
              </li>
              <li>
                <Link
                  to={`/players/wr/${playerId || ''}/h2h`}
                  state={{ year }}
                  className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${ish2hActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
                >
                  Head-to-Head
                </Link>
              </li>
            </ul>
          </div>
          <div className="grid grid-cols-[70%_30%] gap-4 w-full">
            <div className="space-y-6">
              <GameLogPassing playerId={playerId} year={year} selectedZone={selectedZone} selectedMetric={selectedMetric} selectedDistance={selectedDistance} teamGames={teamGames} />
              <MetricChart playerId={playerId} year={year} selectedZone={selectedZone} selectedMetric={selectedMetric} selectedDistance={selectedDistance} teamGames={teamGames} />
            </div>
            <div className="grid grid-rows-[1fr] gap-4 h-[full]">
              <FieldView playerId={playerId} year={year} onZoneSelect={handleZoneSelect} colLabels={colLabels} />
            </div>
          </div>
        </div>
      </div>
    </WeeklyGradesContext.Provider>
  );
}

export default FieldViewInterface;