import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ScoutingReport from './ScoutingReport';

const SingleGamePreview = ({ year = '2025' }) => {
  const { id } = useParams(); // Get game ID from route
  const [matchup, setMatchup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams_games/${id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch game data: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        if (data.completed !== 0) {
          throw new Error('Game is already completed');
        }
        setMatchup({
          awayId: data.awayId,
          homeId: data.homeId,
          awayTeamName: data.awayTeam,
          homeTeamName: data.homeTeam,
          awayTeamLogo: data.awayTeamLogo,
          homeTeamLogo: data.homeTeamLogo,
        });
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGameData();
  }, [id]);

  if (isLoading) {
    return <div className="p-4 text-black text-lg">Loading game preview...</div>;
  }

  if (error || !matchup) {
    return <div className="p-4 text-red-500 text-lg">Error: {error || 'No game data available'}</div>;
  }

  return (
    <div className="p-4 sm:p-8 bg-gray-100 min-h-screen">
      <h1 className="text-xl sm:text-2xl font-bold text-[#235347] mb-4">
        Game Preview: {matchup.awayTeamName} vs. {matchup.homeTeamName}
      </h1>
      <ScoutingReport matchup={matchup} year={year} />
    </div>
  );
};

export default SingleGamePreview;