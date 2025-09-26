import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router-dom';

function TopTeams() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const year = 2025;
  const week = 5;
  const navigate = useNavigate();
  const isMobile = window.innerWidth < 640;

  const columnHelper = createColumnHelper();
  const columns = useMemo(() => [
    columnHelper.accessor('school', {
      id: 'School',
      cell: ({ row }) => {
        const toPath = `/teams/${row.original.teamId}/${year}`;
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
            {row.original.school.charAt(0).toUpperCase() + row.original.school.slice(1) || 'N/A'}
          </Link>
        );
      },
    }),
    columnHelper.accessor('record', {
      id: 'OVR',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
    }),
    columnHelper.accessor('home_record', {
      id: 'HOME',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
      meta: { mobileHidden: false },
    }),
    columnHelper.accessor('away_record', {
      id: 'AWAY',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
      meta: { mobileHidden: false },
    }),
    columnHelper.accessor('neutral_record', {
      id: 'NEU',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('quad1_record', {
      id: 'QUAD 1',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('quad2_record', {
      id: 'QUAD 2',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('quad3_record', {
      id: 'QUAD 3',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('quad4_record', {
      id: 'QUAD 4',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('SP_Rating', {
      id: 'SP+ Rating',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue().toFixed(1) : 'N/A'),
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('SP_Ranking', {
      id: 'SP+ Rank',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('SP_Off_Ranking', {
      id: 'SP+ Off. Rank',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('SP_Def_Ranking', {
      id: 'SP+ Def. Rank',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('FPI_Ranking', {
      id: 'FPI Rank',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('SOR', {
      id: 'SOR',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('SOS', {
      id: 'SOS',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('coaches_poll_rank', {
      id: 'Coaches Poll',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'NR'),
      meta: { mobileHidden: true },
      sortType: (rowA, rowB, columnId) => {
        const a = rowA.values[columnId];
        const b = rowB.values[columnId];
        const aVal = a === 'NR' ? Infinity : parseInt(a, 10);
        const bVal = b === 'NR' ? Infinity : parseInt(b, 10);
        return aVal - bVal;
      },
    }),
    columnHelper.accessor('ap_poll_rank', {
      id: 'AP Poll',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'NR'),
      sortType: (rowA, rowB, columnId) => {
        const a = rowA.values[columnId];
        const b = rowB.values[columnId];
        const aVal = a === 'NR' ? Infinity : parseInt(a, 10);
        const bVal = b === 'NR' ? Infinity : parseInt(b, 10);
        return aVal - bVal;
      },
    }),
  ], [navigate, year]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setData([]);
    fetch(`${process.env.REACT_APP_API_URL}/api/teams/rankings/${year}/${week}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        console.log('API response status:', response.status, response.statusText);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        if (isMounted) {
          try {
            const parsedData = JSON.parse(text);
            console.log('Full API response:', parsedData);
            const validData = Array.isArray(parsedData)
              ? parsedData.filter(team => team && typeof team === 'object' && team.teamId && team.school)
              : [];
            console.log('Filtered valid data:', validData);
            setData(validData);
          } catch (e) {
            console.error('JSON parsing error:', e.message, 'Raw response:', text);
            setError('Failed to parse response data');
          } finally {
            setIsLoading(false);
          }
        }
      })
      .catch(error => {
        if (isMounted) {
          console.error('API error:', error);
          setError(error.message);
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const tableInstance = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: 'AP Poll', desc: false }],
    },
  });

  if (isLoading) {
    return (
      <div className="p-0 shadow-xl rounded-lg">
        <h2 className="flex items-center justify-center text-lg sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-[40px] rounded">Top-25 Team Rankings</h2>
        <p className="text-gray-500 text-center p-4 text-[10px] sm:text-xs">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-0 shadow-xl rounded-lg">
        <h2 className="flex items-center justify-center text-lg sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-[40px] rounded">Top-25 Team Rankings</h2>
        <p className="text-red-500 text-center p-4 text-[10px] sm:text-xs">Error: {error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="p-0 shadow-xl rounded-lg">
        <h2 className="flex items-center justify-center text-lg sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-[40px] rounded">Top-25 Team Rankings</h2>
        <p className="text-gray-500 text-center p-4 text-[10px] sm:text-xs">No data available for {year}, week {week}.</p>
      </div>
    );
  }

  return (
    <div className="p-0 shadow-xl rounded-lg">
      <h2 className="flex items-center justify-center text-lg sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-[40px] rounded">Top-25 Team Rankings</h2>
      <div className="flex justify-center p-2 sm:hidden">
        <button
          onClick={() => setShowAllColumns(!showAllColumns)}
          className="bg-[#235347] text-white text-sm font-medium py-2 px-4 rounded hover:bg-[#1c3f33]"
        >
          {showAllColumns ? 'Hide Extra Columns' : 'Show All Columns'}
        </button>
      </div>
      <div className={isMobile ? "h-[300px] overflow-y-auto" : "h-[420px] overflow-y-auto"}>
        <table className="w-full text-center border-collapse">
          <thead className="sticky top-0 bg-white z-0">
            {tableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-gray-0">
                {headerGroup.headers.map(column => (
                  <th
                    key={column.id}
                    className={`p-${isMobile ? '2' : '3'} text-${isMobile ? '[10px]' : 'xs'} font-semibold border-b border-[#235347] text-black ${column.column.columnDef.enableSorting ? 'cursor-pointer' : ''} ${column.column.columnDef.meta?.mobileHidden && !showAllColumns ? 'hidden sm:table-cell' : ''}`}
                    style={{
                      textAlign: column.id === 'School' ? 'left' : 'center',
                      verticalAlign: 'middle',
                      lineHeight: '1.1',
                    }}
                    onClick={column.column.columnDef.enableSorting ? () => {
                      const sorting = tableInstance.getState().sorting;
                      const currentSort = sorting.find(s => s.id === column.id);
                      tableInstance.setSorting([
                        {
                          id: column.id,
                          desc: !currentSort?.desc,
                        },
                      ]);
                    } : undefined}
                  >
                    {column.id}
                    {column.column.columnDef.enableSorting && tableInstance.getState().sorting.find(s => s.id === column.id) && (
                      tableInstance.getState().sorting.find(s => s.id === column.id).desc ? ' ▼' : ' ▲'
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableInstance.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={index % 2 === 0 ? 'bg-gray-0' : 'bg-[#235347]/20'}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={`p-${isMobile ? '0.5' : '1'} text-${isMobile ? '[10px]' : 'xs'} text-black border-b border-gray-300 ${cell.column.columnDef.meta?.mobileHidden && !showAllColumns ? 'hidden sm:table-cell' : ''}`}
                    style={{
                      textAlign: cell.column.id === 'School' ? 'left' : 'center',
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
      <div className="p-2 text-center text-[10px] sm:text-xs">
        <Link
          to="/team_rankings"
          className="text-black hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
          style={{ display: 'inline-block' }}
        >
          Full Rankings
        </Link>
      </div>
    </div>
  );
}

export default TopTeams;