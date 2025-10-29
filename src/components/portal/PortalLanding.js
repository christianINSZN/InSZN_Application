// src/components/portal/PortalLanding.js
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';

const PortalLanding = ({ className = "" }) => {
  const [portalData, setPortalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showFullColumns, setShowFullColumns] = useState(false);

  const isMobile = window.innerWidth < 640;
  const headshotSize = 36;
  const logoSize = isMobile ? 28 : 32; // Fixed: smaller on mobile, normal on desktop

  const formatHeight = (inches) => {
    if (!inches) return '—';
    const feet = Math.floor(inches / 12);
    const remaining = inches % 12;
    return `${feet}'${remaining}"`;
  };

  // -------------------------------------------------------------------
  // Fetch portal data
  // -------------------------------------------------------------------
  useEffect(() => {
    const fetchPortal = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/players_portal`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setPortalData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPortal();
  }, []);

  // -------------------------------------------------------------------
  // Filter Options
  // -------------------------------------------------------------------
  const uniquePositions = useMemo(() => {
    return [...new Set(portalData.map(p => p.position).filter(Boolean))].sort();
  }, [portalData]);

  const uniqueOrigins = useMemo(() => {
    return [...new Set(portalData.map(p => p.origin).filter(Boolean))].sort();
  }, [portalData]);

  const uniqueDestinations = useMemo(() => {
    return [...new Set(portalData.map(p => p.destination).filter(Boolean))].sort();
  }, [portalData]);

  const uniqueStatuses = useMemo(() => {
    return [...new Set(portalData.map(p => p.eligibility).filter(Boolean))].sort();
  }, [portalData]);

  const uniqueYears = useMemo(() => {
    return [...new Set(portalData.map(p => p.season).filter(Boolean))].sort((a, b) => b - a);
  }, [portalData]);

  // -------------------------------------------------------------------
  // Filtered Data
  // -------------------------------------------------------------------
  const filteredData = useMemo(() => {
    return portalData.filter(p => {
      const nameMatch = !filterName || p.name.toLowerCase().includes(filterName.toLowerCase());
      const posMatch = !filterPosition || p.position === filterPosition;
      const originMatch = !filterOrigin || p.origin === filterOrigin;
      const destMatch = !filterDestination || p.destination === filterDestination;
      const statusMatch = !filterStatus || p.eligibility === filterStatus;
      const yearMatch = !filterYear || p.season === parseInt(filterYear);
      return nameMatch && posMatch && originMatch && destMatch && statusMatch && yearMatch;
    });
  }, [portalData, filterName, filterPosition, filterOrigin, filterDestination, filterStatus, filterYear]);

  // -------------------------------------------------------------------
  // Column Helper
  // -------------------------------------------------------------------
  const columnHelper = createColumnHelper();

  // -------------------------------------------------------------------
  // Mobile Columns (3-column card)
  // -------------------------------------------------------------------
  const mobileColumns = [
    // Player + Position
    columnHelper.display({
      id: 'Player',
      header: 'Player',
      cell: ({ row }) => {
        const p = row.original;
        const pos = p.position;
        let toPath = null;
        if (p.playerId) {
          if (['QB', 'WR', 'TE', 'RB', 'C', 'G', 'T', 'S', 'CB', 'DB'].includes(pos)) {
            toPath = `/players/${pos.toLowerCase()}/${p.playerId}`;
          } else if (['DL', 'DE'].includes(pos)) {
            toPath = `/players/dl/${p.playerId}`;
          } else if (['LB', 'EDGE'].includes(pos)) {
            toPath = `/players/lbe/${p.playerId}`;
          }
        }
        return (
          <div className="text-left">
            <div className="font-semibold text-sm">
              {toPath ? (
                <Link to={toPath} className="text-[#235347] hover:underline">
                  {p.name}
                </Link>
              ) : p.name}
            </div>
            <div className="text-xs text-gray-600">{p.position || '—'}</div>
          </div>
        );
      },
    }),

    // Transfer
    columnHelper.display({
      id: 'Transfer',
      header: 'Transfer',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center justify-center space-x-1">
            {p.originLogo ? (
              <img src={p.originLogo} alt={p.origin} className="w-7 h-7 object-contain" onError={(e) => e.target.style.display = 'none'} />
            ) : (
              <div className="w-7 h-7 bg-gray-200 border border-gray-300 rounded" />
            )}
            <span className="text-base text-gray-500">→</span>
            {p.destinationLogo ? (
              <img src={p.destinationLogo} alt={p.destination} className="w-7 h-7 object-contain" onError={(e) => e.target.style.display = 'none'} />
            ) : (
              <div className="w-7 h-7 bg-gray-200 border border-gray-300 rounded" />
            )}
          </div>
        );
      },
    }),

    // Stars
    columnHelper.display({
      id: 'Stars',
      header: 'Stars',
      cell: ({ row }) => {
        const p = row.original;
        return p.stars ? (
          <div className="text-center text-yellow-500 font-bold text-sm">
            {'★'.repeat(p.stars)}
          </div>
        ) : <span className="text-gray-400">—</span>;
      },
    }),

    // Rating
    columnHelper.display({
      id: 'Rating',
      header: 'Rating',
      cell: ({ row }) => {
        const p = row.original;
        return p.rating ? (
          <div className="text-center text-xs font-medium text-gray-700">
            {p.rating.toFixed(2)}
          </div>
        ) : <span className="text-gray-400">—</span>;
      },
    }),
  ];

  // -------------------------------------------------------------------
  // Desktop Columns (full)
  // -------------------------------------------------------------------
  const desktopColumns = [
    columnHelper.accessor('headshotURL', {
      id: 'Headshot',
      header: '',
      cell: ({ row }) => (
        row.original.headshotURL ? (
          <img
            src={row.original.headshotURL}
            alt={row.original.name}
            className="w-9 h-9 mr-1 inline-block rounded-full object-cover"
            onError={(e) => { e.target.src = 'https://a.espncdn.com/i/headshots/nophoto.png'; }}
          />
        ) : (
          <img
            src="https://a.espncdn.com/i/headshots/nophoto.png"
            alt="No headshot"
            className="w-9 h-9 mr-1 inline-block rounded-full"
          />
        )
      ),
    }),

    columnHelper.accessor('name', {
      id: 'Player',
      header: 'Player',
      cell: ({ row }) => {
        const p = row.original;
        const pos = p.position;
        let toPath = null;
        if (p.playerId) {
          if (['QB', 'WR', 'TE', 'RB', 'C', 'G', 'T', 'S', 'CB', 'DB'].includes(pos)) {
            toPath = `/players/${pos.toLowerCase()}/${p.playerId}`;
          } else if (['DL', 'DE'].includes(pos)) {
            toPath = `/players/dl/${p.playerId}`;
          } else if (['LB', 'EDGE'].includes(pos)) {
            toPath = `/players/lbe/${p.playerId}`;
          }
        }
        return (
          <span className="font-medium text-xs sm:text-sm">
            {toPath ? (
              <Link
                to={toPath}
                className="text-[#235347] hover:text-[#235347]/70 underline underline-offset-2"
              >
                {p.name}
              </Link>
            ) : (
              p.name
            )}
          </span>
        );
      },
    }),

    columnHelper.accessor('stars', {
      id: 'Stars',
      header: 'Stars',
      cell: info => {
        const stars = info.getValue();
        return stars !== null ? (
          <div className="flex justify-center">
            <span className="text-yellow-500 font-bold text-sm sm:text-base">
              {'★'.repeat(stars)}
            </span>
          </div>
        ) : '—';
      },
    }),

    columnHelper.accessor('rating', {
      id: 'Rating',
      header: 'Rating',
      cell: info => {
        const rating = info.getValue();
        return rating !== null ? (
          <div className="flex justify-center">
            <span className="text-sm sm:text-base text-gray-700 font-medium">
              {rating.toFixed(2)}
            </span>
          </div>
        ) : '—';
      },
    }),

    columnHelper.display({
      id: 'Origin',
      header: 'From',
      cell: ({ row }) => {
        const p = row.original;
        return p.originLogo ? (
          <div className="flex justify-center">
            <img
              src={p.originLogo}
              alt={p.origin}
              className={`w-8 h-8 object-contain`} // Fixed: w-8 h-8
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-gray-200 border border-gray-300 rounded" />
          </div>
        );
      },
    }),

    columnHelper.display({
      id: 'Arrow',
      header: '',
      cell: () => (
        <div className="flex justify-center items-center">
          <span className="text-xl sm:text-2xl text-gray-600 font-bold">→</span>
        </div>
      ),
    }),

    columnHelper.display({
      id: 'Destination',
      header: 'To',
      cell: ({ row }) => {
        const p = row.original;
        return p.destinationLogo ? (
          <div className="flex justify-center">
            <img
              src={p.destinationLogo}
              alt={p.destination || '—'}
              className={`w-8 h-8 object-contain`} // Fixed: w-8 h-8
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-gray-200 border border-gray-300 rounded" />
          </div>
        );
      },
    }),

    columnHelper.accessor('position', {
      id: 'POS',
      header: 'POS',
      cell: info => info.getValue() || '—',
    }),

    columnHelper.accessor('height', {
      id: 'HT',
      header: 'HT',
      cell: info => formatHeight(info.getValue()),
    }),

    columnHelper.accessor('weight', {
      id: 'WT',
      header: 'WT',
      cell: info => info.getValue() || '—',
    }),

    columnHelper.accessor(row => `${row.homeCity || ''}, ${row.homeState || ''}`.trim(), {
      id: 'Hometown',
      header: 'Hometown',
      cell: info => info.getValue() || '—',
    }),

    columnHelper.accessor('eligibility', {
      id: 'Status',
      header: 'Status',
      cell: info => info.getValue() || '—',
    }),
  ];

  const columns = isMobile && !showFullColumns ? mobileColumns : desktopColumns;

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { sorting: [{ id: 'Rating', desc: true }] },
  });

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  if (loading) return <div className="p-6 text-center text-gray-600">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>;

  return (
    <div className={`w-full p-3 sm:p-4 ${className}`}>
      {/* Title */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Transfer Portal</h1>
      </div>

      {/* Filters */}
      {isMobile ? (
        <div className="mb-4 space-y-3 bg-gray-50 p-3 rounded-lg text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
              >
                <option value="">All</option>
                {uniqueYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
              >
                <option value="">All</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Player</label>
            <input
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="Search name..."
              className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
              <select
                value={filterPosition}
                onChange={e => setFilterPosition(e.target.value)}
                className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
              >
                <option value="">All</option>
                {uniquePositions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
              <select
                value={filterOrigin}
                onChange={e => setFilterOrigin(e.target.value)}
                className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
              >
                <option value="">All</option>
                {uniqueOrigins.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
            <select
              value={filterDestination}
              onChange={e => setFilterDestination(e.target.value)}
              className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
            >
              <option value="">All</option>
              {uniqueDestinations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-6 gap-2 bg-gray-100 p-3 rounded-lg text-xs">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
            >
              <option value="">All</option>
              {uniqueYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Player</label>
            <input
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="Name..."
              className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">POS</label>
            <select
              value={filterPosition}
              onChange={e => setFilterPosition(e.target.value)}
              className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
            >
              <option value="">All</option>
              {uniquePositions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
            >
              <option value="">All</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
            <select
              value={filterOrigin}
              onChange={e => setFilterOrigin(e.target.value)}
              className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
            >
              <option value="">All</option>
              {uniqueOrigins.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
            <select
              value={filterDestination}
              onChange={e => setFilterDestination(e.target.value)}
              className="w-full p-1.5 border rounded text-xs focus:ring-1 focus:ring-[#235347]"
            >
              <option value="">All</option>
              {uniqueDestinations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Mobile Toggle */}
      {isMobile && (
        <div className="mb-3 text-center">
          <button
            onClick={() => setShowFullColumns(!showFullColumns)}
            className="px-3 py-1 bg-[#235347] text-white text-xs rounded hover:bg-[#1a3d31]"
          >
            {showFullColumns ? 'Basic' : 'Full'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto -mx-3 px-3 border rounded-lg">
        <table className="w-full min-w-[600px] text-left">
          <thead className="bg-gray-50 border-b">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-2 py-2 text-xs font-medium text-gray-700 uppercase tracking-wider text-center"
                    onClick={() => header.column.getCanSort() && table.setSorting([{ id: header.id, desc: !header.column.getIsSorted() }])}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      <span className="ml-1">{header.column.getIsSorted() === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-2 py-3 text-xs text-center">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-center text-xs text-gray-600">
        {filteredData.length} players
      </div>
    </div>
  );
};

export default PortalLanding;