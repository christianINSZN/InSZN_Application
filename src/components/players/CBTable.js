// In src/components/players/CBTable.js
import React, { useMemo, memo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

const CBTable = ({ data, navigate, filterGamesPlayed, filterPlayerName, filterTeamName, year }) => {
  const columnHelper = createColumnHelper();
  const cbColumns = useMemo(() => [
    columnHelper.accessor('name', {
      id: 'Name',
      enableSorting: true,
      cell: ({ row }) => {
        const toPath = `/players/cb/${row.original.playerId}`;
        return (
          <Link
            to={toPath}
            className="text-gray-700 hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
            style={{ display: 'inline-block' }}
            onClick={(e) => {
              e.preventDefault();
              console.log('Navigating to:', toPath);
              navigate(toPath);
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
            className="text-gray-700 hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
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
      cell: info => {
        console.log('Grade Defense Value for CB:', info.getValue());
        return info.getValue() !== null ? info.getValue() : 'N/A';
      },
    }),
  ], [navigate, year]);

  const cbTableData = useMemo(() => {
    return data.filter(player =>
      player.position === 'CB' &&
      (player.player_game_count || 0) > filterGamesPlayed &&
      (!filterPlayerName || player.name.toLowerCase().includes(filterPlayerName.toLowerCase())) &&
      (!filterTeamName || (player.team && player.team.toLowerCase().includes(filterTeamName.toLowerCase())))
    );
  }, [data, filterGamesPlayed, filterPlayerName, filterTeamName]);

  const cbTableInstance = useReactTable({
    data: cbTableData,
    columns: cbColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'Defense Grade', desc: true }],
    },
  });

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Cornerbacks</h2>
      <div className="h-80 overflow-auto relative">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-gray-300 z-10">
            {cbTableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-gray-300">
                {headerGroup.headers.map(column => (
                  <th
                    key={column.id}
                    className="p-1 text-xs font-semibold border-b border-gray-400 text-gray-800 cursor-pointer"
                    style={{ textAlign: 'left', lineHeight: '1.2' }}
                    onClick={() => {
                      const sorting = cbTableInstance.getState().sorting;
                      const currentSort = sorting.find(s => s.id === column.id);
                      cbTableInstance.setSorting([
                        {
                          id: column.id,
                          desc: !currentSort?.desc,
                        },
                      ]);
                    }}
                  >
                    {column.id}
                    {cbTableInstance.getState().sorting.find(s => s.id === column.id) && (
                      cbTableInstance.getState().sorting.find(s => s.id === column.id).desc ? ' ▼' : ' ▲'
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {cbTableInstance.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={index % 2 === 0 ? 'bg-gray-50' : 'bg-gray-200'}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="p-1 text-xs text-left border-b border-gray-300"
                    style={{ verticalAlign: 'middle', lineHeight: '1.2' }}
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
  );
};

export default memo(CBTable);