import { useState, useEffect, useMemo } from 'react';
import { useReactTable, getCoreRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router-dom';

function TopTEs() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const year = 2025;
  const navigate = useNavigate();
  const columnHelper = createColumnHelper();

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'player',
      size: 200,
      header: () => null,
      cell: ({ row }) => {
        const toPath = `/players/te/${row.original.playerId}`;
        const headshot = row.original.headshotURL || row.original.headshot_URL;
        const name = row.original.name || 'N/A';

        return (
          <Link
            to={toPath}
            className="flex items-center gap-2 text-black hover:text-gray-500 underline underline-offset-2 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              navigate(toPath, { state: { year } });
            }}
          >
            {headshot ? (
              <img
                src={headshot}
                alt={name}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-7 h-7 bg-gray-300 rounded-full flex-shrink-0" />
            )}
            <span className="text-xs font-medium leading-none">{name}</span>
          </Link>
        );
      },
    }),
    columnHelper.accessor('TER', {
      id: 'ter',
      size: 60,
      header: () => (
        <div className="text-center">
          <div className="text-xs font-bold">TERz</div>
        </div>
      ),
      cell: info => (
        <div className="text-center text-xs font-medium">
          {info.getValue() ? info.getValue().toFixed(1) : 'N/A'}
        </div>
      ),
    }),
  ], [navigate, year]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setData([]);

    fetch(`${process.env.REACT_APP_API_URL}/api/playerdashboard/${year}`, {
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
        return response.json();
      })
      .then(jsonData => {
        if (isMounted) {
          const teData = Array.isArray(jsonData)
            ? jsonData.filter(p =>
                p &&
                p.position === 'TE' &&
                p.playerId &&
                p.name &&
                p.TER !== null &&
                p.TER !== undefined
              )
            : [];
          const sorted = teData
            .sort((a, b) => (b.TER || 0) - (a.TER || 0))
            .slice(0, 10);
          setData(sorted);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [year]);

  const tableInstance = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="p-0 shadow-xl rounded-lg relative z-100">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white border-b border-[#235347] rounded-t-lg py-2">INSZN Top-10 TERz</h2>
        <p className="text-gray-500 text-center p-3 text-xs">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-0 shadow-xl rounded-lg relative z-100">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white border-b border-[#235347] rounded-t-lg py-2">INSZN Top-10 TERz</h2>
        <p className="text-red-500 text-center p-3 text-xs">Error: {error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="p-0 shadow-xl rounded-lg relative z-100">
        <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white border-b border-[#235347] rounded-t-lg py-2">INSZN Top-10 TERz</h2>
        <p className="text-gray-500 text-center p-3 text-xs">No TE data available.</p>
      </div>
    );
  }

  return (
    <div className="p-0 shadow-xl rounded-lg relative z-100">
      <h2 className="flex items-center justify-center text-md bg-[#235347] font-bold text-white border-b border-[#235347] rounded-t-lg py-2">INSZN Top-10 TERz</h2>

      {/* Desktop */}
      <div className="hidden sm:block">
        <table className="w-full">
          <thead className="sticky top-0 bg-white z-100">
            {tableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(column => (
                  <th
                    key={column.id}
                    className="px-3 py-1.5 text-xs font-bold border-b border-[#235347] text-left"
                    style={{ width: column.column.columnDef.size }}
                  >
                    {flexRender(column.column.columnDef.header, column.getContext())}
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
                    className="px-3 py-1.5 border-b border-gray-200 align-middle"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="sm:hidden h-64 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white z-100">
            {tableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(column => (
                  <th
                    key={column.id}
                    className="px-2 py-1 text-[10px] font-bold border-b border-[#235347] text-left"
                  >
                    {flexRender(column.column.columnDef.header, column.getContext())}
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
                    className="px-2 py-1 border-b border-gray-200 align-middle"
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
          to="/players"
          className="text-white hover:text-gray-300 underline underline-offset-2"
        >
          Full Player Rankings
        </Link>
      </div>
    </div>
  );
}

export default TopTEs;