// src/components/portal/PortalLanding.js
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReactTable, getCoreRowModel, getSortedRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';

const PortalLanding = ({ className = "text-sm sm:text-base" }) => {
  const [portalData, setPortalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [showFullColumns, setShowFullColumns] = useState(false);

  const isMobile = window.innerWidth < 640;
  const headshotSize = isMobile ? 40 : 36;

  const formatHeight = (inches) => {
    if (!inches) return 'N/A';
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
  // Filters
  // -------------------------------------------------------------------
  const uniquePositions = useMemo(() => {
    return [...new Set(portalData.map(p => p.position).filter(Boolean))].sort();
  }, [portalData]);

  const filteredData = useMemo(() => {
    return portalData.filter(p => {
      const nameMatch = !filterName || p.name.toLowerCase().includes(filterName.toLowerCase());
      const posMatch = !filterPosition || p.position === filterPosition;
      return nameMatch && posMatch;
    });
  }, [portalData, filterName, filterPosition]);

  // -------------------------------------------------------------------
  // Table columns
  // -------------------------------------------------------------------
  const columnHelper = createColumnHelper();

  const columns = useMemo(() => [
    // Headshot
    columnHelper.accessor('headshotURL', {
      id: 'Headshot',
      enableSorting: false,
      cell: ({ row }) => (
        row.original.headshotURL ? (
          <img
            src={row.original.headshotURL}
            alt={row.original.name}
            className={`w-${headshotSize/4} h-${headshotSize/3} mr-2 inline-block rounded-full object-cover`}
            onError={(e) => { e.target.src = 'https://a.espncdn.com/i/headshots/nophoto.png'; }}
          />
        ) : (
          <img
            src="https://a.espncdn.com/i/headshots/nophoto.png"
            alt="No headshot"
            className={`w-${headshotSize/4} h-${headshotSize/3} mr-2 inline-block rounded-full`}
          />
        )
      ),
      meta: { mobileHidden: false },
    }),

    // Player Name + Link
    columnHelper.accessor('name', {
      id: 'Player',
      enableSorting: true,
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
          <span className="font-medium">
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
      meta: { mobileHidden: false },
    }),

    // Origin → Destination
    columnHelper.accessor(row => `${row.origin} → ${row.destination || '—'}`, {
      id: 'Transfer',
      header: 'Transfer',
      enableSorting: true,
      cell: info => info.getValue(),
      meta: { mobileHidden: false },
    }),

    // Position
    columnHelper.accessor('position', {
      id: 'POS',
      enableSorting: true,
      cell: info => info.getValue() || '—',
      meta: { mobileHidden: true },
    }),

    // Height / Weight
    columnHelper.accessor('height', {
      id: 'HT',
      enableSorting: true,
      cell: info => formatHeight(info.getValue()),
      meta: { mobileHidden: true },
    }),
    columnHelper.accessor('weight', {
      id: 'WT',
      enableSorting: true,
      cell: info => info.getValue() || '—',
      meta: { mobileHidden: true },
    }),

    // Hometown
    columnHelper.accessor(row => `${row.homeCity || ''}, ${row.homeState || ''}`.trim(), {
      id: 'Hometown',
      header: 'Hometown',
      enableSorting: true,
      cell: info => info.getValue() || '—',
      meta: { mobileHidden: true },
    }),

    // Eligibility
    columnHelper.accessor('eligibility', {
      id: 'Eligibility',
      enableSorting: true,
      cell: info => info.getValue() || '—',
      meta: { mobileHidden: true },
    }),
  ], [headshotSize]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { sorting: [{ id: 'Transfer', desc: true }] },
  });

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  if (loading) return <div className={`p-4 text-gray-500 ${className}`}>Loading transfer portal...</div>;
  if (error) return <div className={`p-4 text-red-500 ${className}`}>Error: {error}</div>;

  const renderTable = (full = false) => {
    const visible = full ? columns : columns.filter(c => !c.meta?.mobileHidden);
    return (
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-white z-10">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.filter(h => visible.includes(h.column)).map(header => (
                <th
                  key={header.id}
                  className={`p-1 text-xs sm:text-sm font-semibold border-b border-gray-400 text-gray-800 cursor-pointer`}
                  style={{ textAlign: ['Headshot', 'Player', 'Transfer', 'Hometown'].includes(header.id) ? 'left' : 'center' }}
                  onClick={() => header.column.getCanSort() && table.setSorting([{ id: header.id, desc: !header.column.getIsSorted() }])}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() && (header.column.getIsSorted() === 'desc' ? ' ↓' : ' ↑')}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr key={row.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              {row.getVisibleCells().filter(cell => visible.some(c => c.id === cell.column.id)).map(cell => (
                <td
                  key={cell.id}
                  className={`p-1 text-xs sm:text-sm border-b border-gray-300`}
                  style={{ textAlign: ['Headshot', 'Player', 'Transfer', 'Hometown'].includes(cell.column.id) ? 'left' : 'center' }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className={`w-full p-2 sm:p-4 bg-white rounded-lg shadow-xl ${className}`}>
      {/* Title */}
      <div className="flex items-center justify-center mb-4 p-3 bg-[#235347] text-white rounded-t-lg">
        <h1 className="text-lg sm:text-xl font-bold">2025 Transfer Portal</h1>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-100 p-3 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Player</label>
          <input
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            placeholder="e.g. TJ Jones"
            className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#235347]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Position</label>
          <select
            value={filterPosition}
            onChange={e => setFilterPosition(e.target.value)}
            className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#235347]"
          >
            <option value="">All Positions</option>
            {uniquePositions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Toggle */}
      {isMobile && (
        <button
          onClick={() => setShowFullColumns(!showFullColumns)}
          className="mb-2 w-full bg-[#235347] text-white py-1.5 rounded text-sm hover:bg-[#1b3e32]"
        >
          {showFullColumns ? 'Basic View' : 'Full View'}
        </button>
      )}

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        {renderTable(!isMobile || showFullColumns)}
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        {filteredData.length} players shown
      </div>
    </div>
  );
};

export default PortalLanding;