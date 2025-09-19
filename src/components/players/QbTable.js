import React, { useMemo, memo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

const QbTable = ({ data, navigate, filterGamesPlayed, filterPlayerName, filterTeamName, year }) => {
  const columnHelper = createColumnHelper();
  const qbColumns = useMemo(() => [
    columnHelper.accessor('name', {
      id: 'Player Name',
      enableSorting: true,
      cell: ({ row }) => {
        const toPath = `/players/qb/${row.original.playerId}`;
        return (
          <Link
            to={toPath}
            className="text-black hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
            style={{ display: 'inline-block' }}
            onClick={(e) => {
              e.preventDefault();
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
    columnHelper.accessor('completion_percent', {
      id: 'Comp%',
      enableSorting: true,
      cell: info => (info.getValue() !== null ? `${info.getValue().toFixed(1)}%` : 'N/A'),
    }),
    columnHelper.accessor('yards', {
      id: 'YDS',
      enableSorting: true,
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('ypa', {
      id: 'YPA',
      enableSorting: true,
      cell: info => (info.getValue() !== null ? info.getValue().toFixed(1) : 'N/A'),
    }),
    columnHelper.accessor('touchdowns', {
      id: 'TDs',
      enableSorting: true,
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('interceptions', {
      id: 'INTs',
      enableSorting: true,
      cell: info => (info.getValue() !== null ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('grades_pass', {
      id: 'Pass Grade',
      enableSorting: true,
      sortDescFirst: true,
      cell: info => (info.getValue() !== null ? info.getValue().toFixed(1) : 'N/A'),
    }),
  ], [navigate, year]);

  const qbTableData = useMemo(() => {
    console.log('Filtering QB data for year:', year, 'Total players:', data.length); // Debug
    const filteredData = data.filter(player => {
      const playerYear = String(player.year); // Ensure year is string for comparison
      const gamesPlayed = player.player_game_count || 0;
      const nameMatch = !filterPlayerName || player.name.toLowerCase().includes(filterPlayerName.toLowerCase());
      const teamMatch = !filterTeamName || 
        (player.team && player.team.toLowerCase().includes(filterTeamName.toLowerCase())) || 
        (player.school && player.school.toLowerCase().includes(filterTeamName.toLowerCase()));
      const yearMatch = playerYear === String(year); // Strict equality
      return (
        player.position === 'QB' &&
        gamesPlayed > filterGamesPlayed &&
        nameMatch &&
        teamMatch &&
        yearMatch
      );
    });
    console.log('Filtered QB data:', filteredData); // Debug
    return filteredData;
  }, [data, filterGamesPlayed, filterPlayerName, filterTeamName, year]);

  const qbTableInstance = useReactTable({
    data: qbTableData,
    columns: qbColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'YDS', desc: true }],
    },
  });

  return (
    <div className="p-0 shadow-xl rounded-lg">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Quarterbacks</h2>
      <div className="h-[362px] overflow-y-auto">
        <table className="w-full text-center border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            {qbTableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-gray-0">
                {headerGroup.headers.map(column => (
                  <th
                    key={column.id}
                    className="p-3 text-xs font-semibold border-b border-[#235347] text-black cursor-pointer"
                    style={{
                      textAlign: column.id === 'Player Name' || column.id === 'School' ? 'left' : 'center',
                      verticalAlign: 'middle',
                      lineHeight: '1.1',
                    }}
                    onClick={() => {
                      const sorting = qbTableInstance.getState().sorting;
                      const currentSort = sorting.find(s => s.id === column.id);
                      qbTableInstance.setSorting([
                        {
                          id: column.id,
                          desc: !currentSort?.desc,
                        },
                      ]);
                    }}
                  >
                    {column.id}
                    {qbTableInstance.getState().sorting.find(s => s.id === column.id) && (
                      qbTableInstance.getState().sorting.find(s => s.id === column.id).desc ? ' ▼' : ' ▲'
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {qbTableInstance.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={index % 2 === 0 ? 'bg-gray-0' : 'bg-[#235347]/20'}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="p-1 text-xs text-black border-b border-gray-300"
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

export default memo(QbTable);