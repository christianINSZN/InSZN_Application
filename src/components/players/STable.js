import React, { useMemo, memo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

const STable = ({ data, navigate, filterGamesPlayed, filterPlayerName, filterTeamName, year }) => {
  const columnHelper = createColumnHelper();
  const sColumns = useMemo(() => [
    columnHelper.accessor('name', {
      id: 'Player Name',
      enableSorting: true,
      cell: ({ row }) => {
        const toPath = `/players/s/${row.original.playerId}`;
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
      id: 'Team',
      enableSorting: true,
      cell: ({ row }) => {
        const team = row.original.school || 'N/A';
        const teamId = row.original.teamID;
        const linkYear = year || row.original.year;
        return teamId ? (
          <Link
            to={`/teams/${teamId}/${linkYear}`}
            className="text-black hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
            style={{ display: 'inline-block' }}
          >
            {team.charAt(0).toUpperCase() + team.slice(1)}
          </Link>
        ) : (
          team.charAt(0).toUpperCase() + team.slice(1)
        );
      },
    }),
    columnHelper.accessor('grades_defense', {
      id: 'Defense Grade',
      enableSorting: true,
      sortDescFirst: true,
      cell: info => (info.getValue() !== null ? info.getValue().toFixed(1) : 'N/A'),
    }),
  ], [navigate, year]);

  const sTableData = useMemo(() => {
    return data.filter(player =>
      player.position === 'S' &&
      (player.player_game_count || 0) > filterGamesPlayed &&
      (!filterPlayerName || player.name.toLowerCase().includes(filterPlayerName.toLowerCase())) &&
      (!filterTeamName || (player.team && player.team.toLowerCase().includes(filterTeamName.toLowerCase())))
    );
  }, [data, filterGamesPlayed, filterPlayerName, filterTeamName]);

  const sTableInstance = useReactTable({
    data: sTableData,
    columns: sColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'Defense Grade', desc: true }],
    },
  });

  return (
    <div className="p-0 shadow-xl rounded-lg">
      <h2 className="flex items-center justify-center text-md sm:text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-auto rounded-t-lg">Safeties</h2>
      <div className="relative">
        <div className="h-[362px] overflow-y-auto filter blur-xs opacity-80" style={{ pointerEvents: 'none' }}>
          <table className="w-full text-center border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              {sTableInstance.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="bg-gray-0">
                  {headerGroup.headers.map(column => (
                    <th
                      key={column.id}
                      className="p-3 text-xs font-semibold border-b border-[#235347] text-black"
                      style={{
                        textAlign: column.id === 'Player Name' || column.id === 'Team' ? 'left' : 'center',
                        verticalAlign: 'middle',
                        lineHeight: '1.1',
                      }}
                    >
                      {column.id}
                      {sTableInstance.getState().sorting.find(s => s.id === column.id) && (
                        sTableInstance.getState().sorting.find(s => s.id === column.id).desc ? ' ▼' : ' ▲'
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {sTableInstance.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={index % 2 === 0 ? 'bg-gray-0' : 'bg-[#235347]/20'}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="p-1 text-xs text-black border-b border-gray-300"
                      style={{
                        textAlign: cell.column.id === 'Player Name' || cell.column.id === 'Team' ? 'left' : 'center',
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
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-filter backdrop-blur-md rounded-lg">
          <div className="p-6 bg-white rounded-lg shadow-lg text-center">
            <p className="text-gray-500 mb-4">Safety Player Profiles Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(STable);