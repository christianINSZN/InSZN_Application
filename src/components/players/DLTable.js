import React, { useMemo, useState, memo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

const TEAM_TO_CONFERENCE = {
  alabama: "SEC", arkansas: "SEC", auburn: "SEC", florida: "SEC", georgia: "SEC",
  kentucky: "SEC", lsu: "SEC", 'ole miss': "SEC", 'mississippi state': "SEC",
  missouri: "SEC", 'south carolina': "SEC", tennessee: "SEC", texas: "SEC",
  'texas a&m': "SEC", vanderbilt: "SEC", oklahoma: "SEC",
  michigan: "Big Ten", 'ohio state': "Big Ten", 'penn state': "Big Ten", oregon: "Big Ten",
  washington: "Big Ten", usc: "Big Ten", ucla: "Big Ten", wisconsin: "Big Ten",
  iowa: "Big Ten", nebraska: "Big Ten", minnesota: "Big Ten", illinois: "Big Ten",
  northwestern: "Big Ten", purdue: "Big Ten", indiana: "Big Ten", 'michigan state': "Big Ten",
  rutgers: "Big Ten", maryland: "Big Ten",
  clemson: "ACC", 'florida state': "ACC", miami: "ACC", 'north carolina': "ACC",
  'virginia tech': "ACC", louisville: "ACC", 'nc state': "ACC", pittsburgh: "ACC",
  smu: "ACC", stanford: "ACC", california: "ACC", syracuse: "ACC", 'georgia tech': "ACC",
  virginia: "ACC", 'wake forest': "ACC", 'boston college': "ACC", duke: "ACC",
  baylor: "Big 12", tcu: "Big 12", 'texas tech': "Big 12", 'oklahoma state': "Big 12",
  'kansas state': "Big 12", kansas: "Big 12", 'iowa state': "Big 12", 'west virginia': "Big 12",
  houston: "Big 12", ucf: "Big 12", cincinnati: "Big 12", byu: "Big 12", utah: "Big 12",
  'arizona state': "Big 12", arizona: "Big 12", colorado: "Big 12",
  'notre dame': "FBS Independents", uconn: "FBS Independents", umass: "FBS Independents",
  'boise state': "Mountain West", 'san diego state': "Mountain West", 'fresno state': "Mountain West",
  unlv: "Mountain West", 'colorado state': "Mountain West", 'air force': "Mountain West",
  wyoming: "Mountain West", 'utah state': "Mountain West", 'san josé state': "Mountain West",
  nevada: "Mountain West", 'new mexico': "Mountain West", hawaii: "Mountain West",
  memphis: "American Athletic", tulane: "American Athletic", 'south florida': "American Athletic",
  'east carolina': "American Athletic", tulsa: "American Athletic", navy: "American Athletic",
  charlotte: "American Athletic", rice: "American Athletic", 'north texas': "American Athletic",
  utsa: "American Athletic", 'florida atlantic': "American Athletic", temple: "American Athletic",
  uab: "American Athletic", army: "American Athletic",
  'app state': "Sun Belt", 'georgia southern': "Sun Belt", 'james madison': "Sun Belt",
  marshall: "Sun Belt", 'coastal carolina': "Sun Belt", 'old dominion': "Sun Belt",
  'texas state': "Sun Belt", 'south alabama': "Sun Belt", troy: "Sun Belt",
  'ul monroe': "Sun Belt", louisiana: "Sun Belt", 'arkansas state': "Sun Belt",
  'southern miss': "Sun Belt",
  liberty: "Conference USA", 'western kentucky': "Conference USA", 'middle tennessee': "Conference USA",
  'louisiana tech': "Conference USA", 'sam houston': "Conference USA", fiu: "Conference USA",
  utep: "Conference USA", 'new mexico state': "Conference USA", 'jacksonville state': "Conference USA",
  'kennesaw state': "Conference USA",
  toledo: "Mid-American", 'northern illinois': "Mid-American", ohio: "Mid-American",
  'miami (oh)': "Mid-American", 'western michigan': "Mid-American", 'central michigan': "Mid-American",
  'eastern michigan': "Mid-American", 'bowling green': "Mid-American", 'ball state': "Mid-American",
  akron: "Mid-American", 'kent state': "Mid-American", buffalo: "Mid-American",
  'oregon state': "Pac-12", 'washington state': "Pac-12",  'delaware': "Conference USA",
  'missouri state': "Conference USA",
};


const DLTable = ({ data, navigate, filterGamesPlayed, filterPlayerName, filterTeamName, filterConference, year }) => {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [showDLRzTooltip, setShowDLRzTooltip] = useState(false);

  const columnHelper = createColumnHelper();

  const gColumns = useMemo(() => [
    columnHelper.accessor('name', {
      id: 'Player Name',
      enableSorting: true,
      cell: ({ row }) => {
        const toPath = `/players/dl/${row.original.playerId}`;
        return (
          <Link
            to={toPath}
            className="text-black hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
            style={{ display: 'inline-block' }}
            onClick={(e) => {
              e.preventDefault();
              console.log('Navigating to:', toPath);
              navigate(toPath, { state: { year } });
            }}
          >
            {row.original.name || 'No Name'}
          </Link>
        );
      },
    }),
    columnHelper.accessor('school', {
      id: 'School',
      enableSorting: true,
      meta: { mobileHidden: true },
      cell: ({ row }) => {
        const school = row.original.school || 'N/A';
        const teamId = row.original.teamID;
        const linkYear = year || row.original.year;
        return teamId ? (
          <Link
            to={`/teams/${teamId}/${linkYear}`}
            className="text-black hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
            style={{ display: 'inline-block' }}
          >
            {school.charAt(0).toUpperCase() + school.slice(1)}
          </Link>
        ) : (
          school.charAt(0).toUpperCase() + school.slice(1)
        );
      },
    }),
    columnHelper.accessor('player_game_count', {
      id: 'GP',
      enableSorting: true,
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('snap_counts_defense', {
      id: 'Snaps',
      enableSorting: true,
      meta: { mobileHidden: false },
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('hurries', {
      id: 'HUR',
      enableSorting: true,
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('total_pressures', {
      id: 'PRS',
      enableSorting: true,
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('hits', {
      id: 'HIT',
      enableSorting: true,
      meta: { mobileHidden: true },
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('sacks', {
      id: 'SACK',
      enableSorting: true,
      meta: { mobileHidden: true },
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('stops', {
      id: 'STOP',
      enableSorting: true,
      meta: { mobileHidden: false },
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('tackles_for_loss', {
      id: 'TFL',
      enableSorting: true,
      meta: { mobileHidden: true },
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('DLR', {
      id: 'DLRz',
      enableSorting: true,
      sortDescFirst: true,
      cell: info => {
        const value = info.getValue();
        return value !== null ? value.toFixed(1) : 'N/A';
      },
    }),
  ], [navigate, year]);

  const gTableData = useMemo(() => {
    return data.filter(player => {
      const gamesPlayed = player.player_game_count || 0;
      const nameMatch = !filterPlayerName || player.name.toLowerCase().includes(filterPlayerName.toLowerCase());
      const teamMatch = !filterTeamName ||
        (player.team && player.team.toLowerCase().includes(filterTeamName.toLowerCase())) ||
        (player.school && player.school.toLowerCase().includes(filterTeamName.toLowerCase()));
      
      // ← ADD THIS LINE
      const conferenceMatch = !filterConference || 
        TEAM_TO_CONFERENCE[player.team?.toLowerCase()] === filterConference;
  
      const yearMatch = String(player.year) === String(year);
  
      return (
        (player.position === 'DL' || player.position === 'DT' || player.position === 'DE') &&
        gamesPlayed >= filterGamesPlayed &&
        nameMatch &&
        teamMatch &&
        conferenceMatch &&   // ← AND THIS
        yearMatch
      );
    });
  }, [data, filterGamesPlayed, filterPlayerName, filterTeamName, filterConference, year]); // ← added filterConference

  const gTableInstance = useReactTable({
    data: gTableData,
    columns: gColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'DLRz', desc: true }],
    },
  });

  return (
    <div className="p-0 sm:p-0 shadow-xl rounded-lg relative">
      <h2 className="flex items-center justify-center text-md sm:text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-auto rounded-t-lg">
        Defensive Line
      </h2>
      <div className="flex justify-center p-2 sm:hidden">
        <button
          className="bg-[#235347] text-white text-sm font-medium py-2 px-4 rounded hover:bg-[#1c3f33]"
          onClick={() => setShowAllColumns(!showAllColumns)}
        >
          {showAllColumns ? 'Basic Stats' : 'Advanced Stats'}
        </button>
      </div>
      <div className="h-[300px] sm:h-[362px] overflow-y-auto">
        <table className="w-full text-center border-collapse">
          <thead className="sticky top-0 bg-white z-0">
            {gTableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-gray-0">
                {headerGroup.headers.map(column => (
                  <th
                    key={column.id}
                    className={`p-2 sm:p-3 text-[10px] sm:text-xs font-semibold border-b border-[#235347] text-black cursor-pointer ${
                      column.column.columnDef.meta?.mobileHidden && !showAllColumns ? 'hidden sm:table-cell' : ''
                    }`}
                    style={{
                      textAlign: column.id === 'Player Name' || column.id === 'School' ? 'left' : 'center',
                      verticalAlign: 'middle',
                      lineHeight: '1.1',
                    }}
                    onClick={() => {
                      const sorting = gTableInstance.getState().sorting;
                      const currentSort = sorting.find(s => s.id === column.id);
                      gTableInstance.setSorting([
                        {
                          id: column.id,
                          desc: !currentSort?.desc,
                        },
                      ]);
                    }}
                  >
                    <div className="flex items-center justify-center">
                      {column.id}
                      {column.id === 'DLRz' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDLRzTooltip(true);
                          }}
                          className="w-3 h-3 bg-[#235347] text-white text-xs rounded-full flex items-center justify-center hover:bg-black ml-1"
                          title="What is DLRz?"
                        >
                          ?
                        </button>
                      )}
                      {gTableInstance.getState().sorting.find(s => s.id === column.id) && (
                        <span className="ml-1">
                          {gTableInstance.getState().sorting.find(s => s.id === column.id).desc ? ' ▼' : ' ▲'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {gTableInstance.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={index % 2 === 0 ? 'bg-gray-0' : 'bg-[#235347]/20'}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={`p-0.5 sm:p-1 text-[10px] sm:text-xs text-black border-b border-gray-300 ${
                      cell.column.columnDef.meta?.mobileHidden && !showAllColumns ? 'hidden sm:table-cell' : ''
                    } ${showAllColumns ? 'min-w-[100px]' : ''}`}
                    style={{
                      textAlign: cell.column.id === 'Player Name' || cell.column.id === 'School' ? 'left' : 'center',
                      verticalAlign: 'middle',
                      lineHeight: '1.2',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DLRz Tooltip Popup */}
      {showDLRzTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowDLRzTooltip(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#235347]">What is DLRz?</h3>
              <button
                onClick={() => setShowDLRzTooltip(false)}
                className="text-gray-500 hover:text-black text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-gray-700 space-y-4">
              <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                <strong className="text-blue-900 block mb-1">DLRz (Defensive Line Rating)</strong>
                <p className="text-blue-800">A 0-100 score measuring <strong>pass rush dominance per game</strong>, comparable across seasons using <strong>z-score calculations</strong>.</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-[#235347] mb-2">How It's Calculated</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-green-800"><span>+ Skill</span><span>PFF Pass Rush Grade</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Efficiency</span><span>Pass Rush Win Rate</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Play Impact</span><span>Hurries/Pressures/Hits/Sacks</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Negative Plays</span><span>TFLs/game</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Run Defense</span><span>Stop Rate</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Volume</span><span>Pass Rush Snaps/game</span></div>
                  <div className="flex justify-between text-red-600"><span>- Broken Plays</span><span>Missed Tackle Rate</span></div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-[#235347] mb-2">Rating Guide</h4>
                <div className="space-y-1">
                  <div className="flex justify-between"><span>• 90-100: All-NCAA</span></div>
                  <div className="flex justify-between"><span>• 75-89: Elite</span></div>
                  <div className="flex justify-between"><span>• 50-74: Key Player</span></div>
                  <div className="flex justify-between"><span>• Below 50: Role Player</span></div>
                  <div className="flex justify-between"><span>• N/A: Insufficient Snaps</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(DLTable);