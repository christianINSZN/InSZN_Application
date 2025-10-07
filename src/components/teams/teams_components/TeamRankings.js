import React, { useState, useEffect } from 'react';

const TeamRankings = ({ teamId, year, className }) => {
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Specify week here
  const week = '2';

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
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/rankings_full/${year}/${week}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch rankings data: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Rankings data received:', data);
        const teamRanking = data.find(row => row.teamId === parseInt(teamId));
        if (!teamRanking) {
          throw new Error(`No rankings found for teamId: ${teamId}`);
        }
        setRankings(teamRanking);
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
        <h2 className="flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded">
          {year} {school} Rankings (Week {week})
        </h2>
        <div className="p-2">
          <table className="w-full text-sm text-left text-gray-500">
            <tbody>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">Conference</td>
                <td className="py-1 px-2">{conference || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">Record</td>
                <td className="py-1 px-2">{record || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">Coaches Poll Rank</td>
                <td className="py-1 px-2">{coaches_poll_rank || 'NR'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">AP Poll Rank</td>
                <td className="py-1 px-2">{ap_poll_rank || 'NR'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">SP+ Ranking</td>
                <td className="py-1 px-2">{SP_Ranking || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">SP+ Rating</td>
                <td className="py-1 px-2">{SP_Rating ? SP_Rating.toFixed(2) : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">SP+ Offense Ranking</td>
                <td className="py-1 px-2">{SP_Off_Ranking || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">SP+ Offense Rating</td>
                <td className="py-1 px-2">{SP_Off_Rating ? SP_Off_Rating.toFixed(2) : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">SP+ Defense Ranking</td>
                <td className="py-1 px-2">{SP_Def_Ranking || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">SP+ Defense Rating</td>
                <td className="py-1 px-2">{SP_Def_Rating ? SP_Def_Rating.toFixed(2) : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">ELO Rating</td>
                <td className="py-1 px-2">{ELO_Rating ? ELO_Rating.toFixed(2) : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">SOR</td>
                <td className="py-1 px-2">{SOR ? SOR.toFixed(2) : 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">FPI Ranking</td>
                <td className="py-1 px-2">{FPI_Ranking || 'N/A'}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 px-2 font-medium">SOS</td>
                <td className="py-1 px-2">{SOS ? SOS.toFixed(2) : 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamRankings;