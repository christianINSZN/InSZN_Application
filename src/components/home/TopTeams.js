import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router-dom';

function TopTeams() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const year = 2025;
  const week = 11;
  const navigate = useNavigate();
  const isMobile = window.innerWidth < 640;
  const columnHelper = createColumnHelper();

  const columns = useMemo(() => [
    columnHelper.accessor('school', {
      id: 'School',
      size: 150,
      cell: ({ row }) => {
        const toPath = `/teams/${row.original.teamId}/${year}`;
        const logo = row.original.logo;
        const schoolName = row.original.school.charAt(0).toUpperCase() + row.original.school.slice(1) || 'N/A';

        return (
          <Link
            to={toPath}
            className="flex items-center gap-1.5 text-black hover:text-gray-500 underline underline-offset-2 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              navigate(toPath, { state: { year } });
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt={schoolName}
                className="w-5 h-5 object-contain flex-shrink-0"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-5 h-5 bg-gray-200 rounded-full flex-shrink-0" />
            )}
            <span className="text-xs leading-none truncate">{schoolName}</span>
          </Link>
        );
      },
    }),
    columnHelper.accessor('record', {
      id: 'Record',
      size: 70,
      enableSorting: true,
      cell: info => <span className="text-xs leading-none">{info.getValue() || '0-0'}</span>,
      meta: { mobileHidden: false },
    }),
    columnHelper.accessor('ap_poll_rank', {
      id: 'AP Rank',
      size: 70,
      enableSorting: true,
      cell: info => <span className="text-xs leading-none">{info.getValue() !== null && info.getValue() !== undefined ? info.getValue() : 'NR'}</span>,
      meta: { mobileHidden: false },
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
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        if (isMounted) {
          try {
            const parsedData = JSON.parse(text);
            const validData = Array.isArray(parsedData)
              ? parsedData.filter(team => team && typeof team === 'object' && team.teamId && team.school)
              : [];
            setData(validData);
          } catch (e) {
            setError('Failed to parse response data');
          } finally {
            setIsLoading(false);
          }
        }
      })
      .catch(error => {
        if (isMounted) {
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
      sorting: [{ id: 'AP Rank', desc: false }],
    },
  });

  if (isLoading) {
    return (
      <div className="p-0 shadow-xl rounded-lg relative z-100">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white border-b border-[#235347] rounded-t-lg py-2">AP Top 25</h2>
        <p className="text-gray-500 text-center p-3 text-xs">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-0 shadow-xl rounded-lg relative z-100">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white border-b border-[#235347] rounded-t-lg py-2">AP Top 25</h2>
        <p className="text-red-500 text-center p-3 text-xs">Error: {error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="p-0 shadow-xl rounded-lg relative z-100">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white border-b border-[#235347] rounded-t-lg py-2">AP Top 25</h2>
        <p className="text-gray-500 text-center p-3 text-xs">No data available.</p>
      </div>
    );
  }

  return (
    <div className="p-0 shadow-xl rounded-lg relative z-100">
      <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white border-b border-[#235347] rounded-t-lg py-2">AP Top 25</h2>

      {/* Desktop: Full height */}
      <div className="hidden sm:block">
        <table className="w-full text-center border-collapse">
          <thead className="sticky top-0 bg-white z-100">
            {tableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(column => (
                  <th
                    key={column.id}
                    className={`px-3 py-2 text-xs font-bold border-b border-[#235347] text-black ${column.column.columnDef.enableSorting ? 'cursor-pointer' : ''}`}
                    style={{
                      textAlign: column.id === 'School' ? 'left' : 'center',
                      width: column.column.columnDef.size,
                      minWidth: '60px',
                    }}
                    onClick={column.column.columnDef.enableSorting ? () => {
                      const currentSort = tableInstance.getState().sorting.find(s => s.id === column.id);
                      tableInstance.setSorting([{ id: column.id, desc: !currentSort?.desc }]);
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
            {tableInstance.getRowModel().rows.map(row => (
              <tr key={row.id} className="bg-white hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={`px-3 py-1.5 border-b border-gray-200 align-middle`}
                    style={{
                      textAlign: cell.column.id === 'School' ? 'left' : 'center',
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

      {/* Mobile: Scrollable */}
      <div className="sm:hidden h-64 overflow-y-auto">
        <table className="w-full text-center border-collapse">
          <thead className="sticky top-0 bg-white z-100">
            {tableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers
                  .filter(col => !col.column.columnDef.meta?.mobileHidden)
                  .map(column => (
                    <th
                      key={column.id}
                      className="px-2 py-1 text-[10px] font-bold border-b border-[#235347] text-black"
                      style={{
                        textAlign: column.id === 'School' ? 'left' : 'center',
                      }}
                    >
                      {column.id}
                    </th>
                  ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableInstance.getRowModel().rows.map(row => (
              <tr key={row.id} className="bg-white hover:bg-gray-50">
                {row.getVisibleCells()
                  .filter(cell => !cell.column.columnDef.meta?.mobileHidden)
                  .map(cell => (
                    <td
                      key={cell.id}
                      className="px-2 py-1 border-b border-gray-200 align-middle"
                      style={{
                        textAlign: cell.column.id === 'School' ? 'left' : 'center',
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

      <div className="p-2 text-center text-xs bg-[#235347] rounded-b-lg text-white">
        <Link
          to="/team_rankings"
          className="text-white hover:text-gray-300 underline underline-offset-2"
        >
          Full Rankings
        </Link>
      </div>
    </div>
  );
}

export default TopTeams;