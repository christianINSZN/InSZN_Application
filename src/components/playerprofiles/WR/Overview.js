import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Header from './Overview/Header';
import GameLog from './Overview/GameLog';
import HeadlineGrades from './Overview/HeadlineGrades';
import Trends from './Overview/Trends';
import MatchupProjection from './Overview/MatchupProjection';
import AttributionRadial from './Overview/AttributionRadial';

const OverviewWR = ({ year: propYear }) => {
  const { playerId } = useParams();
  const location = useLocation();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [basicData, setBasicData] = useState(null);
  const [teamGames, setTeamGames] = useState([]);
  const [weeklyGrades, setWeeklyGrades] = useState({});
  const [percentileGrades, setPercentileGrades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { state, search } = useLocation();
  const query = new URLSearchParams(search);
  const year = state?.year || query.get('year') || propYear || 2025; // Prefer state, then query, then prop, then 2025

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
          fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_WR/${playerId}/${year}`, {
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
        const gradesData = await gradesResponse.json();
        const basicData = await basicResponse.json();
        const gamesData = await gamesResponse.json();
        const percentileGradesData = await percentilesResponse.json();
        setPlayerData(gradesData[0] || null);
        setBasicData(Array.isArray(basicData) ? basicData[0] : basicData);
        setTeamGames(gamesData || []);
        setPercentileGrades(percentileGradesData);
        let derivedTeamID = null;
        if (basicData && 'teamID' in basicData) {
          derivedTeamID = basicData.teamID;
        } else if (gamesData.length > 0) {
          derivedTeamID = gamesData[0].homeId || gamesData[0].awayId;
        }
        const gradesPromises = gamesData.map(game => {
          const url = `${process.env.REACT_APP_API_URL}/api/player_receiving_weekly_all/${playerId}/${year}/${game.week}/${game.seasonType}`;
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

  const { name, school, position, yards, touchdowns, receptions, grades_pass_route } = playerData;
  const [firstName, lastName] = name ? name.split(' ') : ['', ''];
  const { height, weight, jersey } = basicData;
  const teamID = basicData && 'teamID' in basicData ? basicData.teamID : (teamGames.length > 0 ? teamGames[0].homeId || teamGames[0].awayId : null);
  const isOverviewActive = location.pathname === `/players/wr/${playerId}`;
  const isReceivingActive = location.pathname === `/players/wr/${playerId}/receiving`;
  const isFieldViewActive = location.pathname === `/players/wr/${playerId}/fieldview`;
  const isH2HActive = location.pathname === `/players/wr/${playerId}/h2h`;
  const gradesData = {
    yards,
    touchdowns,
    receptions,
    grades_pass_route
  };

  return (
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
                to={`/players/wr/${playerId || ''}`}
                state={{ year }}
                className={`text-[#235347] hover:text-[#235347] pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isOverviewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
              >
                Overview
              </Link>
            </li>
            <li>
              <Link
                to={`/players/wr/${playerId || ''}/receiving`}
                state={{ year }}
                className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isReceivingActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
              >
                Receiving Analytics
              </Link>
            </li>
            <li>
              <Link
                to={`/players/wr/${playerId || ''}/fieldview`}
                state={{ year }}
                className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isFieldViewActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
              >
                FieldView
              </Link>
            </li>
            <li>
              <Link
                to={`/players/wr/${playerId || ''}/h2h`}
                state={{ year }}
                className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${isH2HActive ? 'border-gray-500' : 'border-transparent hover:border-[#235347]'}`}
              >
                Head-to-Head
              </Link>
            </li>
          </ul>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[67%_32%] gap-2 sm:gap-4 w-full">
          <div className="space-y-2 sm:space-y-4">
            <MatchupProjection teamId={teamID} year={year} className="text-sm sm:text-base" />
            <GameLog teamGames={teamGames} weeklyGrades={weeklyGrades} className="text-sm sm:text-base overflow-x-auto" />
            <HeadlineGrades
              isPopupOpen={isPopupOpen}
              setIsPopupOpen={setIsPopupOpen}
              setSelectedGrade={setSelectedGrade}
              selectedGrade={selectedGrade}
              percentileGrades={percentileGrades}
              weeklyGrades={weeklyGrades}
              teamGames={teamGames}
              className="text-sm sm:text-base"
            />
          </div>
          <div className="grid grid-rows-1 sm:grid-rows-[1fr_1fr] gap-2 sm:gap-4 h-full">
            <AttributionRadial
              playerId={playerId}
              year={year}
              percentileGrades={percentileGrades}
              className="text-sm sm:text-base row-span-2"
            />
            <Trends
              isPopupOpen={isPopupOpen}
              setIsPopupOpen={setIsPopupOpen}
              setSelectedGrade={setSelectedGrade}
              selectedGrade={selectedGrade}
              year={year}
              teamGames={teamGames}
              weeklyGrades={weeklyGrades}
              className="text-sm sm:text-base"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewWR;