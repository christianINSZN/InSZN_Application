import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import TeamHeader from './teams_components/TeamHeader';
import TeamRoster from './teams_components/TeamRoster';
import TeamStats from './teams_components/TeamStats';
import TeamSchedule from './teams_components/TeamSchedule';
import TeamStandings from './teams_components/TeamStandings';
import TeamGameLog from './teams_components/TeamGameLog';
import TeamStatLeaders from './teams_components/TeamStatLeaders';
import TeamTopPerformers from './teams_components/TeamTopPerformers';
import TeamNewsfeed from './teams_components/TeamNewsFeed';

const TeamLanding = () => {
  const { id, year = '2025' } = useParams();
  console.log('Fetching team data for id:', id, 'year:', year);
  const location = useLocation();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${id}/${year}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch team data: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Team data received:', data);
        setTeamData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamData();
  }, [id, year]);

  if (loading) return <div className="p-4 text-black">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!teamData) return <div className="p-4 text-black">No team data available</div>;

  const { school, abbreviation, mascot, logo_main } = teamData;
  console.log('Logo_main:', logo_main);
  const isOverviewActive = location.pathname === `/teams/${id}/${year}`;
  const isRosterActive = location.pathname === `/teams/${id}/${year}/roster`;
  const isStatsActive = location.pathname === `/teams/${id}/${year}/stats`;
  const isScheduleActive = location.pathname === `/teams/${id}/${year}/schedule`;

  return (
    <div className="w-full p-0 shadow-xl rounded-lg">
      <div className="py-6" style={{ boxSizing: 'border-box' }}>
        {/* Header Container */}
        <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
          <div className="flex items-center justify-center bg-white shadow-lg border-b border-[#235347] h-[80px] rounded">
            {logo_main ? (
              <div className="text-center">
                <img
                  src={logo_main}
                  alt={`${school} logo`}
                  className="w-16 h-16 mx-auto"
                  onError={(e) => console.error(`Failed to load logo: ${logo_main}`)}
                />
              </div>
            ) : (
              <div className="text-center w-16 h-16 flex items-center justify-center">
                <span className="text-gray-500">No Logo</span>
              </div>
            )}
            <h2 className="text-3xl font-bold text-gray-700 ml-4">{school} {mascot}</h2>
          </div>
        </div>
        {/* Nav Bar */}
        <div className="border-b border-[#235347] mb-4">
          <ul className="flex gap-4 justify-center p-4">
            <li>
              <Link
                to={`/teams/${id}/${year}`}
                className={`text-black hover:text-gray-900 pb-2 border-b-2 ${isOverviewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
              >
                Overview
              </Link>
            </li>
            <li>
              <Link
                to={`/teams/${id}/${year}/roster`}
                className={`text-black hover:text-gray-900 pb-2 border-b-2 ${isRosterActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
              >
                Roster
              </Link>
            </li>
            <li>
              <Link
                to={`/teams/${id}/${year}/stats`}
                className={`text-black hover:text-gray-900 pb-2 border-b-2 ${isStatsActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
              >
                Stats
              </Link>
            </li>
            <li>
              <Link
                to={`/teams/${id}/${year}/schedule`}
                className={`text-black hover:text-gray-900 pb-2 border-b-2 ${isScheduleActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
              >
                Schedule
              </Link>
            </li>
          </ul>
        </div>
        {/* Main Containers with Three-Column Layout */}
        <div className="flex flex-col md:flex-row w-full gap-4" style={{ alignItems: 'flex-start', boxSizing: 'border-box' }}>
          {/* Left Container: Conference Standings */}
          <div className="p-0 bg-gray-0 rounded-lg shadow-xl" style={{ flexBasis: '25%', minWidth: '25%', boxSizing: 'border-box' }}>
            <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Standings</h2>
            <div className="p-4">
              <TeamStandings teamData={teamData} year={year} currentTeamId={id} />
            </div>
          </div>
          {/* Middle Column: Game Log and Newsfeed */}
          <div className="flex flex-col" style={{ flexBasis: '45%', minWidth: '45%', boxSizing: 'border-box' }}>
            {/* Middle Container: Season Game Log */}
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Game Log</h2>
              <div className="p-4">
                <TeamGameLog teamData={teamData} year={year} />
              </div>
            </div>
            {/* Newsfeed Container */}
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl mt-4">
              <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Newsfeed</h2>
              <div className="p-4">
                <TeamNewsfeed teamData={teamData} year={year} />
              </div>
            </div>
          </div>
          {/* Right Column: Stat Leaders and Top Performers */}
          <div className="flex flex-col" style={{ flexBasis: '28%', minWidth: '28%', boxSizing: 'border-box' }}>
            {/* Right Container: Stat Leaders */}
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Stat Leaders</h2>
              <div className="p-4">
                <TeamStatLeaders teamData={teamData} year={year} />
              </div>
            </div>
            {/* Top Performers Container */}
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl mt-4">
              <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Top Performers</h2>
              <div className="p-4">
                <TeamTopPerformers teamData={teamData} year={year} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamLanding;