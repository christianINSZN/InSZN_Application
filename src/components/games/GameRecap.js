// src/components/games/GameRecap.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom'; // ← Add this
import HeadToHeadReport from './gameRecapComponents/HeadToHeadReport';
import TeamAReport from './gameRecapComponents/TeamAReport';
import TeamBReport from './gameRecapComponents/TeamBReport';

const GameRecap = ({ matchup, gameId, year, onClose = () => {} }) => {
  const [gameStats, setGameStats] = useState(null);
  const [awayTeamRecord, setAwayTeamRecord] = useState(null);
  const [homeTeamRecord, setHomeTeamRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  const formatRecord = (wins, losses, ties) => `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`;

  useEffect(() => {
    const fetchGameData = async () => {
      if (!year || !matchup?.awayId || !matchup?.homeId || !gameId) {
        setError('Missing year, team IDs, or game ID');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [statsResponse, recordsResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/team_game_stats/${gameId}`, {
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

        const awayRecord = recordsData.find(record => record.teamId === parseInt(matchup.awayId));
        const homeRecord = recordsData.find(record => record.teamId === parseInt(matchup.homeId));

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
  }, [year, matchup?.awayId, matchup?.homeId, gameId]);

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      if (typeof onClose === 'function') {
        onClose();
      } else {
        console.warn('onClose is not a function');
      }
    }
  };

  // Filter stats for away and home teams
  const awayStats = gameStats?.find(stat => stat.team_id === parseInt(matchup?.awayId)) || null;
  const homeStats = gameStats?.find(stat => stat.team_id === parseInt(matchup?.homeId)) || null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleOverlayClick}>
      <div ref={modalRef} className="bg-white p-0 sm:p-0 rounded-lg shadow-xl w-full max-w-[90vw] sm:max-w-2xl md:max-w-4xl lg:max-w-7xl h-[80vh] sm:h-[80vh] overflow-y-auto flex flex-col">
        {/* Green Bar with Logos, Team Names/Records, Scores, and INSZN Logo */}
        <div className="bg-gray-200 flex flex-row items-center justify-between p-1 sm:p-2 rounded-t border-b-2 border-[#235347] sticky top-0 z-10">
          <div className="flex items-center">
            {matchup?.awayTeamLogo && (
              <img src={matchup.awayTeamLogo} alt={`${matchup.awayTeamName} logo`} className="w-12 sm:w-16 h-12 sm:h-16" />
            )}
            <div className="ml-1 sm:ml-2 text-black">
              <div className="text-sm sm:text-lg font-bold">{matchup?.awayTeamName || 'Away Team'}</div>
              {awayTeamRecord && (
                <div className="text-xs sm:text-sm">
                  OVR: {formatRecord(awayTeamRecord.total_wins, awayTeamRecord.total_losses, awayTeamRecord.total_ties)} | {awayTeamRecord.conference}: {formatRecord(awayTeamRecord.conferenceGames_wins, awayTeamRecord.conferenceGames_losses, awayTeamRecord.conferenceGames_ties)}
                </div>
              )}
            </div>
          </div>
          <span className="text-lg sm:text-xl md:text-4xl font-bold text-black mx-2 sm:mx-4">{awayStats?.points || 0}</span>

          {/* INSZN Logo + Advanced Link */}
          <div className="hidden md:flex flex-col items-center">
            <img
              src="/INSZN_LogoHeader.png"
              alt="INSZN Logo"
              className="w-24 sm:w-36 h-auto mt-0 mx-1 sm:mx-2"
            />
            <Link
              to={`/games/recap/${gameId}`}
              className="mt-1 text-xs font-medium text-[#235347] hover:text-[#1a3d34] underline"
            >
              Advanced Game Summary
            </Link>
          </div>

          <span className="text-lg sm:text-xl md:text-4xl font-bold text-black mx-2 sm:mx-4">{homeStats?.points || 0}</span>

          <div className="flex items-center flex-row-reverse">
            {matchup?.homeTeamLogo && (
              <img src={matchup.homeTeamLogo} alt={`${matchup.homeTeamName} logo`} className="w-12 sm:w-16 h-12 sm:h-16" />
            )}
            <div className="mr-1 sm:mr-2 text-black text-right">
              <div className="text-sm sm:text-lg font-bold">{matchup?.homeTeamName || 'Home Team'}</div>
              {homeTeamRecord && (
                <div className="text-xs sm:text-sm">
                  OVR: {formatRecord(homeTeamRecord.total_wins, homeTeamRecord.total_losses, homeTeamRecord.total_ties)} | {homeTeamRecord.conference}: {formatRecord(homeTeamRecord.conferenceGames_wins, homeTeamRecord.conferenceGames_losses, homeTeamRecord.conferenceGames_ties)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: Advanced Link Below Logo */}
        <div className="md:hidden text-center py-1 bg-gray-100 border-b border-gray-300">
          <Link
            to={`/games/recap/${gameId}`}
            className="text-xs font-medium text-[#235347] hover:text-[#1a3d34] underline"
          >
            Advanced Game Summary
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 mt-1 sm:mt-2">
          {loading && (
            <div className="p-1 sm:p-2 text-gray-500 text-center">Loading game recap...</div>
          )}
          {error && (
            <div className="p-1 sm:p-2 text-black text-center">External Data Provider Complication in Populating Game Recep</div>
          )}
          <div className="flex flex-col md:grid md:grid-cols-[1fr_1.5fr_1fr] gap-2 sm:gap-4">
            {/* Head-to-Head Metrics (Top on Mobile) */}
            <div className="order-first md:order-2">
              <HeadToHeadReport
                year={year}
                awayTeamId={matchup?.awayId}
                homeTeamId={matchup?.homeId}
                gameId={gameId}
                awayStats={awayStats}
                homeStats={homeStats}
              />
            </div>
            {/* Left Column: Team A (Away) */}
            <div className="order-2 md:order-1">
              <TeamAReport
                teamName={matchup?.awayTeamName}
                year={year}
                teamId={matchup?.awayId}
                gameId={gameId}
                gameStats={awayStats}
              />
            </div>
            {/* Right Column: Team B (Home) */}
            <div className="order-3 md:order-3">
              <TeamBReport
                teamName={matchup?.homeTeamName}
                year={year}
                teamId={matchup?.homeId}
                gameId={gameId}
                gameStats={homeStats}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRecap;