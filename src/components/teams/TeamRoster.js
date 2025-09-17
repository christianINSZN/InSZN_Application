import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import TeamHeader from './teams_components/TeamHeader';

const TeamRoster = () => {
  const { id, year = '2025' } = useParams();
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState(null);
  const [rosterData, setRosterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPlayerName, setFilterPlayerName] = useState('');
  const [filterPosition, setFilterPosition] = useState('');

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
    columnHelper.accessor('name', {
      id: 'Player Name',
      enableSorting: true,
      cell: ({ row }) => (
        <Link
          to={`/players/${row.original.position.toLowerCase()}/${row.original.playerId}`}
          state={{ year }}
          className="text-blue-500 hover:text-blue-700 underline underline-offset-2"
          onClick={(e) => {
            e.preventDefault();
            navigate(`/players/${row.original.position.toLowerCase()}/${row.original.playerId}`, { state: { year } });
          }}
        >
          {row.original.name || 'No Name'}
        </Link>
      ),
    }),
    columnHelper.accessor('position', {
      id: 'Position',
      enableSorting: true,
      cell: info => info.getValue() || 'N/A',
    }),
    columnHelper.accessor('player_game_count', {
      id: 'GP',
      enableSorting: true,
      cell: info => info.getValue() !== null ? info.getValue() : 'N/A',
    }),
    columnHelper.accessor('yards', {
      id: 'Yards',
      enableSorting: true,
      cell: info => info.getValue() !== null ? info.getValue() : 'N/A',
    }),
    columnHelper.accessor('touchdowns', {
      id: 'TDs',
      enableSorting: true,
      cell: info => info.getValue() !== null ? info.getValue() : 'N/A',
    }),
    columnHelper.accessor('grades_pass', {
      id: 'Pass Grade',
      enableSorting: true,
      cell: info => info.getValue() !== null ? info.getValue().toFixed(1) : 'N/A',
    }),
    columnHelper.accessor('grades_run', {
      id: 'Run Grade',
      enableSorting: true,
      cell: info => info.getValue() !== null ? info.getValue().toFixed(1) : 'N/A',
    }),
    columnHelper.accessor('grades_pass_route', {
      id: 'Pass Route Grade',
      enableSorting: true,
      cell: info => info.getValue() !== null ? info.getValue().toFixed(1) : 'N/A',
    }),
  ], [year, navigate]);

  const table = useReactTable({
    data: filteredRosterData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'Yards', desc: true }],
    },
  });

  if (loading) return <div className="p-4 text-gray-500 text-xs">Loading roster...</div>;
  if (error) return <div className="p-4 text-red-500 text-xs">Error: {error}</div>;
  if (!teamData) return <div className="p-4 text-gray-500 text-xs">No team data available</div>;

  return (
    <div className="p-0 bg-gray-0 rounded-lg shadow-xl">
      <TeamHeader teamData={teamData} year={year} activeTab="roster" />
      <div className="p-4">
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
        <div className="h-[362px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(column => (
                    <th
                      key={column.id}
                      className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800 cursor-pointer"
                      style={{ textAlign: column.id === 'Player Name' ? 'left' : 'center', verticalAlign: 'middle', lineHeight: '1.2' }}
                      onClick={() => {
                        const sorting = table.getState().sorting;
                        const currentSort = sorting.find(s => s.id === column.id);
                        table.setSorting([{ id: column.id, desc: !currentSort?.desc }]);
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
                      className="p-1 text-xs text-left border-b border-gray-300"
                      style={{ textAlign: cell.column.id === 'Player Name' ? 'left' : 'center', verticalAlign: 'middle', lineHeight: '1.2' }}
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
  );
};

export default TeamRoster;