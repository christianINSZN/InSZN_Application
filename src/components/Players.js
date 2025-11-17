import React, { useEffect, useMemo, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import QbTable from './players/QbTable';
import RbTable from './players/RbTable';
import WrTable from './players/WrTable';
import TeTable from './players/TeTable';
import CTable from './players/CTable';
import GTable from './players/GTable';
import TTable from './players/TTable';
import LBETable from './players/LBETable';
import DLTable from './players/DLTable';
import CBTable from './players/CBTable';
import STable from './players/STable';
import DBTable from './players/DBTable';

const TEAM_TO_CONFERENCE = {
  // Full lowercase names only — matches your API exactly
  alabama: "SEC",
  arkansas: "SEC",
  auburn: "SEC",
  florida: "SEC",
  georgia: "SEC",
  kentucky: "SEC",
  lsu: "SEC",
  'ole miss': "SEC",
  'mississippi state': "SEC",
  missouri: "SEC",
  'south carolina': "SEC",
  tennessee: "SEC",
  texas: "SEC",
  'texas a&m': "SEC",
  vanderbilt: "SEC",
  oklahoma: "SEC",

  michigan: "Big Ten",
  'ohio state': "Big Ten",
  'penn state': "Big Ten",
  oregon: "Big Ten",
  washington: "Big Ten",
  usc: "Big Ten",
  ucla: "Big Ten",
  wisconsin: "Big Ten",
  iowa: "Big Ten",
  nebraska: "Big Ten",
  minnesota: "Big Ten",
  illinois: "Big Ten",
  northwestern: "Big Ten",
  purdue: "Big Ten",
  indiana: "Big Ten",
  'michigan state': "Big Ten",
  rutgers: "Big Ten",
  maryland: "Big Ten",

  clemson: "ACC",
  'florida state': "ACC",
  miami: "ACC",
  'north carolina': "ACC",
  'virginia tech': "ACC",
  louisville: "ACC",
  'nc state': "ACC",
  pittsburgh: "ACC",
  smu: "ACC",
  stanford: "ACC",
  california: "ACC",
  syracuse: "ACC",
  'georgia tech': "ACC",
  virginia: "ACC",
  'wake forest': "ACC",
  'boston college': "ACC",
  duke: "ACC",

  baylor: "Big 12",
  tcu: "Big 12",
  'texas tech': "Big 12",
  'oklahoma state': "Big 12",
  'kansas state': "Big 12",
  kansas: "Big 12",
  'iowa state': "Big 12",
  'west virginia': "Big 12",
  houston: "Big 12",
  ucf: "Big 12",
  cincinnati: "Big 12",
  byu: "Big 12",
  utah: "Big 12",
  'arizona state': "Big 12",
  arizona: "Big 12",
  colorado: "Big 12",

  'notre dame': "FBS Independents",
  uconn: "FBS Independents",
  umass: "FBS Independents",

  'boise state': "Mountain West",
  'san diego state': "Mountain West",
  'fresno state': "Mountain West",
  unlv: "Mountain West",
  'colorado state': "Mountain West",
  'air force': "Mountain West",
  wyoming: "Mountain West",
  'utah state': "Mountain West",
  'san josé state': "Mountain West",
  nevada: "Mountain West",
  'new mexico': "Mountain West",
  hawaii: "Mountain West",

  memphis: "American Athletic",
  tulane: "American Athletic",
  'south florida': "American Athletic",
  'east carolina': "American Athletic",
  tulsa: "American Athletic",
  navy: "American Athletic",
  charlotte: "American Athletic",
  rice: "American Athletic",
  'north texas': "American Athletic",
  utsa: "American Athletic",
  'florida atlantic': "American Athletic",
  temple: "American Athletic",
  uab: "American Athletic",
  army: "American Athletic",

  'app state': "Sun Belt",
  'georgia southern': "Sun Belt",
  'james madison': "Sun Belt",
  marshall: "Sun Belt",
  'coastal carolina': "Sun Belt",
  'old dominion': "Sun Belt",
  'texas state': "Sun Belt",
  'south alabama': "Sun Belt",
  troy: "Sun Belt",
  'ul monroe': "Sun Belt",
  louisiana: "Sun Belt",
  'arkansas state': "Sun Belt",
  'southern miss': "Sun Belt",

  liberty: "Conference USA",
  'western kentucky': "Conference USA",
  'middle tennessee': "Conference USA",
  'louisiana tech': "Conference USA",
  'sam houston': "Conference USA",
  fiu: "Conference USA",
  utep: "Conference USA",
  'new mexico state': "Conference USA",
  'jacksonville state': "Conference USA",
  'kennesaw state': "Conference USA",
  'delaware': "Conference USA",
  'missouri state': "Conference USA",

  toledo: "Mid-American",
  'northern illinois': "Mid-American",
  ohio: "Mid-American",
  'miami (oh)': "Mid-American",
  'western michigan': "Mid-American",
  'central michigan': "Mid-American",
  'eastern michigan': "Mid-American",
  'bowling green': "Mid-American",
  'ball state': "Mid-American",
  akron: "Mid-American",
  'kent state': "Mid-American",
  buffalo: "Mid-American",

  'oregon state': "Pac-12",
  'washington state': "Pac-12",
};

function PlayersComponent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [playersData, setPlayersData] = useState([]);
  const [filterGamesPlayed, setFilterGamesPlayed] = useState(0);
  const [filterPlayerName, setFilterPlayerName] = useState('');
  const [filterTeamName, setFilterTeamName] = useState('');
  const [filterConference, setFilterConference] = useState('');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [activeCategory, setActiveCategory] = useState('All Positions');

  const maxGamesPlayed = useMemo(() => {
    return Math.max(...playersData.map(p => p.player_game_count || 0), 15);
  }, [playersData]);

  const uniquePlayerNames = useMemo(() => 
    [...new Set(playersData.map(p => p.name).filter(Boolean))].sort(),
    [playersData]
  );

  const uniqueTeamNames = useMemo(() => 
    [...new Set(playersData.map(p => p.team).filter(Boolean))].sort(),
    [playersData]
  );

  const uniqueConferences = useMemo(() => {
    const confs = new Set();
    playersData.forEach(p => {
      const conf = TEAM_TO_CONFERENCE[p.team.toLowerCase()];
      if (conf) confs.add(conf);
    });
    return Array.from(confs).sort();
  }, [playersData]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setPlayersData([]);
    fetch(`${process.env.REACT_APP_API_URL}/api/playerdashboard/${selectedYear}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(response => {
        console.log('API response status:', response.status, response.statusText);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then(text => {
        if (isMounted) {
          try {
            const data = JSON.parse(text);
            const validData = Array.isArray(data)
              ? data.filter(p => p && typeof p === 'object' && p.position && p.name && p.team)
              : [];
            setPlayersData(validData);
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
    return () => { isMounted = false; };
  }, [selectedYear]);

  if (isLoading) return <div className="p-2 sm:p-4"><p className="text-gray-500 text-xs sm:text-base">Loading players...</p></div>;
  if (playersData.length === 0) return <div className="p-2 sm:p-4"><p className="text-gray-500 text-xs sm:text-base">No players data available for {selectedYear}.</p></div>;

  return (
    <div className="bg-gray-100 w-full min-h-0 h-auto mt-0 sm:mt-12 p-2">
      <header className="mb-6 mt-3 flex flex-wrap gap-4 items-end bg-gray-200 p-2 rounded-lg shadow-xl">
        <div className="w-full sm:w-auto sm:flex-1 mb-4">
          <label htmlFor="gamesPlayedFilter" className="block text-sm font-medium text-gray-700">
            Min. Games: {filterGamesPlayed}
          </label>
          <input
            type="range"
            id="gamesPlayedFilter"
            min="0"
            max={maxGamesPlayed}
            value={filterGamesPlayed}
            onChange={(e) => setFilterGamesPlayed(parseInt(e.target.value))}
            className="w-full mt-2 h-4 bg-gray-0 rounded-lg appearance-none cursor-pointer accent-[#235347]"
            style={{ accentColor: '[#235347]' }}
          />
        </div>

        <div className="w-full sm:w-auto sm:flex-1">
          <label htmlFor="playerNameFilter" className="block text-sm font-medium text-gray-700">
            Filter by Player Name
          </label>
          <input
            list="playerNames"
            id="playerNameFilter"
            value={filterPlayerName}
            onChange={(e) => setFilterPlayerName(e.target.value)}
            className="w-full p-2 border rounded text-sm"
            placeholder="Type or scroll to select..."
          />
          <datalist id="playerNames">
            {uniquePlayerNames.map((name, i) => <option key={i} value={name} />)}
          </datalist>
        </div>

        <div className="w-full sm:w-auto sm:flex-1">
          <label htmlFor="teamNameFilter" className="block text-sm font-medium text-gray-700">
            Filter by Team Name
          </label>
          <input
            list="teamNames"
            id="teamNameFilter"
            value={filterTeamName}
            onChange={(e) => setFilterTeamName(e.target.value)}
            className="w-full p-2 border rounded text-sm"
            placeholder="Type or scroll to select..."
          />
          <datalist id="teamNames">
            {uniqueTeamNames.map((team, i) => <option key={i} value={team} />)}
          </datalist>
        </div>

        {/* Conference Filter */}
        <div className="w-full sm:w-auto sm:flex-1">
          <label htmlFor="conferenceFilter" className="block text-sm font-medium text-gray-700">
            Filter by Conference
          </label>
          <select
            id="conferenceFilter"
            value={filterConference}
            onChange={(e) => setFilterConference(e.target.value)}
            className="w-full p-2 border rounded text-sm bg-white"
          >
            <option value="">All Conferences</option>
            {uniqueConferences.map((conf) => (
              <option key={conf} value={conf}>
                {conf}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto sm:flex-1">
          <label htmlFor="yearFilter" className="block text-sm font-medium text-gray-700">
            Filter by Year
          </label>
          <select
            id="yearFilter"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full p-2 border rounded text-sm"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </header>

      <div className="border-b border-[#235347] mb-4 overflow-x-auto">
        <ul className="flex sm:flex gap-2 sm:gap-4 sm:justify-center p-2 sm:p-4">
          <li><button className={`text-gray-700 hover:text-[#235347] pb-2 border-b-2 text-xs sm:text-sm ${activeCategory === 'All Positions' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`} onClick={() => setActiveCategory('All Positions')}>All Positions</button></li>
          <li><button className={`text-gray-700 hover:text-[#235347] pb-2 border-b-2 text-xs sm:text-sm ${activeCategory === 'Skill Positions' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`} onClick={() => setActiveCategory('Skill Positions')}>Offensive Skill Positions</button></li>
          <li><button className={`text-gray-700 hover:text-[#235347] pb-2 border-b-2 text-xs sm:text-sm ${activeCategory === 'Offensive Line' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`} onClick={() => setActiveCategory('Offensive Line')}>Offensive Line</button></li>
          <li><button className={`text-gray-700 hover:text-[#235347] pb-2 border-b-2 text-xs sm:text-sm ${activeCategory === 'Defensive Line' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`} onClick={() => setActiveCategory('Defensive Line')}>Defensive Line</button></li>
          <li><button className={`text-gray-700 hover:text-[#235347] pb-2 border-b-2 text-xs sm:text-sm ${activeCategory === 'Linebackers' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`} onClick={() => setActiveCategory('Linebackers')}>Linebackers / Edge</button></li>
          <li><button className={`text-gray-700 hover:text-[#235347] pb-2 border-b-2 text-xs sm:text-sm ${activeCategory === 'Secondary' ? 'border-[#235347]' : 'border-transparent hover:border-[#235347]'}`} onClick={() => setActiveCategory('Secondary')}>Defensive Secondary</button></li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
        {activeCategory === 'All Positions' && (
          <>
            <QbTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <RbTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <WrTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <TeTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <CTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <GTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <TTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <DLTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <LBETable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <CBTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <STable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <DBTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
          </>
        )}
        {activeCategory === 'Skill Positions' && (
          <>
            <QbTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <RbTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <WrTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <TeTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
          </>
        )}
        {activeCategory === 'Offensive Line' && (
          <>
            <CTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <GTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            {activeCategory !== 'All Positions' && (
              <div className="col-span-1 md:col-span-2 justify-self-center">
                <TTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
              </div>
            )}
          </>
        )}
        {activeCategory === 'Defensive Line' && activeCategory !== 'All Positions' && (
          <div className="col-span-1 md:col-span-2 justify-self-center">
            <DLTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
          </div>
        )}
        {activeCategory === 'Linebackers' && activeCategory !== 'All Positions' && (
          <div className="col-span-1 md:col-span-2 justify-self-center">
            <LBETable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
          </div>
        )}
        {activeCategory === 'Secondary' && (
          <>
            <CBTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            <STable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
            {activeCategory !== 'All Positions' && (
              <div className="col-span-1 md:col-span-2 justify-self-center">
                <DBTable data={playersData} navigate={navigate} filterGamesPlayed={filterGamesPlayed} filterPlayerName={filterPlayerName} filterTeamName={filterTeamName} filterConference={filterConference} year={selectedYear} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default memo(PlayersComponent);