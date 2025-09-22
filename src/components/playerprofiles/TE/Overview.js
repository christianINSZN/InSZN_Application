import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Header from './Overview/Header';
import GameLog from './Overview/GameLog';
import HeadlineGrades from './Overview/HeadlineGrades';
import Trends from './Overview/Trends';
import MatchupProjection from './Overview/MatchupProjection';
import AttributionRadial from './Overview/AttributionRadial';

function OverviewTE() {
  const { playerId } = useParams();
  const location = useLocation();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [basicData, setBasicData] = useState(null);
  const [teamGames, setTeamGames] = useState([]);
  const [weeklyGrades, setWeeklyGrades] = useState({});
  const [weeklyBlockingGrades, setWeeklyBlockingGrades] = useState({});
  const [percentileGrades, setPercentileGrades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get year from navigation state, default to 2025 to align with WR
  const year = location.state?.year || 2025;

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
          fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_TE/${playerId}/${year}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);

        if (!gradesResponse.ok) throw new Error(`Failed to fetch grades data: ${gradesResponse.status}`);
        if (!basicResponse.ok) throw new Error(`Failed to fetch basic data: ${basicResponse.status}`);
        if (!gamesResponse.ok) throw new Error(`Failed to fetch team games data: ${await gamesResponse.text()}`);
        if (!percentilesResponse.ok) throw new Error(`Failed to fetch percentile data: ${await percentilesResponse.text()}`);

        const gradesData = await gradesResponse.json();
        const basicData = await basicResponse.json();
        const gamesData = await gamesResponse.json();
        const percentileGradesData = await percentilesResponse.json();

        console.log('API Responses:', {
          gradesData,
          basicData,
          gamesData,
          percentileGradesData
        });

        setPlayerData(gradesData[0] || null);
        setBasicData(Array.isArray(basicData) ? basicData[0] : basicData);
        setTeamGames(Array.isArray(gamesData) ? gamesData : []);
        setPercentileGrades(percentileGradesData);

        // Derive teamID from teamGames if basicData.teamID is unavailable
        let derivedTeamID = null;
        if (basicData && 'teamID' in basicData) {
          derivedTeamID = basicData.teamID;
        } else if (Array.isArray(gamesData) && gamesData.length > 0) {
          derivedTeamID = gamesData[0].homeId || gamesData[0].awayId;
        }

        // Fetch receiving grades
        const gradesPromises = Array.isArray(gamesData) ? gamesData.map(game => {
          const url = `${process.env.REACT_APP_API_URL}/api/player_receiving_weekly_all/${playerId}/${year}/${game.week}/${game.seasonType}`;
          return fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).catch(error => {
            console.error(`Fetch error for ${url}: ${error.message}`);
            return { ok: false, status: 404, json: () => Promise.resolve(null) };
          }).then(response => {
            if (!response.ok) {
              console.warn(`Non-ok response for ${url}: ${response.status}`);
              const allGrades = Object.values(weeklyGrades).filter(g => g && g.startDate === game.startDate);
              return { week: game.week, seasonType: game.seasonType, data: allGrades[0] || null };
            }
            return response.json().then(data => {
              console.log(`Receiving grades for ${url}:`, data);
              return { week: game.week, seasonType: game.seasonType, data: Array.isArray(data) && data.length > 0 ? data[0] : null };
            }).catch(jsonError => {
              console.error(`JSON parse error for ${url}: ${jsonError.message}`);
              return { week: game.week, seasonType: game.seasonType, data: null };
            });
          });
        }) : [];

        const gradesResults = await Promise.all(gradesPromises);
        const newWeeklyGrades = gradesResults.reduce((acc, { week, seasonType, data }) => ({
          ...acc,
          [`${week}_${seasonType}`]: data
        }), {});
        console.log('Processed weeklyGrades:', newWeeklyGrades);
        setWeeklyGrades(newWeeklyGrades);

        // Fetch blocking grades
        const gradesBlockingPromises = Array.isArray(gamesData) ? gamesData.map(game => {
          const url = `${process.env.REACT_APP_API_URL}/api/player_blocking_weekly_all/${playerId}/${year}/${game.week}/${game.seasonType}`;
          return fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).catch(error => {
            console.error(`Fetch error for ${url}: ${error.message}`);
            return { ok: false, status: 404, json: () => Promise.resolve(null) };
          }).then(response => {
            if (!response.ok) {
              console.warn(`Non-ok response for ${url}: ${response.status}`);
              const allGrades = Object.values(weeklyBlockingGrades).filter(g => g && g.startDate === game.startDate);
              return { week: game.week, seasonType: game.seasonType, data: allGrades[0] || null };
            }
            return response.json().then(data => {
              console.log(`Blocking grades for ${url}:`, data);
              return { week: game.week, seasonType: game.seasonType, data: Array.isArray(data) && data.length > 0 ? data[0] : null };
            }).catch(jsonError => {
              console.error(`JSON parse error for ${url}: ${jsonError.message}`);
              return { week: game.week, seasonType: game.seasonType, data: null };
            });
          });
        }) : [];

        const gradesBlockingResults = await Promise.all(gradesBlockingPromises);
        const newWeeklyBlockingGrades = gradesBlockingResults.reduce((acc, { week, seasonType, data }) => ({
          ...acc,
          [`${week}_${seasonType}`]: data
        }), {});
        console.log('Processed weeklyBlockingGrades:', newWeeklyBlockingGrades);
        setWeeklyBlockingGrades(newWeeklyBlockingGrades);

      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (playerId) fetchPlayerData();
  }, [playerId, year]);

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!playerData || !basicData) return <div className="p-4 text-gray-500">No player data available.</div>;

  const { name, school, position, yards, touchdowns, receptions, grades_pass_route } = playerData;
  const [firstName, lastName] = name ? name.split(' ') : ['', ''];
  const { height, weight, jersey } = basicData;
  const teamID = basicData && 'teamID' in basicData ? basicData.teamID : (teamGames.length > 0 ? teamGames[0].homeId || teamGames[0].awayId : null);

  const isOverviewActive = location.pathname === `/players/te/${playerId}`;
  const isReceivingActive = location.pathname === `/players/te/${playerId}/receiving`;
  const isFieldViewActive = location.pathname === `/players/te/${playerId}/fieldview`;
  const isH2HActive = location.pathname === `/players/te/${playerId}/h2h`;

  // Create gradesData object from playerData
  const gradesData = {
    yards,
    touchdowns,
    receptions,
    grades_pass_route
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
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
          gradesData={gradesData}
        />
        <div className="border-b border-gray-300 mb-4">
          <ul className="flex gap-4">
            <li>
              <Link
                to={`/players/te/${playerId || ''}`}
                state={{ year }}
                className={`text-[#235347] hover:text-[#235347] pb-2 border-b-2 ${isOverviewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
              >
                Overview
              </Link>
            </li>
            <li>
              <Link
                to={`/players/te/${playerId || ''}/receiving`}
                state={{ year }}
                className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${isReceivingActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
              >
                Receiving Analytics
              </Link>
            </li>
            <li>
              <Link
                to={`/players/te/${playerId || ''}/fieldview`}
                state={{ year }}
                className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${isFieldViewActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
              >
                FieldView
              </Link>
            </li>
            <li>
              <Link
                to={`/players/te/${playerId || ''}/h2h`}
                state={{ year }}
                className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${isH2HActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
              >
                Head-to-Head
              </Link>
            </li>
          </ul>
        </div>
        <div className="grid grid-cols-[67%_32%] gap-4 w-[100%]">
          <div className="space-y-4">
            <MatchupProjection teamId={teamID} year={year} />
            <GameLog
              teamGames={teamGames}
              weeklyGrades={weeklyGrades}
              weeklyBlockingGrades={weeklyBlockingGrades}
              year={year}
            />
            <HeadlineGrades
              isPopupOpen={isPopupOpen}
              setIsPopupOpen={setIsPopupOpen}
              setSelectedGrade={setSelectedGrade}
              selectedGrade={selectedGrade}
              percentileGrades={percentileGrades}
              weeklyGrades={weeklyGrades}
              weeklyBlockingGrades={weeklyBlockingGrades}
              teamGames={teamGames}
            />
          </div>
          <div className="grid grid-rows-[1fr_1fr] gap-4 h-full">
            <AttributionRadial
              playerId={playerId}
              year={year}
              percentileGrades={percentileGrades}
              className="row-span-2"
            />
            <Trends
              isPopupOpen={isPopupOpen}
              setIsPopupOpen={setIsPopupOpen}
              setSelectedGrade={setSelectedGrade}
              selectedGrade={selectedGrade}
              year={year}
              teamGames={teamGames}
              weeklyGrades={weeklyGrades}
              weeklyBlockingGrades={weeklyBlockingGrades}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTE;