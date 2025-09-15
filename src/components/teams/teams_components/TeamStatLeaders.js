// In src/components/teams/teams_components/TeamStatLeaders.js
import React, { useState, useEffect } from 'react';

const TeamStatLeaders = ({ teamData, year }) => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      console.log('Fetching stats for teamId:', teamData.id, 'year:', year); // Debug log
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${teamData.id}/${year}/stats`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch stats: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Stats data received:', data); // Debug log
        // Aggregate stats into an object
        const aggregatedStats = data.reduce((acc, stat) => {
          acc[stat.statName] = stat.statValue;
          return acc;
        }, {});
        setStats(aggregatedStats);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [teamData, year]);

  if (loading) return <div className="p-2 text-gray-500">Loading stats...</div>;
  if (error) return <div className="p-2 text-red-500">Error: {error}</div>;

  const games = stats.games || 0;
  const yardsPerGame = games > 0 ? (stats.totalYards || 0) / games : 0;
  const opponentYardsPerGame = games > 0 ? (stats.totalYardsOpponent || 0) / games : 0;
  const passingTDPerGame = games > 0 ? (stats.passingTDs || 0) / games : 0;
  const rushingTDPerGame = games > 0 ? (stats.rushingTDs || 0) / games : 0;

  return (
    <div>
      <h3 className="text-md font-semibold mb-2">Team Stat Leaders</h3>
      <div className="grid grid-cols-2 grid-rows-2 gap-0">
        {/* Yards Per Game */}
        <div className="p-2 bg-white border border-gray-300">
          <h4 className="text-sm font-medium">Yards Per Game</h4>
          <p className="text-lg">{yardsPerGame.toFixed(1)}</p>
        </div>
        {/* Opponent Yards Per Game */}
        <div className="p-2 bg-white border border-gray-300">
          <h4 className="text-sm font-medium">Opponent Yards Per Game</h4>
          <p className="text-lg">{opponentYardsPerGame.toFixed(1)}</p>
        </div>
        {/* Passing TD Per Game */}
        <div className="p-2 bg-white border border-gray-300">
          <h4 className="text-sm font-medium">Passing TD Per Game</h4>
          <p className="text-lg">{passingTDPerGame.toFixed(1)}</p>
        </div>
        {/* Rushing TD Per Game */}
        <div className="p-2 bg-white border border-gray-300">
          <h4 className="text-sm font-medium">Rushing TD Per Game</h4>
          <p className="text-lg">{rushingTDPerGame.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
};

export default TeamStatLeaders;