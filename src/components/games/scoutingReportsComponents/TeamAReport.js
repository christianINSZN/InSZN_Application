import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamAReport = ({ teamName, teamId, year }) => {
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [performers, setPerformers] = useState({ topPasser: null, topRusher: null, topReceiver: null });
  const [performersLoading, setPerformersLoading] = useState(true);
  const [performersError, setPerformersError] = useState(null);
  const week = '14';

  useEffect(() => {
    const fetchRankings = async () => {
      if (!teamId || !year) {
        setError('Missing team ID or year');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/rankings_full_specific/${teamId}/${year}/${week}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch rankings data: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Rankings data:', data);
        setRankings(data);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchPerformers = async () => {
      console.log('Fetching top performers for teamId:', teamId, 'year:', year);
      try {
        setPerformersLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${teamId}/${year}/top-performers`, {
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

    if (teamId && !isNaN(parseInt(year))) {
      fetchRankings();
      fetchPerformers();
    } else {
      setPerformersError('Invalid team data or year');
      setPerformersLoading(false);
    }
  }, [teamId, year]);

  return (
    <div className="space-y-4">
      <div className="border border-gray-300 rounded-lg p-0">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[30px] rounded">{teamName} Team Rankings</h2>
        {loading && <div className="text-gray-500">Loading...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {!loading && !error && rankings && (
          <div className="bg-white rounded-lg shadow-lg">
            <table className="w-full text-sm text-left text-black">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">Record</td>
                  <td className="py-2 px-4">{rankings.record || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">SP+ Ranking</td>
                  <td className="py-2 px-4">{rankings.SP_Ranking || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">SP+ Rating</td>
                  <td className="py-2 px-4">{rankings.SP_Rating ? rankings.SP_Rating.toFixed(2) : 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">SP+ Offense Ranking</td>
                  <td className="py-2 px-4">{rankings.SP_Off_Ranking || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">SP+ Offense Rating</td>
                  <td className="py-2 px-4">{rankings.SP_Off_Rating ? rankings.SP_Off_Rating.toFixed(2) : 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">SP+ Defense Ranking</td>
                  <td className="py-2 px-4">{rankings.SP_Def_Ranking || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">SP+ Defense Rating</td>
                  <td className="py-2 px-4">{rankings.SP_Def_Rating ? rankings.SP_Def_Rating.toFixed(2) : 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">ELO Rating</td>
                  <td className="py-2 px-4">{rankings.ELO_Rating ? rankings.ELO_Rating : 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">SOR Rank</td>
                  <td className="py-2 px-4">{rankings.SOR || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">SOS Rank</td>
                  <td className="py-2 px-4">{rankings.SOS || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">FPI Ranking</td>
                  <td className="py-2 px-4">{rankings.FPI_Ranking || 'N/A'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">Coaches Poll Rank</td>
                  <td className="py-2 px-4">{rankings.coaches_poll_rank || 'NR'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-bold">AP Poll Rank</td>
                  <td className="py-2 px-4">{rankings.ap_poll_rank || 'NR'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
        <div className="p-0">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[30px] rounded">{teamName} Season Stat Leaders</h2>
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
                      <p className="text-gray-500 text-md">No top rusher data</p>
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