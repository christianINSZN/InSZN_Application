import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';

const TeamRoster = () => {
  const { id, year = '2025' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [teamData, setTeamData] = useState(null);
  const [rosterData, setRosterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPlayerName, setFilterPlayerName] = useState('');
  const [filterPosition, setFilterPosition] = useState('');

  // Configurable headshot size (in pixels)
  const headshotSize = 48;

  // Helper function to convert height (inches) to feet-inches format
  const formatHeight = (inches) => {
    if (!inches) return 'N/A';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}-${remainingInches}`;
  };

  useEffect(() => {
    const fetchTeamAndRoster = async () => {
      try {
        setLoading(true);
        // Fetch team data
        const teamResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${id}/${year}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!teamResponse.ok) {
          const errorText = await teamResponse.text();
          throw new Error(`Failed to fetch team data: ${teamResponse.status} - ${errorText}`);
        }
        const teamData = await teamResponse.json();
        console.log('Team data received:', teamData);

        // Fetch roster data
        const rosterResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/teams_roster/${id}/${year}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!rosterResponse.ok) {
          const errorText = await rosterResponse.text();
          throw new Error(`Failed to fetch roster data: ${rosterResponse.status} - ${errorText}`);
        }
        const rosterData = await rosterResponse.json();
        console.log('Roster data received:', rosterData);

        setTeamData(teamData);
        setRosterData(rosterData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamAndRoster();
  }, [id, year]);

  const uniquePositions = useMemo(() => {
    return [...new Set(rosterData.map(player => player.position).filter(Boolean))].sort();
  }, [rosterData]);

  const filteredRosterData = useMemo(() => {
    return rosterData.filter(player => {
      const nameMatch = !filterPlayerName || player.name.toLowerCase().includes(filterPlayerName.toLowerCase());
      const positionMatch = !filterPosition || player.position === filterPosition;
      return nameMatch && positionMatch;
    });
  }, [rosterData, filterPlayerName, filterPosition]);

  const columnHelper = createColumnHelper();
  const columns = useMemo(() => [
    columnHelper.accessor('headshotURL', {
      id: 'Headshot',
      enableSorting: false,
      cell: ({ row }) => (
        row.original.headshotURL ? (
          <img
            src={row.original.headshotURL}
            alt={`${row.original.name} headshot`}
            className={`w-${headshotSize/3} h-${headshotSize/2} mr-2 inline-block`}
            onError={(e) => { e.target.src = 'https://a.espncdn.com/i/headshots/nophoto.png'; }}
          />
        ) : (
          <img
            src="https://a.espncdn.com/i/headshots/nophoto.png"
            alt="No headshot"
            className={`w-${headshotSize/3} h-${headshotSize/2} mr-2 inline-block`}
          />
        )
      ),
    }),
    columnHelper.accessor('name', {
      id: 'Player Name',
      enableSorting: true,
      cell: ({ row }) => (
        <Link
          to={`/players/${row.original.position.toLowerCase()}/${row.original.playerId}`}
          state={{ year }}
          className="text-[#235347] hover:text-[#235347]/30 underline underline-offset-2"
          onClick={(e) => {
            e.preventDefault();
            navigate(`/players/${row.original.position.toLowerCase()}/${row.original.playerId}`, { state: { year } });
          }}
        >
          {row.original.name || 'No Name'}
        </Link>
      ),
    }),
    columnHelper.accessor('jersey', {
      id: 'Jersey',
      enableSorting: true,
      cell: info => info.getValue() !== null ? info.getValue() : 'N/A',
    }),
    columnHelper.accessor('position', {
      id: 'Position',
      enableSorting: true,
      cell: info => info.getValue() || 'N/A',
    }),
    columnHelper.accessor('height', {
      id: 'Height',
      enableSorting: true,
      cell: info => formatHeight(info.getValue()),
    }),
    columnHelper.accessor('weight', {
      id: 'Weight',
      enableSorting: true,
      cell: info => info.getValue() !== null ? info.getValue() : 'N/A',
    }),
    columnHelper.accessor(row => `${row.homeCity}, ${row.homeState}`, {
      id: 'Hometown',
      enableSorting: true,
      cell: info => info.getValue() || 'N/A',
    }),
  ], [year, navigate, headshotSize]);

  const table = useReactTable({
    data: filteredRosterData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'Jersey', desc: false }],
    },
  });

  if (loading) return <div className="p-4 text-gray-500 text-xs">Loading roster...</div>;
  if (error) return <div className="p-4 text-red-500 text-xs">Error: {error}</div>;
  if (!teamData) return <div className="p-4 text-gray-500 text-xs">No team data available</div>;

  const { school, abbreviation, mascot, logo_main, color, alternateColor } = teamData;
  const isOverviewActive = location.pathname === `/teams/${id}/${year}`;
  const isRosterActive = location.pathname === `/teams/${id}/${year}/roster`;
  const isStatsActive = location.pathname === `/teams/${id}/${year}/stats`;
  const isScheduleActive = location.pathname === `/teams/${id}/${year}/schedule`;

  return (
    <div className="w-full p-0 shadow-xl rounded-lg">
      <div className="py-6" style={{ boxSizing: 'border-box' }}>
        {/* Header Container */}
        <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
          <div
            className="flex items-center justify-center shadow-lg border-b border-[#235347] h-[80px] rounded px-4"
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
                <span className="text-gray-500">No Logo</span>
              </div>
            )}
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
          </ul>
        </div>
        {/* Roster Content */}
        <div className="p-4 bg-gray-0 w-[80%] rounded-lg shadow-xl mx-auto">
          <div className="p-0">
            <header className="mb-4 flex flex-wrap gap-4 items-end bg-gray-200 p-2 rounded-lg shadow-xl">
              <div className="w-full md:w-auto flex-1">
                <label htmlFor="playerNameFilter" className="block text-sm font-medium text-gray-700">
                  Filter by Player Name
                </label>
                <input
                  id="playerNameFilter"
                  value={filterPlayerName}
                  onChange={(e) => setFilterPlayerName(e.target.value)}
                  className="w-full p-2 border rounded text-xs"
                  placeholder="Type to filter..."
                />
              </div>
              <div className="w-full md:w-auto flex-1">
                <label htmlFor="positionFilter" className="block text-sm font-medium text-gray-700">
                  Filter by Position
                </label>
                <select
                  id="positionFilter"
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="w-full p-2 border rounded text-xs"
                >
                  <option value="">All Positions</option>
                  {uniquePositions.map((pos, index) => (
                    <option key={index} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </header>
            <h3 className="text-md font-semibold mb-2 bg-[#235347] text-white p-2 rounded-t">Team Roster</h3>
            <div className="h-full overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(column => (
                        <th
                          key={column.id}
                          className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800 cursor-pointer"
                          style={{ textAlign: column.id === 'Headshot' || column.id === 'Player Name' || column.id === 'Hometown' ? 'left' : 'center', verticalAlign: 'middle', lineHeight: '1.2' }}
                          onClick={() => {
                            if (column.id !== 'Headshot') {
                              const sorting = table.getState().sorting;
                              const currentSort = sorting.find(s => s.id === column.id);
                              table.setSorting([{ id: column.id, desc: !currentSort?.desc }]);
                            }
                          }}
                        >
                          {column.id}
                          {table.getState().sorting.find(s => s.id === column.id) && (
                            table.getState().sorting.find(s => s.id === column.id).desc ? ' ▼' : ' ▲'
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row, index) => (
                    <tr key={row.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-gray-200'}>
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className="p-1 text-sm text-left border-b border-gray-300"
                          style={{ textAlign: cell.column.id === 'Headshot' || cell.column.id === 'Player Name' || cell.column.id === 'Hometown' ? 'left' : 'center', verticalAlign: 'middle', lineHeight: '1.2' }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamRoster;