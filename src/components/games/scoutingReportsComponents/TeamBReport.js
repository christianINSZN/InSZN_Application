import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamBReport = ({ teamName, teamId, year }) => {
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
            <table className="w-full text-sm text-black">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.record || 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">Record</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.SP_Ranking || 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">SP+ Ranking</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.SP_Rating ? rankings.SP_Rating.toFixed(2) : 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">SP+ Rating</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.SP_Off_Ranking || 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">SP+ Offense Ranking</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.SP_Off_Rating ? rankings.SP_Off_Rating.toFixed(2) : 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">SP+ Offense Rating</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.SP_Def_Ranking || 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">SP+ Defense Ranking</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.SP_Def_Rating ? rankings.SP_Def_Rating.toFixed(2) : 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">SP+ Defense Rating</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.ELO_Rating ? rankings.ELO_Rating : 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">ELO Rating</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.SOR || 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">SOR Rank</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.SOS || 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">SOS Rank</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.FPI_Ranking || 'N/A'}</td>
                  <td className="py-2 px-4 font-bold text-right">FPI Ranking</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.coaches_poll_rank || 'NR'}</td>
                  <td className="py-2 px-4 font-bold text-right">Coaches Poll Rank</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">{rankings.ap_poll_rank || 'NR'}</td>
                  <td className="py-2 px-4 font-bold text-right">AP Poll Rank</td>
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
                    <p className="text-md font-semibold text-gray-800 text-right">Top Passer</p>
                    {performers.topPasser ? (
                      <p className="text-right">
                        <Link
                          to={`/players/qb/${performers.topPasser.playerId}`}
                          state={{ year }}
                          className="text-[#235347] hover:text-[#235347]/30 text-md"
                        >
                          {performers.topPasser.yards} yards: {performers.topPasser.name}
                        </Link>
                      </p>
                    ) : (
                      <p className="text-gray-500 text-xs">No top passer data</p>
                    )}
                  </div>
                  <div className="p-2 border border-gray-300 rounded bg-gray-50">
                    <p className="text-md font-semibold text-gray-800 text-right">Top Rusher</p>
                    {performers.topRusher ? (
                      <p className="text-right">
                        <Link
                          to={`/players/rb/${performers.topRusher.playerId}`}
                          state={{ year }}
                          className="text-[#235347] hover:text-[#235347]/30 text-md"
                        >
                          {performers.topRusher.yards} yards: {performers.topRusher.name}
                        </Link>
                      </p>
                    ) : (
                      <p className="text-gray-500 text-xs">No top rusher data</p>
                    )}
                  </div>
                  <div className="p-2 border border-gray-300 rounded bg-gray-50">
                    <p className="text-md font-semibold text-gray-800 text-right">Top Receiver</p>
                    {performers.topReceiver ? (
                      <p className="text-right">
                        <Link
                          to={`/players/wr/${performers.topReceiver.playerId}`}
                          state={{ year }}
                          className="text-[#235347] hover:text-[#235347]/30 text-md"
                        >
                          {performers.topReceiver.yards} yards: {performers.topReceiver.name}
                        </Link>
                      </p>
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

export default TeamBReport;