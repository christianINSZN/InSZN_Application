import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router-dom';
import NavBar from '../NavBar';

const conferences = [
  'All', 'ACC', 'American Athletic', 'Big 12', 'Big Ten', 'Conference USA',
  'FBS Independents', 'Mid-American', 'Mountain West',
  'Pac-12', 'SEC', 'Sun Belt'
];

function TeamsRankings({ year = '2025', week = '11' }) {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [filterTeamName, setFilterTeamName] = useState('');
  const [filterConference, setFilterConference] = useState('');
  const [activeConference, setActiveConference] = useState('All');
  const [showAllColumns, setShowAllColumns] = useState(false);
  const isMobile = window.innerWidth < 640;
  const columnHelper = createColumnHelper();

  const uniqueTeamNames = useMemo(() => {
    return [...new Set(data.map(team => team.school).filter(Boolean))].sort();
  }, [data]);

  const uniqueConferences = useMemo(() => {
    return [...new Set(data.map(team => team.conference).filter(Boolean))].sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(team => {
      const teamNameMatch = team.school.toLowerCase().includes(filterTeamName.toLowerCase());
      const conferenceMatch = !filterConference || filterConference === 'All' || team.conference.toLowerCase() === filterConference.toLowerCase();
      return teamNameMatch && conferenceMatch;
    });
  }, [data, filterTeamName, filterConference]);

  const columns = useMemo(() => [
    columnHelper.accessor('school', {
      id: 'TEAM',
      cell: ({ row }) => {
        const toPath = `/teams/${row.original.teamId}/${year}`;
        return (
          <Link
            to={toPath}
            className="text-black hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer"
            style={{ display: 'inline-block' }}
          >
            {row.original.school.charAt(0).toUpperCase() + row.original.school.slice(1) || 'N/A'}
          </Link>
        );
      },
      meta: { mobileHidden: false },
    }),
    columnHelper.accessor('conference', {
      id: 'CONF',
      enableSorting: true,
      cell: info => info.getValue() || 'N/A',
      meta: { mobileHidden: false },
    }),
    columnHelper.accessor('record', {
      id: 'OVR',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
      meta: { mobileHidden: false },
    }),
    columnHelper.accessor('home_record', {
      id: 'HOME',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('away_record', {
      id: 'AWAY',
      enableSorting: true,
      cell: info => info.getValue() || '0-0',
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('FPI_Ranking', {
      id: 'FPI Rank',
      enableSorting: true,
      cell: info => (info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'N/A'),
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
      meta: { mobileHidden: true },
      sortType: (rowA, rowB, columnId) => {
        const a = rowA.values[columnId];
        const b = rowB.values[columnId];
        const aVal = a === 'NR' ? Infinity : parseInt(a, 10);
        const bVal = b === 'NR' ? Infinity : parseInt(b, 10);
        return aVal - bVal;
      },
    }),
  ], [year]);

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
  }, [year, week]);

  const tableInstance = useReactTable({
    data: filteredData,
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
        <div className="pt-5 px-2 sm:px-4 mx-auto">
          <div className="p-2 sm:p-4 shadow-xl rounded-lg">
            <h2 className="flex items-center justify-center text-base sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-[40px] rounded">Full Team Rankings</h2>
            <p className="text-gray-500 text-center p-4 text-base sm:text-lg">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <NavBar />
        <div className="pt-5 px-2 sm:px-4 mx-auto">
          <div className="p-2 sm:p-4 shadow-xl rounded-lg">
            <h2 className="flex items-center justify-center text-base sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-[40px] rounded">Full Team Rankings</h2>
            <p className="text-red-500 text-center p-4 text-base sm:text-lg">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!filteredData.length) {
    return (
      <div className="w-full">
        <NavBar />
        <div className="pt-5 px-2 sm:px-4 mx-auto">
          <div className="p-2 sm:p-4 shadow-xl rounded-lg">
            <h2 className="flex items-center justify-center text-base sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-[40px] rounded">Full Team Rankings</h2>
            <p className="text-gray-500 text-center p-4 text-base sm:text-lg">No data available for {year}, week {week}.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mt-0 sm:mt-12">
      <NavBar />
      <div className="px-2 sm:px-4 mx-auto">
        <div className="mb-4 sm:mb-6 mt-3 gap-4 items-end bg-gray-0 p-2 sm:p-4 rounded-lg shadow-xl">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="w-full">
              <label htmlFor="teamNameFilter" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                Filter by Team Name
              </label>
              <input
                list="teamNames"
                id="teamNameFilter"
                value={filterTeamName}
                onChange={(e) => setFilterTeamName(e.target.value)}
                className="w-full p-3 sm:p-2 border border-gray-300 rounded text-black text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#235347]"
                placeholder="Search teams..."
              />
              <datalist id="teamNames">
                {uniqueTeamNames.map((team, index) => (
                  <option key={index} value={team} />
                ))}
              </datalist>
            </div>
            <div className="w-full">
              <label htmlFor="conferenceFilter" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                Filter by Conference
              </label>
              <input
                list="conferences"
                id="conferenceFilter"
                value={filterConference}
                onChange={(e) => setFilterConference(e.target.value)}
                className="w-full p-3 sm:p-2 border border-gray-300 rounded text-black text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#235347]"
                placeholder="Search conferences..."
              />
              <datalist id="conferences">
                {uniqueConferences.map((conference, index) => (
                  <option key={index} value={conference} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
        <div className="border-b border-gray-300 mb-4 sm:mb-6">
          <div className="overflow-x-auto whitespace-nowrap py-2">
            <ul className="flex gap-2 sm:gap-4 justify-start sm:justify-center p-2 sm:p-4">
              {conferences.map(conference => (
                <li key={conference}>
                  <button
                    className={`text-black hover:text-gray-900 pb-2 border-b-2 text-sm sm:text-base px-2 sm:px-3 py-1 rounded ${activeConference === conference ? 'border-[#235347] bg-[#235347]/10' : 'border-transparent hover:border-[#235347]'}`}
                    onClick={() => {
                      setActiveConference(conference);
                      setFilterConference(conference);
                    }}
                  >
                    {conference}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="p-2 sm:p-4 shadow-xl rounded-lg border-b border-[#235347]">
          <h2 className="flex items-center justify-center text-base sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-[40px] rounded">Full Team Rankings</h2>
          <div className="flex justify-center p-2 sm:hidden">
            <button
              onClick={() => setShowAllColumns(!showAllColumns)}
              className="bg-[#235347] text-white text-sm sm:text-base font-medium py-2 px-4 rounded hover:bg-[#1c3f33]"
            >
              {showAllColumns ? 'Hide Extra Columns' : 'Show All Columns'}
            </button>
          </div>
          <div className="relative overflow-y-auto">
            <table className="w-full text-center border-collapse">
              <thead className="sticky top-0 bg-white z-0">
                {tableInstance.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-gray-0">
                    {headerGroup.headers.map(column => (
                      <th
                        key={column.id}
                        className={`p-2 sm:p-3 text-sm sm:text-base font-semibold border-b border-[#235347] text-black ${column.column.columnDef.enableSorting ? 'cursor-pointer' : ''} ${column.column.columnDef.meta?.mobileHidden && !showAllColumns ? 'hidden sm:table-cell' : ''}`}
                        style={{
                          textAlign: column.id === 'TEAM' ? 'left' : 'center',
                          verticalAlign: 'middle',
                          lineHeight: '1.2',
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
                    className={index % 2 === 0 ? 'bg-gray-0' : 'bg-[#235347]/10'}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className={`p-2 sm:p-3 text-sm sm:text-base text-black border-b border-gray-300 ${cell.column.columnDef.meta?.mobileHidden && !showAllColumns ? 'hidden sm:table-cell' : ''}`}
                        style={{
                          textAlign: cell.column.id === 'TEAM' ? 'left' : 'center',
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
      </div>
    </div>
  );
}

export default TeamsRankings;