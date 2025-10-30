// src/components/games/SingleGameRecap.js
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import HeadToHeadReport from './gameRecapComponents/HeadToHeadReport';
import TeamAReport from './gameRecapComponents/TeamAReport';
import TeamBReport from './gameRecapComponents/TeamBReport';
import AdvancedOffense from './singleGameRecapComponents/AdvancedOffense';
import PlayerStats from './singleGameRecapComponents/PlayerStats';
import PlayByPlay from './singleGameRecapComponents/PlayByPlay';
import AdvancedBoxScore from './singleGameRecapComponents/AdvancedBoxScore'; // ← NEW

const SingleGameRecap = ({ year = '2025' }) => {
  const { id } = useParams();
  const location = useLocation();
  const [matchup, setMatchup] = useState(null);
  const [gameStats, setGameStats] = useState(null);
  const [awayTeamRecord, setAwayTeamRecord] = useState(null);
  const [homeTeamRecord, setHomeTeamRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');

  const formatRecord = (wins, losses, ties) => `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`;

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch game metadata
        const gameResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/teams_games`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!gameResponse.ok) {
          const errorText = await gameResponse.text();
          throw new Error(`Failed to fetch game metadata: ${gameResponse.status} - ${errorText}`);
        }
        const gamesData = await gameResponse.json();
        const gameData = gamesData.find(game => game.id === parseInt(id));
        if (!gameData) throw new Error('Game not found');
        if (gameData.completed === 0) throw new Error('Game is not yet completed');

        setMatchup({
          awayId: gameData.awayId,
          homeId: gameData.homeId,
          awayTeamName: gameData.awayTeam,
          homeTeamName: gameData.homeTeam,
          awayTeamLogo: gameData.awayTeamLogo,
          homeTeamLogo: gameData.homeTeamLogo,
        });

        // Fetch stats + records
        const [statsResponse, recordsResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/team_game_stats/${id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${process.env.REACT_APP_API_URL}/api/teams/records/${year}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);

        if (!statsResponse.ok) {
          const errorText = await statsResponse.text();
          throw new Error(`Failed to fetch game stats: ${statsResponse.status} - ${errorText}`);
        }
        if (!recordsResponse.ok) {
          const errorText = await recordsResponse.text();
          throw new Error(`Failed to fetch records: ${recordsResponse.status} - ${errorText}`);
        }

        const statsData = await statsResponse.json();
        const recordsData = await recordsResponse.json();

        setGameStats(statsData);

        const awayRecord = recordsData.find(record => record.teamId === parseInt(gameData.awayId));
        const homeRecord = recordsData.find(record => record.teamId === parseInt(gameData.homeId));
        setAwayTeamRecord(awayRecord || null);
        setHomeTeamRecord(homeRecord || null);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [id, year]);

  const awayStats = gameStats?.find(stat => stat.team_id === parseInt(matchup?.awayId)) || null;
  const homeStats = gameStats?.find(stat => stat.team_id === parseInt(matchup?.homeId)) || null;

  if (loading) {
    return <div className="p-2 sm:p-4 text-black text-lg">Loading game recap...</div>;
  }
  if (error || !matchup) {
    return <div className="p-2 sm:p-4 text-red-500 text-lg">Error: {error || 'No game data available'}</div>;
  }

  const isOverviewActive = activeTab === 'Overview';
  const isAdvancedOffenseActive = activeTab === 'AdvancedOffense';
  const isAdvancedBoxScoreActive = activeTab === 'AdvancedBoxScore';
  const isPlayerStatsActive = activeTab === 'PlayerStats';
  const isPlayByPlayActive = activeTab === 'PlayByPlay';

  return (
    <div className="p-2 sm:p-2 mt-0 sm:mt-12 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-gray-200 flex flex-row items-center justify-between p-2 sm:p-4 rounded-t border-b-2 border-[#235347] mb-4 sm:mb-6">
        <div className="flex items-center">
          {matchup?.awayTeamLogo && (
            <img src={matchup.awayTeamLogo} alt={`${matchup.awayTeamName} logo`} className="w-12 sm:w-16 h-12 sm:h-16" />
          )}
          <div className="ml-2 sm:ml-4 text-black">
            <div className="text-sm sm:text-lg font-bold">{matchup?.awayTeamName || 'Away Team'}</div>
            {awayTeamRecord && (
              <div className="text-xs sm:text-sm">
                OVR: {formatRecord(awayTeamRecord.total_wins, awayTeamRecord.total_losses, awayTeamRecord.total_ties)} | {awayTeamRecord.conference}: {formatRecord(awayTeamRecord.conferenceGames_wins, awayTeamRecord.conferenceGames_losses, awayTeamRecord.conferenceGames_ties)}
              </div>
            )}
          </div>
        </div>
        <span className="text-lg sm:text-xl md:text-4xl font-bold text-black mx-2 sm:mx-4">{awayStats?.points || 0}</span>

        <div className="hidden md:block flex items-center">
          <img
            src="/INSZN_LogoHeader.png"
            alt="INSZN Logo"
            className="w-24 sm:w-36 h-auto mx-1 sm:mx-2"
          />
        </div>

        <span className="text-lg sm:text-xl md:text-4xl font-bold text-black mx-2 sm:mx-4">{homeStats?.points || 0}</span>

        <div className="flex items-center flex-row-reverse">
          {matchup?.homeTeamLogo && (
            <img src={matchup.homeTeamLogo} alt={`${matchup.homeTeamName} logo`} className="w-12 sm:w-16 h-12 sm:h-16" />
          )}
          <div className="mr-2 sm:mr-4 text-black text-right">
            <div className="text-sm sm:text-lg font-bold">{matchup?.homeTeamName || 'Home Team'}</div>
            {homeTeamRecord && (
              <div className="text-xs sm:text-sm">
                OVR: {formatRecord(homeTeamRecord.total_wins, homeTeamRecord.total_losses, homeTeamRecord.total_ties)} | {homeTeamRecord.conference}: {formatRecord(homeTeamRecord.conferenceGames_wins, homeTeamRecord.conferenceGames_losses, homeTeamRecord.conferenceGames_ties)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-300 mb-4 sm:mb-4">
        <ul className="flex gap-1 sm:gap-4">
          <li>
            <button
              className={`text-[#235347] hover:text-[#235347] pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${
                isOverviewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'
              }`}
              onClick={() => setActiveTab('Overview')}
            >
              Overview
            </button>
          </li>
          <li>
            <button
              className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${
                isAdvancedOffenseActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'
              }`}
              onClick={() => setActiveTab('AdvancedOffense')}
            >
              Advanced Offense
            </button>
          </li>
          <li>
            <button
              className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${
                isAdvancedBoxScoreActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'
              }`}
              onClick={() => setActiveTab('AdvancedBoxScore')}
            >
              Advanced Box Score
            </button>
          </li>
          {/* <li>
            <button
              className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${
                isPlayerStatsActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'
              }`}
              onClick={() => setActiveTab('PlayerStats')}
            >
              Player Stats
            </button>
          </li>
          <li>
            <button
              className={`text-gray-500 hover:text-gray-700 pb-0.5 sm:pb-2 border-b-2 text-xs sm:text-base px-1 sm:px-0 ${
                isPlayByPlayActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'
              }`}
              onClick={() => setActiveTab('PlayByPlay')}
            >
              Play-by-Play
            </button>
          </li> */}
        </ul>
      </div>

      {/* Main Content */}
      {loading && (
        <div className="p-2 sm:p-4 text-gray-500 text-center">Loading game recap...</div>
      )}
      {error && (
        <div className="p-2 sm:p-4 text-red-500 text-center">Error: {error}</div>
      )}

      {activeTab === 'Overview' && (
        <div className="flex flex-col md:grid md:grid-cols-[1fr_1.5fr_1fr] gap-4 sm:gap-6">
          <div className="order-first md:order-2">
            <HeadToHeadReport
              year={year}
              awayTeamId={matchup?.awayId}
              homeTeamId={matchup?.homeId}
              gameId={id}
              awayStats={awayStats}
              homeStats={homeStats}
            />
          </div>
          <div className="order-2 md:order-1">
            <TeamAReport
              teamName={matchup?.awayTeamName}
              year={year}
              teamId={matchup?.awayId}
              gameId={id}
              gameStats={awayStats}
            />
          </div>
          <div className="order-3 md:order-3">
            <TeamBReport
              teamName={matchup?.homeTeamName}
              year={year}
              teamId={matchup?.homeId}
              gameId={id}
              gameStats={homeStats}
            />
          </div>
        </div>
      )}

      {activeTab === 'AdvancedOffense' && (
        <AdvancedOffense
          awayTeamName={matchup?.awayTeamName}
          homeTeamName={matchup?.homeTeamName}
          year={year}
          awayTeamId={matchup?.awayId}
          homeTeamId={matchup?.homeId}
          gameId={id}
          awayStats={awayStats}
          homeStats={homeStats}
        />
      )}

      {activeTab === 'AdvancedBoxScore' && (
        <AdvancedBoxScore
          gameId={id}
          awayStats={awayStats}
          homeStats={homeStats}
          awayTeamName={matchup?.awayTeamName}
          homeTeamName={matchup?.homeTeamName}
          year={year}

        />
      )}

      {activeTab === 'PlayerStats' && (
        <PlayerStats
          year={year}
          awayTeamId={matchup?.awayId}
          homeTeamId={matchup?.homeId}
          gameId={id}
        />
      )}

      {activeTab === 'PlayByPlay' && (
        <PlayByPlay
          year={year}
          gameId={id}
        />
      )}
    </div>
  );
};

export default SingleGameRecap;