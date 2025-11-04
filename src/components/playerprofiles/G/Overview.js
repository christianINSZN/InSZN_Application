import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Header from './Overview/Header';
import GameLog from './Overview/GameLog';
import HeadlineGrades from './Overview/HeadlineGrades';
import Trends from './Overview/Trends';
import MatchupProjection from './Overview/MatchupProjection';
import AttributionRadial from './Overview/AttributionRadial';

const OverviewG = ({ year: propYear }) => {
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
  const isMobile = window.innerWidth < 640;
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
          fetch(`${process.env.REACT_APP_API_URL}/api/player_percentiles_G/${playerId}/${year}`, {
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
          const url = `${process.env.REACT_APP_API_URL}/api/player_blocking_weekly_all/${playerId}/${year}/${game.week}/${game.seasonType}`;
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

  const { name, school, position, grades_offense, snap_counts_offense, sacks_allowed, pbe } = playerData;
  const [firstName, lastName] = name ? name.split(' ') : ['', ''];
  const { height, weight, jersey } = basicData;
  const teamID = basicData && 'teamID' in basicData ? basicData.teamID : (teamGames.length > 0 ? teamGames[0].homeId || teamGames[0].awayId : null);
  const isOverviewActive = location.pathname === `/players/g/${playerId}`;
  const isRushingActive = location.pathname === `/players/g/${playerId}/rushing`;
  const isH2HActive = location.pathname === `/players/g/${playerId}/h2h`;

  const gradesData = {
    snap_counts_offense,
    sacks_allowed,
    grades_offense,
    pbe
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className={isMobile ? "px-2 py-4" : "px-0 py-8"}>
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
        <div className="border-b border-gray-300 mb-4">
          <ul className={isMobile ? "flex gap-1 text-xs" : "flex gap-4 text-base"}>
            <li>
              <Link
                to={`/players/g/${playerId || ''}`}
                state={{ year }}
                className={isMobile ? `text-[#235347] hover:text-[#235347] pb-0.5 px-1 border-b-2 ${isOverviewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}` : `text-[#235347] hover:text-[#235347] pb-2 border-b-2 ${isOverviewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
              >
                Overview
              </Link>
            </li>
             {/* <li>
              <Link
                to={`/players/g/${playerId || ''}/rushing`}
                state={{ year }}
                className={isMobile ? `text-gray-500 hover:text-gray-700 pb-0.5 px-1 border-b-2 ${isRushingActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}` : `text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${isRushingActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
              >
                Rushing Analytics
              </Link>
            </li>
            <li>
              <Link
                to={`/players/g/${playerId || ''}/h2h`}
                state={{ year }}
                className={isMobile ? `text-gray-500 hover:text-gray-700 pb-0.5 px-1 border-b-2 ${isH2HActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}` : `text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${isH2HActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
              >
                Head-to-Head
              </Link>
            </li>  */}
          </ul>
        </div>
        <div className={isMobile ? "grid grid-cols-1 gap-2 w-full" : "grid grid-cols-[67%_32%] gap-4 w-[100%]"}>
          <div className={isMobile ? "space-y-2" : "space-y-4"}>
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
          <div className={isMobile ? "grid grid-rows-1 gap-2 h-full" : "grid grid-rows-[1fr_1fr] gap-4 h-full"}>
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

export default OverviewG;