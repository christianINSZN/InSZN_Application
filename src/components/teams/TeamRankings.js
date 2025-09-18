import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router-dom';
import NavBar from '../NavBar'; // Adjust path as needed

function TeamsRankings({ year = '2025', week = '4' }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const navigate = useNavigate();
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
    }),
    columnHelper.accessor('away_record', {
      id: 'AWAY',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
    }),
    columnHelper.accessor('neutral_record', {
      id: 'NEU',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
    }),
    columnHelper.accessor('quad1_record', {
      id: 'QUAD 1',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
    }),
    columnHelper.accessor('quad2_record', {
      id: 'QUAD 2',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
    }),
    columnHelper.accessor('quad3_record', {
      id: 'QUAD 3',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
    }),
    columnHelper.accessor('quad4_record', {
      id: 'QUAD 4',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
    }),
    columnHelper.accessor('SP_Rating', {
      id: 'SP+ Rating',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue().toFixed(1) : 'N/A'),
    }),
    columnHelper.accessor('SP_Ranking', {
      id: 'SP+ Rank',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('SP_Off_Ranking', {
      id: 'SP+ Off. Rank',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('SP_Def_Ranking', {
      id: 'SP+ Def. Rank',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('FPI_Ranking', {
      id: 'FPI Rank',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('SOR', {
      id: 'SOR',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('SOS', {
      id: 'SOS',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
    }),
    columnHelper.accessor('coaches_poll_rank', {
      id: 'Coaches Poll',
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
    fetch(`${process.env.REACT_APP_API_URL}/api/teams/rankings_full/${year}/${week}`, {
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
      sorting: [{ id: 'FPI Rank', desc: false }],
    },
  });

  if (isLoading) {
    return (
      <div className="w-full">
        <NavBar />
        <div className="pt-5 px-4 mx-auto">
          <div className="p-0 shadow-xl rounded-lg h-full">
            <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Full Team Rankings</h2>
            <p className="text-gray-500 text-center p-4">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <NavBar />
        <div className="pt-5 px-4 mx-auto">
          <div className="p-0 shadow-xl rounded-lg h-full">
            <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Full Team Rankings</h2>
            <p className="text-red-500 text-center p-4">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="w-full">
        <NavBar />
        <div className="pt-5 px-4 mx-auto">
          <div className="p-0 shadow-xl rounded-lg h-full">
            <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Full Team Rankings</h2>
            <p className="text-gray-500 text-center p-4">No data available for {year}, week {week}.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <NavBar />
      <div className="pt-5 px-4 mx-auto">
        <div className="p-0 shadow-xl rounded-lg h-full border-b border-[#235347]">
          <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Full Team Rankings</h2>
          <div className="h-[full] overflow-y-auto border-b border-[#235347]">
            <table className="w-full text-center border-collapse">
              <thead className="sticky top-0 bg-white z-500">
                {tableInstance.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-gray-0">
                    {headerGroup.headers.map(column => (
                      <th
                        key={column.id}
                        className={`p-3 text-xs font-semibold border-b border-[#235347] text-black ${column.column.columnDef.enableSorting ? 'cursor-pointer' : ''}`}
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
                        className="p-1 text-xs text-black border-b border-gray-300"
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
          <div className="p-1 text-center text-sm">
            <span
              className="text-black hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
              style={{ display: 'inline-block' }}
              onClick={() => setShowComingSoon(true)}
            >
              Full Rankings
            </span>
          </div>
          {showComingSoon && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl">
                <p className="text-lg font-semibold text-black">Coming Soon</p>
                <button
                  className="mt-4 px-4 py-2 text-center bg-[#235347] text-white rounded hover:bg-[#1b3e32]"
                  onClick={() => setShowComingSoon(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamsRankings;