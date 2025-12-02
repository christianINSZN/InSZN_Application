import React, { useEffect, useMemo, useState, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const conferences = [
  'All', 'ACC', 'American Athletic', 'Big 12', 'Big Ten', 'Conference USA',
  'FBS Independents', 'Mid-American', 'Mountain West',
  'Pac-12', 'SEC', 'Sun Belt'
];

function TeamsComponent({ year = '2025' }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [teamsData, setTeamsData] = useState([]);
  const [filterTeamName, setFilterTeamName] = useState('');
  const [filterConference, setFilterConference] = useState('');
  const [activeConference, setActiveConference] = useState('All');

  const uniqueTeamNames = useMemo(() => {
    return [...new Set(teamsData.map(team => team.school).filter(Boolean))].sort();
  }, [teamsData]);

  const uniqueConferences = useMemo(() => {
    return [...new Set(teamsData.map(team => team.conference).filter(Boolean))].sort();
  }, [teamsData]);

  useEffect(() => {
    let isMounted = true;
    if (isLoading) {
      fetch(`${process.env.REACT_APP_API_URL}/api/teams`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(text => {
          if (isMounted) {
            try {
              const data = JSON.parse(text);
              const validData = Array.isArray(data) ? data.filter(team => team && typeof team === 'object' && team.school && team.conference) : [];
              setTeamsData(validData);
            } catch (e) {
              console.error('JSON parsing error:', e.message, 'Raw response:', text);
            } finally {
              setIsLoading(false);
            }
          }
        })
        .catch(error => {
          if (isMounted) {
            console.error('API error:', error);
            setIsLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isLoading]);

  if (isLoading) {
    return <div className="p-4"><p className="text-black text-base sm:text-lg">Loading teams...</p></div>;
  }

  if (teamsData.length === 0) {
    return <div className="p-4"><p className="text-black text-base sm:text-lg">No teams data available.</p></div>;
  }

  const filteredTeams = teamsData.filter(team => {
    const isDivisionI = team.classification === 'fbs';
    const teamNameMatch = team.school.toLowerCase().includes(filterTeamName.toLowerCase());
    const conferenceMatch = !filterConference || filterConference === 'All' || team.conference.toLowerCase() === filterConference.toLowerCase();
    return isDivisionI && teamNameMatch && conferenceMatch;
  });

  const teamsByConference = {};
  filteredTeams.forEach(team => {
    if (!teamsByConference[team.conference]) {
      teamsByConference[team.conference] = [];
    }
    teamsByConference[team.conference].push(team);
  });

  const sortedConferences = Object.keys(teamsByConference).sort();

  return (
    <div className="p-2 sm:p-4 shadow-xl rounded-lg mt-0 sm:mt-12">
      <div className="mb-4 sm:mb-6 mt-3 gap-4 items-end bg-gray-200 p-2 sm:p-4 rounded-lg shadow-xl">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="w-full">
            <label htmlFor="teamNameFilter" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
              Filter by Team Name
            </label>
            <input
              list="teamNames"
              id="teamNameFilter"
              value={filterTeamName}
              onChange={(e) => setFilterTeamName(e.target.value)}
              className="w-full p-3 sm:p-2 border border-gray-300 rounded text-black text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#235347]"
              placeholder="Search teams..."
            />
            <datalist id="teamNames">
              {uniqueTeamNames.map((team, index) => (
                <option key={index} value={team} />
              ))}
            </datalist>
          </div>
          <div className="w-full">
            <label htmlFor="conferenceFilter" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
              Filter by Conference
            </label>
            <input
              list="conferences"
              id="conferenceFilter"
              value={filterConference}
              onChange={(e) => setFilterConference(e.target.value)}
              className="w-full p-3 sm:p-2 border border-gray-300 rounded text-black text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#235347]"
              placeholder="Search conferences..."
            />
            <datalist id="conferences">
              {uniqueConferences.map((conference, index) => (
                <option key={index} value={conference} />
              ))}
            </datalist>
          </div>
        </div>
      </div>
      <div className="border-b border-gray-300 mb-4 sm:mb-6">
        <div className="overflow-x-auto whitespace-nowrap py-2">
          <ul className="flex gap-2 sm:gap-4 justify-start sm:justify-center p-2 sm:p-4">
            {conferences.map(conference => (
              <li key={conference}>
                <button
                  className={`text-black hover:text-gray-900 pb-2 border-b-2 text-sm sm:text-base px-2 sm:px-3 py-1 rounded ${activeConference === conference ? 'border-[#235347] bg-[#235347]/10' : 'border-transparent hover:border-[#235347]'}`}
                  onClick={() => {
                    setActiveConference(conference);
                    setFilterConference(conference);
                  }}
                >
                  {conference}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 p-2 sm:p-4">
        {sortedConferences.map((conference, index) => (
          <div key={conference} className="p-0 shadow-xl rounded-lg">
            <h2 className="flex items-center justify-center text-base sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-[40px] rounded">
              {conference}
            </h2>
            <div className="relative h-[362px] overflow-y-auto">
              <table className="w-full text-center border-collapse">
                <thead className="sticky top-0 bg-gray-0 z-0">
                  <tr className="bg-gray-0">
                    <th className="p-2 sm:p-3 text-sm sm:text-base font-semibold border-b border-[#235347] text-black bg-white" style={{ textAlign: 'left', verticalAlign: 'middle', lineHeight: '1.2' }}>
                      Team
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamsByConference[conference].map((team, teamIndex) => (
                    <tr key={team.id} className={teamIndex % 2 === 0 ? 'bg-gray-0' : 'bg-[#235347]/10'}>
                      <td
                        className="p-2 sm:p-3 text-sm sm:text-base text-black border-b border-gray-300"
                        style={{ textAlign: 'left', verticalAlign: 'middle', lineHeight: '1.2' }}
                      >
                        <Link
                          to={`/teams/${team.id}/${year}`}
                          className="text-black hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
                          style={{ display: 'inline-block' }}
                        >
                          {team.school} {team.mascot}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(TeamsComponent);