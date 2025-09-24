import React, { useMemo, useState, memo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

const WrTable = ({ data, navigate, filterGamesPlayed, filterPlayerName, filterTeamName, year }) => {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const columnHelper = createColumnHelper();
  const wrColumns = useMemo(() => [
    columnHelper.accessor('name', {
      id: 'Player Name',
      enableSorting: true,
      cell: ({ row }) => {
        const toPath = `/players/wr/${row.original.playerId}`;
        return (
          <Link
            to={toPath}
            className="text-black hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
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
    columnHelper.accessor('yards', {
      id: 'YDS',
      enableSorting: true,
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('touchdowns', {
      id: 'TDs',
      enableSorting: true,
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('yards_per_reception', {
      id: 'YPC',
      enableSorting: true,
      meta: { mobileHidden: true },
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('receptions', {
      id: 'REC',
      enableSorting: true,
      meta: { mobileHidden: true },
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('grades_pass_route', {
      id: 'Route Grade',
      enableSorting: true,
      sortDescFirst: true,
      cell: info => {
        console.log('Grade Route Value for WR:', info.getValue());
        return info.getValue() !== null ? info.getValue() : 'N/A';
      },
    }),
  ], [navigate, year]);

  const wrTableData = useMemo(() => {
    return data.filter(player =>
      player.position === 'WR' &&
      (player.player_game_count || 0) > filterGamesPlayed &&
      (!filterPlayerName || player.name.toLowerCase().includes(filterPlayerName.toLowerCase())) &&
      (!filterTeamName || (player.team && player.team.toLowerCase().includes(filterTeamName.toLowerCase())) || (player.school && player.school.toLowerCase().includes(filterTeamName.toLowerCase())))
    );
  }, [data, filterGamesPlayed, filterPlayerName, filterTeamName]);

  const wrTableInstance = useReactTable({
    data: wrTableData,
    columns: wrColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'YDS', desc: true }],
    },
  });

  return (
    <div className="p-0 sm:p-0 shadow-xl rounded-lg">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Wide Receivers</h2>
      <div className="flex justify-center p-2 sm:hidden">
        <button
          className="bg-[#235347] text-white text-sm font-medium py-2 px-4 rounded hover:bg-[#1c3f33]"
          onClick={() => setShowAllColumns(!showAllColumns)}
        >
          {showAllColumns ? 'Hide Extra Columns' : 'Show All Columns'}
        </button>
      </div>
      <div className="h-[300px] sm:h-[362px] overflow-y-auto">
        <table className="w-full text-center border-collapse">
          <thead className="sticky top-0 bg-white z-0">
            {wrTableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-gray-0">
                {headerGroup.headers.map(column => (
                  <th
                    key={column.id}
                    className={`p-2 sm:p-3 text-[10px] sm:text-xs font-semibold border-b border-[#235347] text-black cursor-pointer ${column.column.columnDef.meta?.mobileHidden && !showAllColumns ? 'hidden sm:table-cell' : ''}`}
                    style={{
                      textAlign: column.id === 'Player Name' || column.id === 'School' ? 'left' : 'center',
                      verticalAlign: 'middle',
                      lineHeight: '1.1',
                    }}
                    onClick={() => {
                      const sorting = wrTableInstance.getState().sorting;
                      const currentSort = sorting.find(s => s.id === column.id);
                      wrTableInstance.setSorting([
                        {
                          id: column.id,
                          desc: !currentSort?.desc,
                        },
                      ]);
                    }}
                  >
                    {column.id}
                    {wrTableInstance.getState().sorting.find(s => s.id === column.id) && (
                      wrTableInstance.getState().sorting.find(s => s.id === column.id).desc ? ' ▼' : ' ▲'
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {wrTableInstance.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={index % 2 === 0 ? 'bg-gray-0' : 'bg-[#235347]/20'}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={`p-0.5 sm:p-1 text-[10px] sm:text-xs text-black border-b border-gray-300 ${cell.column.columnDef.meta?.mobileHidden && !showAllColumns ? 'hidden sm:table-cell' : ''}`}
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
    </div>
  );
};

export default memo(WrTable);