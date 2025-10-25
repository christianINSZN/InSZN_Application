import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamAReport = ({ teamName, teamId, year, gameId }) => {
  const [gameStats, setGameStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [performers, setPerformers] = useState({ topPasser: null, topRusher: null, topReceiver: null });
  const [performersLoading, setPerformersLoading] = useState(true);
  const [performersError, setPerformersError] = useState(null);

  useEffect(() => {
    const fetchGameStats = async () => {
      if (!teamId || !year || !gameId) {
        setError('Missing team ID, year, or game ID');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/games/recap/${gameId}/${teamId}/stats`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch game stats: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Game stats data:', data);
        setGameStats(data);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchPerformers = async () => {
      console.log('Fetching top performers for teamId:', teamId, 'year:', year, 'gameId:', gameId);
      try {
        setPerformersLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/games/${gameId}/${teamId}/top-performers`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch top performers: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Top performers data received:', data);
        setPerformers(data);
      } catch (err) {
        setPerformersError(err.message);
      } finally {
        setPerformersLoading(false);
      }
    };

    if (teamId && !isNaN(parseInt(year)) && gameId) {
      fetchGameStats();
      fetchPerformers();
    } else {
      setPerformersError('Invalid team data, year, or game ID');
      setPerformersLoading(false);
    }
  }, [teamId, year, gameId]);

  return (
    <div className="space-y-4">
      <div className="border border-gray-300 rounded-lg p-0">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[30px] rounded">{teamName || 'Away Team'} Game Stats</h2>
        {loading && <div className="text-gray-500">Loading...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {!loading && !error && gameStats && (
          <div className="bg-white rounded-lg shadow-lg">
            <table className="w-full text-sm text-left text-black">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">Points Scored</td>
                  <td className="py-2 px-4">{gameStats.pointsScored || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">Total Yards</td>
                  <td className="py-2 px-4">{gameStats.totalYards || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">Passing Yards</td>
                  <td className="py-2 px-4">{gameStats.passingYards || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">Rushing Yards</td>
                  <td className="py-2 px-4">{gameStats.rushingYards || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">First Downs</td>
                  <td className="py-2 px-4">{gameStats.firstDowns || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">Turnovers</td>
                  <td className="py-2 px-4">{gameStats.turnovers || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">Penalties</td>
                  <td className="py-2 px-4">{gameStats.penalties || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">Time of Possession</td>
                  <td className="py-2 px-4">{gameStats.timeOfPossession || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
        <div className="p-0">
          <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[30px] rounded">{teamName || 'Away Team'} Game Stat Leaders</h2>
          {performersLoading && <div className="p-2 text-gray-500 text-xs">Loading top performers...</div>}
          {performersError && <div className="p-2 text-red-500 text-xs">Error: {performersError}</div>}
          {!performersLoading && !performersError && (
            <div className="space-y-2">
              {!performers.topPasser && !performers.topRusher && !performers.topReceiver ? (
                <p className="text-gray-500 text-xs">No performer data available</p>
              ) : (
                <>
                  <div className="p-2 border border-gray-300 rounded bg-gray-50">
                    <p className="text-md font-semibold text-gray-800">Top Passer</p>
                    {performers.topPasser ? (
                      <Link
                        to={`/players/qb/${performers.topPasser.playerId}`}
                        state={{ year }}
                        className="text-[#235347] hover:text-[#235347]/30 text-md"
                      >
                        {performers.topPasser.name}: {performers.topPasser.yards} yards
                      </Link>
                    ) : (
                      <p className="text-gray-500 text-xs">No top passer data</p>
                    )}
                  </div>
                  <div className="p-2 border border-gray-300 rounded bg-gray-50">
                    <p className="text-md font-semibold text-gray-800">Top Rusher</p>
                    {performers.topRusher ? (
                      <Link
                        to={`/players/rb/${performers.topRusher.playerId}`}
                        state={{ year }}
                        className="text-[#235347] hover:text-[#235347]/30 text-md"
                      >
                        {performers.topRusher.name}: {performers.topRusher.yards} yards
                      </Link>
                    ) : (
                      <p className="text-gray-500 text-xs">No top rusher data</p>
                    )}
                  </div>
                  <div className="p-2 border border-gray-300 rounded bg-gray-50">
                    <p className="text-md font-semibold text-gray-800">Top Receiver</p>
                    {performers.topReceiver ? (
                      <Link
                        to={`/players/wr/${performers.topReceiver.playerId}`}
                        state={{ year }}
                        className="text-[#235347] hover:text-[#235347]/30 text-md"
                      >
                        {performers.topReceiver.name}: {performers.topReceiver.yards} yards
                      </Link>
                    ) : (
                      <p className="text-gray-500 text-xs">No top receiver data</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamAReport;