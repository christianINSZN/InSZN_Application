import React, { useState, useEffect } from 'react';

const FieldView = ({
  playerId,
  year,
  onZoneSelect,
  colLabels = ['Left', 'Center', 'Right'],
  excludedMetrics = ['first_downs', 'fumbles_lost', 'longest', 'total_touches'],
  metricRenames = {
    'ypa': 'YPA',
    'yards_per_reception': 'YPC',
    'caught_percent': 'Catch %',
    'contested_catch_rate': 'Contested Catch %',
    'drop_rate': 'Drop Rate'
  }
}) => {
  const [selectedZone, setSelectedZone] = useState(null);
  const [depthData, setDepthData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('');
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    if (playerId && year) {
      fetch(`${process.env.REACT_APP_API_URL}/api/player_receiving_season_depth/${playerId}/${year}`)
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then(data => {
          console.log('Fetched depth data:', data);
          setDepthData(data);
        })
        .catch(error => console.error('Error fetching receiving depth data:', error));
    }
  }, [playerId, year]);

  const zones = [
    ['left_deep', 'center_deep', 'right_deep'],
    ['left_medium', 'center_medium', 'right_medium'],
    ['left_short', 'center_short', 'right_short'],
    ['left_behind_los', 'center_behind_los', 'right_behind_los'],
  ];
  const rowLabels = ['Deep', 'Medium', 'Short', 'BLOS'];

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    if (onZoneSelect && selectedMetric) {
      onZoneSelect({ zone, metric: selectedMetric });
    }
  };

  const getAvailableMetrics = () => {
    if (!depthData || typeof depthData !== 'object') return [];
    const metricSet = new Set();
    Object.keys(depthData).forEach(key => {
      const match = key.match(/^(left|center|right)_(deep|medium|short|behind_los)_([a-z_]+)$/);
      if (match && !excludedMetrics.includes(match[3])) {
        metricSet.add(match[3]);
      }
    });
    return Array.from(metricSet).sort();
  };

  const formatMetric = (metric) => {
    if (!metric) return 'Select Metric';
    return metricRenames[metric] || metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getValue = (zone) => {
    if (!depthData || !selectedMetric) return null;
    const valueKey = `${zone}_${selectedMetric}`;
    const value = depthData[valueKey];
    console.log(`Value for ${zone} with ${selectedMetric}: ${value}`);
    return value !== undefined && !isNaN(value) ? value : null;
  };

  const getMetricRange = () => {
    if (!depthData || !selectedMetric) return { min: 0, max: 100 };
    const values = zones.flat().map(zone => getValue(zone)).filter(v => v !== null);
    return values.length > 0 ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 100 };
  };

  const getBackgroundColor = (value) => {
    const { min, max } = getMetricRange();
    if (value === null || min === max) return { backgroundColor: 'rgba(35, 83, 71, 0.2)' };
    const normalized = Math.min(max, Math.max(min, value));
    const opacity = 0.2 + (0.7 * (normalized - min)) / (max - min);
    return { backgroundColor: `rgba(35, 83, 71, ${opacity.toFixed(2)})` };
  };

  return (
    <div className="bg-white rounded-lg shadow h-full">
      <h2 className="flex items-center justify-center text-base sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-[40px] rounded">FieldView</h2>
      <div className="mb-2 mt-2 px-2 sm:ml-36 sm:px-4">
        <select
          id="metric-select"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="w-full sm:w-auto p-1 sm:p-2 border border-gray-300 rounded text-sm sm:text-base text-center"
        >
          <option value="" disabled>Select Metric</option>
          {getAvailableMetrics().map(metric => (
            <option key={metric} value={metric}>{formatMetric(metric)}</option>
          ))}
        </select>
      </div>
      {isMobile ? (
        <div className="space-y-2 px-2">
          {rowLabels.map((rowLabel, rowIndex) => (
            <div key={rowIndex} className="space-y-1">
              <div className="text-center font-medium text-gray-700 text-xs">{rowLabel}</div>
              <div className="grid grid-cols-3 gap-0">
                {colLabels.map((colLabel, colIndex) => (
                  <div key={colIndex} className="text-center font-medium text-gray-700 text-xs p-1">
                    {colLabel}
                  </div>
                ))}
                {zones[rowIndex].map((zone, colIndex) => {
                  const value = getValue(zone);
                  const backgroundStyle = getBackgroundColor(value);
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`border-2 p-0.5 flex justify-center items-center text-xs font-bold cursor-pointer text-gray-100 h-16 ${selectedZone === zone ? 'border-black' : 'border-white'}`}
                      style={{ ...backgroundStyle }}
                      onClick={() => handleZoneClick(zone)}
                    >
                      {value !== null ? value.toFixed(1) : 'N/A'}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center font-medium text-gray-700 pl-8 text-lg">
            {colLabels.map((label, index) => (
              <div key={index} className="p-2">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-0 h-4/5 mr-4">
            {rowLabels.map((label, index) => (
              <div
                key={index}
                className="flex items-center justify-center text-gray-700 font-medium p-2 pr-8 text-lg"
                style={{
                  width: '2rem',
                  height: '8rem',
                  marginRight: '-0.5rem',
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
            ))}
            {zones.map((row, rowIndex) =>
              row.map((zone, colIndex) => {
                const value = getValue(zone);
                const backgroundStyle = getBackgroundColor(value);
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`border-2 p-8 flex justify-center items-center text-lg font-bold cursor-pointer text-gray-100 ${selectedZone === zone ? 'border-black' : 'border-white'}`}
                    style={{ ...backgroundStyle, gridRow: rowIndex + 1, gridColumn: colIndex + 2 }}
                    onClick={() => handleZoneClick(zone)}
                  >
                    {value !== null ? value.toFixed(1) : 'N/A'}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
      <div className="mt-2 text-sm sm:text-lg text-gray-800 text-center font-bold px-2 sm:px-4">
        <p>Selected Metric: {formatMetric(selectedMetric)}</p>
      </div>
    </div>
  );
};

export default FieldView;