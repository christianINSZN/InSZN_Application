import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamTopPerformers = ({ teamData, year }) => {
  const [performers, setPerformers] = useState({ topPasser: null, topRusher: null, topReceiver: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPerformers = async () => {
      console.log('Fetching top performers for teamId:', teamData.id, 'year:', year);
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${teamData.id}/${year}/top-performers`, {
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
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (teamData?.id && !isNaN(parseInt(year))) {
      fetchPerformers();
    } else {
      setError('Invalid team data or year');
      setLoading(false);
    }
  }, [teamData, year]);

  if (loading) return <div className="p-2 text-gray-500 text-xs">Loading top performers...</div>;
  if (error) return <div className="p-2 text-red-500 text-xs">Error: {error}</div>;

  return (
    <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
      <div className="p-2">
        {[!performers.topPasser && !performers.topRusher && !performers.topReceiver ? (
          <p className="text-gray-500 text-xs">No performer data available</p>
        ) : (
          <div className="space-y-2">
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
          </div>
        )]}
      </div>
    </div>
  );
};

export default TeamTopPerformers;