import React, { useState, useEffect } from 'react';

const FieldView = ({ playerId, year, onZoneSelect, colLabels = ['Left', 'Center', 'Right'] }) => {
  const [selectedZone, setSelectedZone] = useState(null);
  const [depthData, setDepthData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(''); // Default to empty string for placeholder
  useEffect(() => {
    if (playerId && year) {
      fetch(`${process.env.REACT_APP_API_URL}/api/player_passing_season_depth/${playerId}/${year}`)
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          return response.json();
        })
        .then(data => {
          console.log('Fetched depth data:', data);
          setDepthData(data);
        })
        .catch(error => console.error('Error fetching passing depth data:', error));
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
    if (onZoneSelect && selectedMetric) { // Only call if a valid metric is selected
      onZoneSelect({ zone, metric: selectedMetric });
    }
  };

  const getAvailableMetrics = () => {
    if (!depthData) return [];
    const metricSet = new Set();
    Object.keys(depthData).forEach(key => {
      const match = key.match(/^(left|center|right)_(deep|medium|short|behind_los)_([a-z_]+)$/);
      if (match) metricSet.add(match[3]);
    });
    return Array.from(metricSet);
  };

  const formatMetric = (metric) => {
    if (!metric) return 'Select Metric'; // Handle placeholder
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatZone = (zone) => {
    if (!zone) return 'None';
    const [position, distance] = zone.split('_');
    const formattedPosition = position.charAt(0).toUpperCase() + position.slice(1);
    const formattedDistance = distance === 'behind_los' ? 'Behind LOS' : distance.charAt(0).toUpperCase() + distance.slice(1);
    return `${formattedPosition} ${formattedDistance}`;
  };

  const getValue = (zone) => {
    if (!depthData || !selectedMetric) return null; // Handle no metric selected
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
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">FieldView</h2>
      {/* Metric Dropdown */}
      <div className="mb-2 mt-2">
        <label htmlFor="metric-select" className="text-gray-700 ml-36"></label>
        <select
          id="metric-select"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="p-2 border border-gray-300 rounded text-center"
        >
          <option value="" disabled>Select Metric</option>
          {getAvailableMetrics().map(metric => (
            <option key={metric} value={metric}>{formatMetric(metric)}</option>
          ))}
        </select>
      </div>
      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 text-center font-medium text-gray-700 pl-8 text-lg">
        {colLabels.map((label, index) => (
          <div key={index} className="p-2">
            {label}
          </div>
        ))}
      </div>
      {/* Grid with Row Labels and Cells */}
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
                className={`border-0 border-gray-0 p-8 flex justify-center items-center text-lg font-bold cursor-pointer text-gray-100 ${
                  selectedZone === zone ? 'bg-blue-200' : ''
                }`}
                style={{ ...backgroundStyle, gridRow: rowIndex + 1, gridColumn: colIndex + 2 }}
                onClick={() => handleZoneClick(zone)}
              >
                {value !== null ? value.toFixed(1) : 'N/A'}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-2 text-lg text-gray-800 text-center text-bold">
        <p>Selected Zone: {formatZone(selectedZone)}</p>
        <p>Selected Metric: {formatMetric(selectedMetric)}</p>
      </div>
    </div>
  );
};

export default FieldView;