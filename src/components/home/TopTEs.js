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
    columnHelper.accessor('name', {
      id: 'Player Name',
      cell: ({ row }) => {
        const toPath = `/players/te/${row.original.playerId}`;
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
    columnHelper.accessor('team', {
      id: 'School',
      cell: ({ row }) => {
        const toPath = row.original.teamID ? `/teams/${row.original.teamID}/${year}` : '#';
        return (
          <Link
            to={toPath}
            className={`text-black hover:text-gray-900 underline underline-offset-2 inline-block cursor-pointer ${!row.original.teamID ? 'pointer-events-none opacity-50' : ''}`}
            style={{ display: 'inline-block' }}
            onClick={(e) => {
              if (row.original.teamID) {
                e.preventDefault();
                navigate(toPath, { state: { year } });
              }
            }}
          >
            {row.original.team.charAt(0).toUpperCase() + row.original.team.slice(1) || 'N/A'}
          </Link>
        );
      },
    }),
    columnHelper.accessor('averagePPA_pass', {
      id: 'Rec. PPA',
      cell: info => (info.getValue() !== null ? info.getValue().toFixed(3) : 'N/A'),
    }),
  ], [navigate, year]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setData([]);

    fetch(`${process.env.REACT_APP_API_URL}/api/players/ppa/${year}/top-tes`, {
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
              ? parsedData.filter(player => player && typeof player === 'object' && player.playerId && player.name && player.team)
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
  });

  if (isLoading) {
    return (
      <div className="p-0 shadow-xl rounded-lg h-full">
        <h2 className="flex items-center justify-center text-md sm:text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-auto rounded-t-lg">Top-25 TEs (PPA)</h2>
        <p className="text-gray-500 text-center p-4">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-0 shadow-xl rounded-lg h-full">
        <h2 className="flex items-center justify-center text-md sm:text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-auto rounded-t-lg">Top-25 TEs (PPA)</h2>
        <p className="text-red-500 text-center p-4">Error: {error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="p-0 shadow-xl rounded-lg h-full">
        <h2 className="flex items-center justify-center text-md sm:text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-auto rounded-t-lg">Top-25 TEs (PPA)</h2>
        <p className="text-gray-500 text-center p-4">No data available for {year}.</p>
      </div>
    );
  }

  return (
    <div className="p-0 shadow-xl rounded-lg h-full border-b border-[#235347]">
      <h2 className="flex items-center justify-center text-md sm:text-md bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-auto sm:h-auto rounded-t-lg">Top-25 TEs (PPA)</h2>
      <div className="h-[420px] overflow-y-auto border-b border-[#235347]">
        <table className="w-full text-center border-collapse">
          <thead className="sticky top-0 bg-white z-500">
            {tableInstance.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-gray-0">
                {headerGroup.headers.map(column => (
                  <th
                    key={column.id}
                    className="p-3 text-xs font-semibold border-b border-[#235347] text-black"
                    style={{
                      textAlign: column.id === 'Player Name' || column.id === 'School' ? 'left' : 'center',
                      verticalAlign: 'middle',
                      lineHeight: '1.1',
                    }}
                  >
                    {column.id}
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
      <div className="p-2 text-center text-[8px] sm:text-xs bg-[#235347] rounded-b-lg text-white">
        <Link
          to="https://inszn.co/players"
          className="text-white hover:text-gray-300 underline underline-offset-2 inline-block cursor-pointer"
          style={{ display: 'inline-block' }}
        >
          Full Rankings
        </Link>
      </div>
    </div>
  );
}

export default TopTEs;