import React, { useEffect, useRef, useState, useContext } from 'react';
import Chart from 'chart.js/auto';
import { WeeklyGradesContext } from '../FieldView';

const MetricChart = ({
  playerId,
  year,
  selectedZone,
  selectedMetric,
  selectedDistance,
  teamGames,
  excludedMetrics = ['bats', 'pressure_to_sack_rate', 'sack_percent', 'sacks', 'scrambles', 'spikes', 'thrown_aways'],
  metricRenames = {
    'ypa': 'YPA',
    'btt_rate': 'Big Time Throw Rate',
    'qb_rating': 'QB Rating',
    'twp_rate': 'Turnover Worthy Play Rate'
  }
}) => {
  const chartRef = useRef(null);
  const weeklyGrades = useContext(WeeklyGradesContext) || {};
  const [compareMode, setCompareMode] = useState('position');
  const isMobile = window.innerWidth < 640;
  const colors = [
    'rgba(75, 192, 192, 1)', // Teal (main dataset)
    'rgba(255, 99, 132, 1)', // Red
    'rgba(54, 162, 235, 1)', // Blue
    'rgba(255, 159, 64, 1)', // Orange
    'rgba(153, 102, 255, 1)', // Purple
  ];

  const formatMetric = (metric) => {
    if (!metric) return 'Unknown';
    return metricRenames[metric] || metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatZoneOrDistance = (value) => {
    if (!value) return 'Unknown';
    if (value === 'behind_los') return 'Behind LOS';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  useEffect(() => {
    if (!teamGames || teamGames.length === 0) {
      console.warn('teamGames is empty or not iterable, using empty dataset');
      return;
    }

    if (chartRef.current?.chart) {
      chartRef.current.chart.destroy();
      console.log('Previous chart destroyed');
    }

    const ctx = document.getElementById('metricChart')?.getContext('2d');
    if (!ctx) {
      console.warn('Canvas not available for metricChart');
      return;
    }

    const opponentLookup = teamGames.reduce((acc, game) => {
      const key = `${game.week}_${game.seasonType}`;
      const playerTeam = game.team;
      const opponent = playerTeam === game.homeTeam ? `vs. ${game.awayTeamAbrev}` : `at ${game.homeTeamAbrev}`;
      acc[key] = { opponent, startDate: game.startDate };
      return acc;
    }, {});

    const sortedGames = [...teamGames].sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return isNaN(dateA) || isNaN(dateB) ? a.week - b.week : dateA - dateB;
    });

    const labels = sortedGames.map(game => {
      const key = `${game.week}_${game.seasonType}`;
      return opponentLookup[key]?.opponent || `Week ${game.week} (${game.seasonType})`;
    });

    const zones = ['left', 'center', 'right'];
    const distances = ['behind_los', 'short', 'medium', 'deep'];
    const selectedZoneLower = selectedZone?.toLowerCase() || 'left';
    const selectedDistanceLower = selectedDistance?.toLowerCase() || 'deep';
    const formattedMetric = formatMetric(selectedMetric);

    let datasets = [];
    if (compareMode === 'position') {
      const selectedIndex = zones.indexOf(selectedZoneLower);
      const otherZones = [zones[(selectedIndex + 1) % 3], zones[(selectedIndex + 2) % 3]];
      datasets = [
        {
          label: `${formatZoneOrDistance(selectedZoneLower)} ${formatZoneOrDistance(selectedDistanceLower)} ${formattedMetric} (Selected)`,
          data: sortedGames.map(game => {
            const key = `${game.week}_${game.seasonType}`;
            const weekData = weeklyGrades[key] || {};
            const metricKey = `${selectedZoneLower}_${selectedDistanceLower}_${selectedMetric}`;
            return weekData[metricKey] !== undefined && weekData[metricKey] !== null ? weekData[metricKey] : null;
          }),
          borderColor: colors[0],
          backgroundColor: colors[0].replace('1)', '0.2)'),
          fill: true,
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: `${formatZoneOrDistance(otherZones[0])} ${formatZoneOrDistance(selectedDistanceLower)} ${formattedMetric}`,
          data: sortedGames.map(game => {
            const key = `${game.week}_${game.seasonType}`;
            const weekData = weeklyGrades[key] || {};
            const metricKey = `${otherZones[0]}_${selectedDistanceLower}_${selectedMetric}`;
            return weekData[metricKey] !== undefined && weekData[metricKey] !== null ? weekData[metricKey] : null;
          }),
          borderColor: colors[1].replace('1)', '0.5)'),
          backgroundColor: colors[1].replace('1)', '0.2)'),
          fill: false,
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: `${formatZoneOrDistance(otherZones[1])} ${formatZoneOrDistance(selectedDistanceLower)} ${formattedMetric}`,
          data: sortedGames.map(game => {
            const key = `${game.week}_${game.seasonType}`;
            const weekData = weeklyGrades[key] || {};
            const metricKey = `${otherZones[1]}_${selectedDistanceLower}_${selectedMetric}`;
            return weekData[metricKey] !== undefined && weekData[metricKey] !== null ? weekData[metricKey] : null;
          }),
          borderColor: colors[2].replace('1)', '0.5)'),
          backgroundColor: colors[2].replace('1)', '0.2)'),
          fill: false,
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ];
    } else {
      datasets = distances.map((distance, index) => ({
        label: `${formatZoneOrDistance(selectedZoneLower)} ${formatZoneOrDistance(distance)} ${formattedMetric} ${distance === selectedDistanceLower ? '(Selected)' : ''}`,
        data: sortedGames.map(game => {
          const key = `${game.week}_${game.seasonType}`;
          const weekData = weeklyGrades[key] || {};
          const metricKey = `${selectedZoneLower}_${distance}_${selectedMetric}`;
          return weekData[metricKey] !== undefined && weekData[metricKey] !== null ? weekData[metricKey] : null;
        }),
        borderColor: colors[index].replace('1)', distance === selectedDistanceLower ? '1)' : '0.5)'),
        backgroundColor: colors[index].replace('1)', '0.2)'),
        fill: distance === selectedDistanceLower,
        tension: 0.2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }));
    }

    const allData = datasets.flatMap(dataset => dataset.data).filter(value => value !== null && !isNaN(value));
    const minValue = allData.length ? Math.min(...allData) : 0;
    const maxValue = allData.length ? Math.max(...allData) : 100;
    const buffer = (maxValue - minValue) * 0.0;
    const yMin = Math.max(0, minValue - buffer);
    const yMax = maxValue + buffer;

    const chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: {
        scales: {
          x: {
            title: { display: false, text: 'Opponent' },
            ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, labelOffset: 10 },
          },
          y: {
            title: { display: true, text: formatMetric(selectedMetric) },
            beginAtZero: true,
            min: yMin,
            max: yMax,
            ticks: { stepSize: (yMax - yMin) / 5 },
          },
        },
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { size: isMobile ? 10 : 12 } } },
          tooltip: { mode: 'index', intersect: false },
          title: {
            display: true,
            text: `Game-Level ${formatMetric(selectedMetric)} by ${compareMode === 'position' ? 'Field Orientation' : 'Field Depth'}`,
            font: { size: isMobile ? 14 : 16, weight: 'bold' },
            color: '#374151',
            padding: { top: 10, bottom: 10 },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    chartRef.current = { chart: chartInstance };
    console.log('Chart created with data:', { labels, datasets });

    return () => {
      if (chartRef.current?.chart) {
        chartRef.current.chart.destroy();
        console.log('Chart destroyed on cleanup');
      }
    };
  }, [selectedZone, selectedMetric, selectedDistance, weeklyGrades, teamGames, compareMode]);

  return (
    <div className="bg-white rounded-lg shadow min-h-0">
      <h2 className="flex items-center justify-center text-sm sm:text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-[40px] rounded">
        Game-Level Composition by Depth and Orientation
      </h2>
      {isMobile ? (
        <div className="flex flex-col items-center gap-2 mb-2 mt-2 px-2">
          <label className="flex items-center text-sm text-gray-700">
            <input
              type="radio"
              name="compareMode"
              value="position"
              checked={compareMode === 'position'}
              onChange={() => setCompareMode('position')}
              className="mr-1 accent-[#235347]"
            />
            Compare Across Field Orientation
          </label>
          <label className="flex items-center text-sm text-gray-700">
            <input
              type="radio"
              name="compareMode"
              value="distance"
              checked={compareMode === 'distance'}
              onChange={() => setCompareMode('distance')}
              className="mr-1 accent-[#235347]"
            />
            Compare Across Field Depth
          </label>
        </div>
      ) : (
        <div className="flex justify-center items-center mb-2 mt-2">
          <label className="mr-4">
            <input
              type="radio"
              name="compareMode"
              value="position"
              checked={compareMode === 'position'}
              onChange={() => setCompareMode('position')}
              className="mr-1 accent-[#235347]"
            />
            Compare Across Field Orientation
          </label>
          <label>
            <input
              type="radio"
              name="compareMode"
              value="distance"
              checked={compareMode === 'distance'}
              onChange={() => setCompareMode('distance')}
              className="mr-1 accent-[#235347]"
            />
            Compare Across Field Depth
          </label>
        </div>
      )}
      <div className="sub-container bg-gray-0 p-2 sm:p-0 rounded shadow">
        <div style={{ height: isMobile ? '320px' : '320px', minHeight: 0, maxHeight: isMobile ? '320px' : '320px' }}>
          <canvas id="metricChart" className="w-full h-full min-h-0" />
        </div>
      </div>
    </div>
  );
};

export default MetricChart;