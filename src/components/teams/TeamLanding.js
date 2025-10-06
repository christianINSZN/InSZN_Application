import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import TeamStandings from './teams_components/TeamStandings';
import TeamGameLog from './teams_components/TeamGameLog';
import TeamFeed from './teams_components/TeamFeed';
import TeamTopPerformers from './teams_components/TeamTopPerformers';
import TeamNewsfeed from './teams_components/TeamNewsFeed';

const TeamLanding = () => {
  const { id, year = '2025' } = useParams();
  console.log('Fetching team data for id:', id, 'year:', year);
  const location = useLocation();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMobile = window.innerWidth < 640;

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

  if (loading) return <div className="p-2 text-black text-base">Loading...</div>;
  if (error) return <div className="p-2 text-red-500 text-base">Error: {error}</div>;
  if (!teamData) return <div className="p-2 text-black text-base">No team data available</div>;

  const { school, abbreviation, mascot, logo_main, color, alternateColor } = teamData;
  console.log('Logo_main:', logo_main);

  const isOverviewActive = location.pathname === `/teams/${id}/${year}`;
  const isRosterActive = location.pathname === `/teams/${id}/${year}/roster`;
  const isStatsActive = location.pathname === `/teams/${id}/${year}/stats`;
  const isScheduleActive = location.pathname === `/teams/${id}/${year}/schedule`;

  if (isMobile) {
    return (
      <div className="w-full p-2 shadow-xl rounded-lg mt-0">
        <div className="py-2" style={{ boxSizing: 'border-box' }}>
          {/* Header Container */}
          <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
            <div
              className="flex items-center justify-center shadow-lg border-b border-[#235347] h-16 rounded px-4"
              style={{
                background: `linear-gradient(to right, ${color}, white, ${alternateColor})`
              }}
            >
              {logo_main ? (
                <img
                  src={logo_main}
                  alt={`${school} logo`}
                  className="w-12 h-12"
                  onError={(e) => console.error(`Failed to load logo: ${logo_main}`)}
                />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">No Logo</span>
                </div>
              )}
            </div>
          </div>
          {/* Nav Bar */}
          <div className="border-b border-[#235347] mb-4">
            <ul className="flex gap-2 justify-center p-2">
              <li>
                <Link
                  to={`/teams/${id}/${year}`}
                  className={`text-[#235347] hover:text-[#235347] pb-0.5 border-b-2 text-xs px-1 ${isOverviewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  to={`/teams/${id}/${year}/roster`}
                  className={`text-[#235347] hover:text-[#235347] pb-0.5 border-b-2 text-xs px-1 ${isRosterActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Roster
                </Link>
              </li>
              {/* <li>
                <Link
                  to={`/teams/${id}/${year}/stats`}
                  className={`text-[#235347] hover:text-[#235347] pb-0.5 border-b-2 text-xs px-1 ${isStatsActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Stats
                </Link>
              </li>
              <li>
                <Link
                  to={`/teams/${id}/${year}/schedule`}
                  className={`text-[#235347] hover:text-[#235347] pb-0.5 border-b-2 text-xs px-1 ${isScheduleActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Schedule
                </Link>
              </li> */}
            </ul>
          </div>
          {/* Main Containers: Single-Column Layout */}
          <div className="flex flex-col gap-4" style={{ boxSizing: 'border-box' }}>
            {/* Conference Standings */}
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded">{year} {teamData.conference} Standings</h2>
              <div className="p-0">
                <TeamStandings teamData={teamData} year={year} currentTeamId={id} className="text-sm" />
              </div>
            </div>
            {/* Season Game Log */}
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded">Game Log</h2>
              <div className="p-2">
                <TeamGameLog teamData={teamData} year={year} className="text-sm" />
              </div>
            </div>
            {/* Newsfeed */}
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded">Featured Contributors</h2>
              <div className="p-2">
                <TeamNewsfeed teamData={teamData} year={year} className="text-sm" />
              </div>
            </div>
            {/* Top Performers */}
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded">Key Performers</h2>
              <div className="p-0">
                <TeamTopPerformers teamData={teamData} year={year} className="text-sm" />
              </div>
            </div>
            {/* Team Feed */}
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded">Team Feed</h2>
              <div className="p-2">
                <TeamFeed teamData={teamData} year={year} className="text-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="w-full p-4 shadow-xl rounded-lg mt-12">
        <div className="py-4" style={{ boxSizing: 'border-box' }}>
          {/* Header Container */}
          <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
            <div
              className="flex items-center justify-center shadow-lg border-b border-[#235347] h-[80px] rounded px-6"
              style={{
                background: `linear-gradient(to right, ${color}, white, ${alternateColor})`
              }}
            >
              {logo_main ? (
                <img
                  src={logo_main}
                  alt={`${school} logo`}
                  className="w-16 h-16"
                  onError={(e) => console.error(`Failed to load logo: ${logo_main}`)}
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center">
                  <span className="text-gray-500 text-base">No Logo</span>
                </div>
              )}
            </div>
          </div>
          {/* Nav Bar */}
          <div className="border-b border-[#235347] mb-6">
            <ul className="flex gap-4 justify-center p-4">
              <li>
                <Link
                  to={`/teams/${id}/${year}`}
                  className={`text-[#235347] hover:text-[#235347] pb-2 border-b-2 text-base px-0 ${isOverviewActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  to={`/teams/${id}/${year}/roster`}
                  className={`text-[#235347] hover:text-[#235347] pb-2 border-b-2 text-base px-0 ${isRosterActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Roster
                </Link>
              </li>
              {/* <li>
                <Link
                  to={`/teams/${id}/${year}/stats`}
                  className={`text-[#235347] hover:text-[#235347] pb-2 border-b-2 text-base px-0 ${isStatsActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Stats
                </Link>
              </li> */}
              {/* <li>
                <Link
                  to={`/teams/${id}/${year}/schedule`}
                  className={`text-[#235347] hover:text-[#235347] pb-2 border-b-2 text-base px-0 ${isScheduleActive ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`}
                >
                  Schedule
                </Link>
              </li> */}
            </ul>
          </div>
          {/* Main Containers: Three-Column Layout */}
          <div className="flex flex-row w-full gap-6" style={{ alignItems: 'flex-start', boxSizing: 'border-box' }}>
            {/* Left Container: Conference Standings */}
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl" style={{ flexBasis: '20%', minWidth: '20%', boxSizing: 'border-box' }}>
              <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">{year} {teamData.conference} Standings</h2>
              <div className="p-0">
                <TeamStandings teamData={teamData} year={year} currentTeamId={id} className="text-base" />
              </div>
            </div>
            {/* Middle Column: Game Log and Newsfeed */}
            <div className="flex flex-col gap-6" style={{ flexBasis: '58%', minWidth: '58%', boxSizing: 'border-box' }}>
              {/* Middle Container: Season Game Log */}
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Game Log</h2>
                <div className="p-0">
                  <TeamGameLog teamData={teamData} year={year} className="text-base" />
                </div>
              </div>
              {/* Newsfeed Container */}
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Featured Contributors</h2>
                <div className="p-0">
                  <TeamNewsfeed teamData={teamData} year={year} className="text-base" />
                </div>
              </div>
            </div>
            {/* Right Column: Stat Leaders and Top Performers */}
            <div className="flex flex-col gap-6" style={{ flexBasis: '20%', minWidth: '20%', boxSizing: 'border-box' }}>
              {/* Top Performers Container */}
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Key Performers</h2>
                <div className="p-0">
                  <TeamTopPerformers teamData={teamData} year={year} className="text-base" />
                </div>
              </div>
              {/* Right Container: Stat Leaders */}
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Team Feed</h2>
                <div className="p-0">
                  <TeamFeed teamData={teamData} year={year} className="text-base" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default TeamLanding;