import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import TeamStandings from './teams_components/TeamStandings';
import TeamGameLog from './teams_components/TeamGameLog';
import TeamFeed from './teams_components/TeamFeed';
import TeamRankings from './teams_components/TeamRankings';
import TeamTopPerformers from './teams_components/TeamTopPerformers';
import HeadlineGrades from './teams_components/HeadlineGrades';
import MatchupProjection from './teams_components/TeamNextMatchup';

const TeamLanding = () => {
  const { id, year = '2025' } = useParams();
  const location = useLocation();
  const [teamData, setTeamData] = useState(null);
  const [percentileGrades, setPercentileGrades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        const [teamResponse, percentilesResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/teams/${id}/${year}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch(`${process.env.REACT_APP_API_URL}/api/team_percentiles/${id}/${year}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }),
        ]);

        if (!teamResponse.ok) throw new Error(`Failed to fetch team data: ${await teamResponse.text()}`);
        if (!percentilesResponse.ok) throw new Error(`Failed to fetch percentile data: ${await percentilesResponse.text()}`);

        const teamData = await teamResponse.json();
        const percentileGradesData = await percentilesResponse.json();

        setTeamData(teamData);
        setPercentileGrades(percentileGradesData);
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
  const isOverviewActive = location.pathname === `/teams/${id}/${year}`;
  const isRosterActive = location.pathname === `/teams/${id}/${year}/roster`;

  if (isMobile) {
    return (
      <div className="w-full p-2 shadow-xl rounded-lg mt-0">
        <div className="py-2" style={{ boxSizing: 'border-box' }}>
          <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
            <div
              className="flex items-center justify-center shadow-lg border-b border-[#235347] h-16 rounded px-4"
              style={{ background: `linear-gradient(to right, ${color}, white, ${alternateColor})` }}
            >
              {logo_main ? (
                <img src={logo_main} alt={`${school} logo`} className="w-12 h-12" onError={(e) => console.error(`Failed to load logo: ${logo_main}`)} />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">No Logo</span>
                </div>
              )}
            </div>
          </div>
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
            </ul>
          </div>
          <div className="flex flex-col gap-4" style={{ boxSizing: 'border-box' }}>
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <MatchupProjection teamId={id} year={year} />
            </div>
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded">{year} {teamData.conference} Standings</h2>
              <div className="p-2">
                <TeamStandings teamData={teamData} year={year} currentTeamId={id} className="text-sm" />
              </div>
            </div>
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded">Team Rankings</h2>
              <div className="p-2">
                <TeamRankings teamId={id} year={year} className="text-sm" />
              </div>
            </div>
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded">Game Log</h2>
              <div className="p-2">
                <TeamGameLog teamData={teamData} year={year} className="text-sm" />
              </div>
            </div>
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <div className="p-2">
                <HeadlineGrades percentileGrades={percentileGrades} className="text-sm" />
              </div>
            </div>
            <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
              <h2 className="flex items-center justify-center text-base bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 rounded">Key Performers</h2>
              <div className="p-2">
                <TeamTopPerformers teamData={teamData} year={year} className="text-sm" />
              </div>
            </div>
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
          <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
            <div
              className="flex items-center justify-center shadow-lg border-b border-[#235347] h-[80px] rounded px-6"
              style={{ background: `linear-gradient(to right, ${color}, white, ${alternateColor})` }}
            >
              {logo_main ? (
                <img src={logo_main} alt={`${school} logo`} className="w-16 h-16" onError={(e) => console.error(`Failed to load logo: ${logo_main}`)} />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center">
                  <span className="text-gray-500 text-base">No Logo</span>
                </div>
              )}
            </div>
          </div>
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
            </ul>
          </div>
          <div className="flex flex-row w-full gap-6" style={{ alignItems: 'flex-start', boxSizing: 'border-box' }}>
            <div className="flex flex-col gap-6" style={{ flexBasis: '30%', minWidth: '30%', boxSizing: 'border-box' }}>
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">{year} {teamData.conference} Standings</h2>
                <div className="p-0">
                  <TeamStandings teamData={teamData} year={year} currentTeamId={id} className="text-base" />
                </div>
              </div>
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Team Feed</h2>
                <div className="p-0">
                  <TeamFeed teamData={teamData} year={year} className="text-base" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-6" style={{ flexBasis: '49%', minWidth: '49%', boxSizing: 'border-box' }}>
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <MatchupProjection teamId={id} year={year} />
              </div>
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Game Log</h2>
                <div className="p-0">
                  <TeamGameLog teamData={teamData} year={year} className="text-base" />
                </div>
              </div>
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <div className="p-0">
                  <HeadlineGrades percentileGrades={percentileGrades} className="text-base" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-6" style={{ flexBasis: '18%', minWidth: '18%', boxSizing: 'border-box' }}>
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Key Performers</h2>
                <div className="p-0">
                  <TeamTopPerformers teamData={teamData} year={year} className="text-base" />
                </div>
              </div>
              <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
                <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Team Rankings</h2>
                <div className="p-0">
                  <TeamRankings teamId={id} year={year} className="text-base" />
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