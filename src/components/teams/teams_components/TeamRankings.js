import React, { useState, useEffect } from 'react';

const TeamRankings = ({ teamId, year, className }) => {
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Specify week here
  const week = '7';

  useEffect(() => {
    const fetchRankings = async () => {
      if (!teamId) {
        setError('Team ID is missing');
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching rankings for teamId: ${teamId}, year: ${year}, week: ${week}`);
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/rankings_full_specific/${teamId}/${year}/${week}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch rankings data: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Rankings data received:', data);
        setRankings(data);
      } catch (err) {
        console.error('Fetch error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [teamId, year]);

  if (loading) return <div className="p-2 text-black text-base">Loading...</div>;
  if (error) return <div className="p-2 text-red-500 text-base">Error: {error}</div>;
  if (!rankings) return <div className="p-2 text-black text-base">No rankings data available</div>;

  const {
    school, coaches_poll_rank, ap_poll_rank, SP_Ranking, SP_Rating,
    SP_Off_Ranking, SP_Off_Rating, SP_Def_Ranking, SP_Def_Rating,
    ELO_Rating, SOR, FPI_Ranking, SOS, record, conference
  } = rankings;

  return (
    <div className="p-0 shadow-xl rounded-lg h-full">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-0">
          <table className="w-full text-sm text-left text-gray-500">
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">Record</td>
                <td className="py-2 px-2">{record || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">SP+ Ranking</td>
                <td className="py-2 px-2">{SP_Ranking || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">SP+ Rating</td>
                <td className="py-2 px-2">{SP_Rating ? SP_Rating.toFixed(2) : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">SP+ Offense Ranking</td>
                <td className="py-2 px-2">{SP_Off_Ranking || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">SP+ Offense Rating</td>
                <td className="py-2 px-2">{SP_Off_Rating ? SP_Off_Rating.toFixed(2) : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">SP+ Defense Ranking</td>
                <td className="py-2 px-2">{SP_Def_Ranking || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">SP+ Defense Rating</td>
                <td className="py-2 px-2">{SP_Def_Rating ? SP_Rating.toFixed(2) : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">ELO Rating</td>
                <td className="py-2 px-2">{ELO_Rating ? ELO_Rating : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">SOR Rank</td>
                <td className="py-2 px-2">{SOR ? SOR : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">SOS Rank</td>
                <td className="py-2 px-2">{SOS ? SOS : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">FPI Ranking</td>
                <td className="py-2 px-2">{FPI_Ranking || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">Coaches Poll Rank</td>
                <td className="py-2 px-2">{coaches_poll_rank || 'NR'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2 font-bold">AP Poll Rank</td>
                <td className="py-2 px-2">{ap_poll_rank || 'NR'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamRankings;