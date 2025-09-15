// In src/components/teams/teams_components/TeamTopPerformers.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamTopPerformers = ({ teamData, year }) => {
  const [performers, setPerformers] = useState({ topPasser: null, topRusher: null, topReceiver: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPerformers = async () => {
      console.log('Fetching top performers for teamId:', teamData.id, 'year:', year); // Debug log
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
        console.log('Top performers data received:', data); // Debug log
        setPerformers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformers();
  }, [teamData, year]);

  if (loading) return <div className="p-2 text-gray-500">Loading top performers...</div>;
  if (error) return <div className="p-2 text-red-500">Error: {error}</div>;

  return (
    <div>
      <h3 className="text-md font-semibold mb-2">Team Top Performers</h3>
      <div>
        <p><strong>Top Passer:</strong></p>
        {performers.topPasser ? (
          <Link
            to={`/players/qb/${performers.topPasser.playerId}`} // Use playerId for routing
            className="text-blue-500 hover:text-blue-700 underline"
          >
            {performers.topPasser.name}: {performers.topPasser.yards} yards
          </Link>
        ) : (
          <p>No top passer data</p>
        )}
        <p><strong>Top Rusher:</strong></p>
        {performers.topRusher ? (
          <Link
            to={`/players/rb/${performers.topRusher.playerId}`} // Use playerId for routing
            className="text-blue-500 hover:text-blue-700 underline"
          >
            {performers.topRusher.name}: {performers.topRusher.yards} yards
          </Link>
        ) : (
          <p>No top rusher data</p>
        )}
        <p><strong>Top Receiver:</strong></p>
        {performers.topReceiver ? (
          <Link
            to={`/players/wr/${performers.topReceiver.playerId}`} // Use playerId for routing
            className="text-blue-500 hover:text-blue-700 underline"
          >
            {performers.topReceiver.name}: {performers.topReceiver.yards} yards
          </Link>
        ) : (
          <p>No top receiver data</p>
        )}
      </div>
    </div>
  );
};

export default TeamTopPerformers;