import React, { useMemo, useState, memo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link } from 'react-router-dom';

const LBETable = ({ data, navigate, filterGamesPlayed, filterPlayerName, filterTeamName, year }) => {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [showLBRzTooltip, setShowLBRzTooltip] = useState(false);

  const columnHelper = createColumnHelper();

  const gColumns = useMemo(() => [
    columnHelper.accessor('name', {
      id: 'Player Name',
      enableSorting: true,
      cell: ({ row }) => {
        const toPath = `/players/lbe/${row.original.playerId}`;
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
    columnHelper.accessor('LBR', {
      id: 'LBRz',
      enableSorting: true,
      sortDescFirst: true,
      cell: info => {
        const value = info.getValue();
        return value !== null ? value.toFixed(1) : 'N/A';
      },
    }),
  ], [navigate, year]);

  const gTableData = useMemo(() => {
    return data.filter(player =>
      (player.position === 'LB' || player.position === 'EDGE') &&
      (player.player_game_count || 0) >= filterGamesPlayed &&
      (!filterPlayerName || player.name.toLowerCase().includes(filterPlayerName.toLowerCase())) &&
      (!filterTeamName || (player.team && player.team.toLowerCase().includes(filterTeamName.toLowerCase())) || (player.school && player.school.toLowerCase().includes(filterTeamName.toLowerCase())))
    );
  }, [data, filterGamesPlayed, filterPlayerName, filterTeamName]);

  const gTableInstance = useReactTable({
    data: gTableData,
    columns: gColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'LBRz', desc: true }],
    },
  });

  return (
    <div className="p-0 sm:p-0 shadow-xl rounded-lg relative">
      <h2 className="flex items-center justify-center text-md sm:text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-auto rounded-t-lg">
        Linebackers and Edge
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
                      {column.id === 'LBRz' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowLBRzTooltip(true);
                          }}
                          className="w-3 h-3 bg-[#235347] text-white text-xs rounded-full flex items-center justify-center hover:bg-black ml-1"
                          title="What is LBRz?"
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

      {/* LBRz Tooltip Popup */}
      {showLBRzTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowLBRzTooltip(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#235347]">What is LBRz?</h3>
              <button
                onClick={() => setShowLBRzTooltip(false)}
                className="text-gray-500 hover:text-black text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-gray-700 space-y-4">
              <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                <strong className="text-blue-900 block mb-1">LBRz (Linebacker Rating)</strong>
                <p className="text-blue-800">A 0-100 score measuring <strong>overall dominance per game</strong>, comparable across seasons using <strong>z-score calculations</strong>.</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-[#235347] mb-2">How It's Calculated</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-green-800"><span>+ Coverage</span><span>PFF Coverage Grade</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Pass Rush</span><span>PFF Pass Rush Grade</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Run Defense</span><span>Stop Rate</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Pass Rush</span><span>Win Rate</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Turnovers</span><span>INTs/game</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Broken Plays</span><span>Pass Break-ups</span></div>
                  <div className="flex justify-between text-green-800"><span>+ Negative Plays</span><span>Hurries/Sacks</span></div>
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

export default memo(LBETable);