import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TeamStandings = ({ teamData, year, currentTeamId }) => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStandings = async () => {
      console.log('Fetching standings for year:', year, 'conference:', teamData.conference);
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/records/${year}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch standings: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Standings data received:', data);
        // Filter by conference and sort by conference record
        const conferenceStandings = data
          .filter(record => record.conference === teamData.conference)
          .sort((a, b) => {
            if (b.conferenceGames_wins !== a.conferenceGames_wins) {
              return b.conferenceGames_wins - a.conferenceGames_wins; // Sort by wins descending
            }
            return a.conferenceGames_losses - b.conferenceGames_losses; // Tiebreak by losses ascending
          });
        setStandings(conferenceStandings);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (teamData?.conference) {
      fetchStandings();
    } else {
      setError('No conference data available');
      setLoading(false);
    }
  }, [teamData, year]);

  if (loading) return <div className="p-2 text-gray-500">Loading standings...</div>;
  if (error) return <div className="p-2 text-red-500">Error: {error}</div>;
  if (standings.length === 0) return <div className="p-2 text-gray-500">No standings available for {teamData.conference}</div>;

  const formatRecord = (wins, losses, ties) => `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`;

  return (
    <div>
      <table className="w-full text-left border-collapse">
        <thead className="bg-white">
          <tr>
            <th className="p-1 text-xs font-semibold border-b border-gray-400">TEAM</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400">CONF</th>
            <th className="p-1 text-xs font-semibold border-b border-gray-400">OVR</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team) => (
            <tr key={team.teamId} className={team.teamId === parseInt(currentTeamId) ? 'font-bold bg-[#235347]/20' : ''}>
              <td className="p-1 text-xs border-b border-gray-300">
                <Link
                  to={`/teams/${team.teamId}/${year}`}
                  className="text-[#235347] hover:text-[#235347]/50 underline"
                >
                  {team.team}
                </Link>
              </td>
              <td className="p-1 text-xs border-b border-gray-300">
                {formatRecord(team.conferenceGames_wins, team.conferenceGames_losses, team.conferenceGames_ties)}
              </td>
              <td className="p-1 text-xs border-b border-gray-300">
                {formatRecord(team.total_wins, team.total_losses, team.total_ties)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeamStandings;