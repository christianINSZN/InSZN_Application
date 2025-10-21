import React, { useState, useEffect } from 'react';
import TeamAReport from './scoutingReportsComponents/TeamAReport';
import HeadToHeadReport from './scoutingReportsComponents/HeadToHeadReport';
import TeamBReport from './scoutingReportsComponents/TeamBReport';

const ScoutingReport = ({ matchup, onClose, year }) => {
  const [awayTeamRecord, setAwayTeamRecord] = useState(null);
  const [homeTeamRecord, setHomeTeamRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatRecord = (wins, losses, ties) => `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`;

  useEffect(() => {
    const fetchRecords = async () => {
      if (!year || !matchup?.awayId || !matchup?.homeId) {
        setError('Missing year or team IDs');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/records/${year}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch records: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Records data:', data);
        const awayRecord = data.find(record => record.teamId === parseInt(matchup.awayId));
        const homeRecord = data.find(record => record.teamId === parseInt(matchup.homeId));
        setAwayTeamRecord(awayRecord || null);
        setHomeTeamRecord(homeRecord || null);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [year, matchup?.awayId, matchup?.homeId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-0 sm:p-0 rounded-lg shadow-xl w-full max-w-7xl h-[80vh] overflow-y-auto flex flex-col">
        {/* Green Bar with Logos, Team Names/Records, and Turf Logo */}
        <div className="bg-gray-200 flex justify-between items-center p-2 rounded-t border-b-2 border-[#235347] sticky top-0 z-10">
          <div className="flex items-center">
            {matchup?.awayTeamLogo && (
              <img src={matchup.awayTeamLogo} alt={`${matchup.awayTeamName} logo`} className="w-20 h-20" />
            )}
            <div className="ml-2 text-black">
              <div className="text-xl font-bold">{matchup?.awayTeamName || 'Away Team'}</div>
              {awayTeamRecord && (
                <div className="text-xs">
                  OVR: {formatRecord(awayTeamRecord.total_wins, awayTeamRecord.total_losses, awayTeamRecord.total_ties)} | {awayTeamRecord.conference}: {formatRecord(awayTeamRecord.conferenceGames_wins, awayTeamRecord.conferenceGames_losses, awayTeamRecord.conferenceGames_ties)}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center flex-1">
            <img
              src="/TurfLogo_RemovedBkg.png"
              alt="Turf Logo"
              className="w-36 h-auto mt-0"
            />
          </div>
          <div className="flex items-center">
            <div className="mr-2 text-black text-right">
              <div className="text-xl font-bold">{matchup?.homeTeamName || 'Home Team'}</div>
              {homeTeamRecord && (
                <div className="text-xs">
                  OVR: {formatRecord(homeTeamRecord.total_wins, homeTeamRecord.total_losses, homeTeamRecord.total_ties)} | {homeTeamRecord.conference}: {formatRecord(homeTeamRecord.conferenceGames_wins, homeTeamRecord.conferenceGames_losses, homeTeamRecord.conferenceGames_ties)}
                </div>
              )}
            </div>
            {matchup?.homeTeamLogo && (
              <img src={matchup.homeTeamLogo} alt={`${matchup.homeTeamName} logo`} className="w-20 h-20" />
            )}
          </div>
        </div>
        {/* Main Content */}
        <div className="flex-1 mt-4">
          {loading && (
            <div className="p-2 text-gray-500 text-center">Loading records...</div>
          )}
          {error && (
            <div className="p-2 text-red-500 text-center">Error: {error}</div>
          )}
          <div className="flex flex-col md:grid md:grid-cols-[1fr_1.5fr_1fr] gap-6">
            {/* Head-to-Head Metrics (Top on Mobile) */}
            <div className="order-first md:order-2">
              <HeadToHeadReport
                year={year}
                awayTeamId={matchup?.awayId}
                homeTeamId={matchup?.homeId}
              />
            </div>
            {/* Left Column: Team A (Away) */}
            <div className="order-2 md:order-1">
              <TeamAReport teamName={matchup?.awayTeamName} year={year} teamId={matchup?.awayId} />
            </div>
            {/* Right Column: Team B (Home) */}
            <div className="order-3 md:order-3">
              <TeamBReport teamName={matchup?.homeTeamName} year={year} teamId={matchup?.homeId} />
            </div>
          </div>
        </div>
        {/* Close Button */}
        <div className="flex justify-end mt-4">
          <button
            className="px-4 py-2 mb-2 bg-[#235347] text-white rounded hover:bg-[#1b3e32]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoutingReport;