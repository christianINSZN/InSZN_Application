import React, { useEffect, useRef, useState, useContext } from 'react';
import Chart from 'chart.js/auto';
import { WeeklyGradesContext } from '../FieldView';

const MetricChart = ({ playerId, year, selectedZone, selectedMetric, selectedDistance, teamGames }) => {
  const chartRef = useRef(null);
  const weeklyGrades = useContext(WeeklyGradesContext) || {};
  const [compareMode, setCompareMode] = useState('position'); // 'position' or 'distance'

  const formatMetric = (metric) => {
    return metric
      ? metric
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : 'Unknown';
  };

  const formatZoneOrDistance = (value) => {
    if (!value) return 'Unknown';
    if (value === 'behind_los') return 'Behind LOS';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  useEffect(() => {
    let chartInstance = chartRef.current ? chartRef.current.chart : null;
    if (chartInstance) {
      chartInstance.destroy();
      console.log('Previous chart destroyed');
    }

    const ctx = document.getElementById('metricChart')?.getContext('2d');
    if (!ctx) {
      console.warn('Canvas not available for metricChart');
      return;
    }

    // Debug canvas dimensions
    console.log('Canvas dimensions:', { width: ctx.canvas.width, height: ctx.canvas.height });

    // Create opponent lookup
    const opponentLookup = teamGames.reduce((acc, game) => {
      const key = `${game.week}_${game.seasonType}`;
      const playerTeam = game.team;
      const opponent = playerTeam === game.homeTeam ? `vs. ${game.awayTeamAbrev}` : `at ${game.homeTeamAbrev}`;
      acc[key] = { opponent, startDate: game.startDate };
      return acc;
    }, {});

    // Sort games by startDate
    const sortedGames = [...teamGames].sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return isNaN(dateA) || isNaN(dateB) ? a.week - b.week : dateA - dateB;
    });

    // Prepare labels
    const labels = sortedGames.map(game => {
      const key = `${game.week}_${game.seasonType}`;
      return opponentLookup[key]?.opponent || `Week ${game.week} (${game.seasonType})`;
    });

    // Debug labels
    console.log('X-axis labels:', labels);

    // Define zones and distances
    const zones = ['left', 'center', 'right'];
    const distances = ['behind_los', 'short', 'medium', 'deep'];
    const selectedZoneLower = selectedZone?.toLowerCase() || 'left';
    const selectedDistanceLower = selectedDistance?.toLowerCase() || 'deep';
    const formattedMetric = formatMetric(selectedMetric);

    // Prepare datasets based on compareMode
    let datasets = [];
    if (compareMode === 'position') {
      const selectedIndex = zones.indexOf(selectedZoneLower);
      const otherZones = [zones[(selectedIndex + 1) % 3], zones[(selectedIndex + 2) % 3]];
      datasets = [
        {
          label: `${formatZoneOrDistance(selectedZoneLower)} ${formatZoneOrDistance(selectedDistance)} ${formattedMetric} (Selected)`,
          data: sortedGames.map(game => {
            const key = `${game.week}_${game.seasonType}`;
            const weekData = weeklyGrades[key] || {};
            const metricKey = `${selectedZoneLower}_${selectedDistanceLower}_${selectedMetric}`;
            return weekData[metricKey] !== undefined && weekData[metricKey] !== null ? weekData[metricKey] : null;
          }),
          borderColor: 'rgba(75, 192, 192, 1)', // Teal
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: `${formatZoneOrDistance(otherZones[0])} ${formatZoneOrDistance(selectedDistance)} ${formattedMetric}`,
          data: sortedGames.map(game => {
            const key = `${game.week}_${game.seasonType}`;
            const weekData = weeklyGrades[key] || {};
            const metricKey = `${otherZones[0]}_${selectedDistanceLower}_${selectedMetric}`;
            return weekData[metricKey] !== undefined && weekData[metricKey] !== null ? weekData[metricKey] : null;
          }),
          borderColor: 'rgba(255, 99, 132, 0.5)', // Red
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: false,
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: `${formatZoneOrDistance(otherZones[1])} ${formatZoneOrDistance(selectedDistance)} ${formattedMetric}`,
          data: sortedGames.map(game => {
            const key = `${game.week}_${game.seasonType}`;
            const weekData = weeklyGrades[key] || {};
            const metricKey = `${otherZones[1]}_${selectedDistanceLower}_${selectedMetric}`;
            return weekData[metricKey] !== undefined && weekData[metricKey] !== null ? weekData[metricKey] : null;
          }),
          borderColor: 'rgba(54, 162, 235, 0.5)', // Blue
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: false,
          tension: 0.2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ];
    } else {
      datasets = distances.map((distance, index) => ({
        label: `${formatZoneOrDistance(distance)} ${formatZoneOrDistance(selectedZone)} ${formattedMetric} ${distance === selectedDistanceLower ? '(Selected)' : ''}`,
        data: sortedGames.map(game => {
          const key = `${game.week}_${game.seasonType}`;
          const weekData = weeklyGrades[key] || {};
          const metricKey = `${selectedZoneLower}_${distance}_${selectedMetric}`;
          return weekData[metricKey] !== undefined && weekData[metricKey] !== null ? weekData[metricKey] : null;
        }),
        borderColor: [
          'rgba(75, 192, 192, 1)', // Teal
          'rgba(255, 99, 132, 0.5)', // Red
          'rgba(54, 162, 235, 0.5)', // Blue
          'rgba(255, 159, 64, 0.5)', // Orange
        ][index],
        backgroundColor: [
          'rgba(75, 192, 192, 0.2)',
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 159, 64, 0.2)',
        ][index],
        fill: distance === selectedDistanceLower,
        tension: 0.2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }));
    }

    // Calculate dynamic y-axis range
    const allData = datasets.flatMap(dataset => dataset.data).filter(value => value !== null && !isNaN(value));
    const minValue = allData.length ? Math.min(...allData) : 0;
    const maxValue = allData.length ? Math.max(...allData) : 100;
    const buffer = (maxValue - minValue) * 0.1;
    const yMin = Math.max(0, minValue - buffer);
    const yMax = maxValue + buffer;

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: {
        scales: {
          x: {
            title: { display: true, text: '', font: { size: 12 } },
            ticks: { 
              autoSkip: true, 
              maxRotation: 45, 
              minRotation: 45,
              padding: 25, // Increased padding
              font: { size: 8 }, // Smaller font
            },
            grid: { display: false },
          },
          y: {
            title: { display: true, text: 'Metric Value', font: { size: 12 } },
            beginAtZero: true,
            min: yMin,
            max: yMax,
            ticks: { stepSize: (yMax - yMin) / 5, font: { size: 10 } },
          },
        },
        plugins: {
          legend: { 
            display: true, 
            position: 'top',
            labels: {
              boxWidth: 20,
              padding: 10,
              font: { size: 10 },
            },
          },
          tooltip: { mode: 'index', intersect: false },
        },
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            bottom: 50, // Increased bottom padding
            top: 20, // Space for legend
            left: 10,
            right: 10,
          },
        },
      },
    });
    chartRef.current = { chart: chartInstance };

    // Debug chart rendering
    console.log('Chart created with data:', { labels, datasets });
    console.log('Canvas dimensions after render:', { width: ctx.canvas.width, height: ctx.canvas.height });

    return () => {
      if (chartInstance) chartInstance.destroy();
      console.log('Chart destroyed on cleanup');
    };
  }, [selectedZone, selectedMetric, selectedDistance, weeklyGrades, teamGames, compareMode]);

  return (
    <div className="bg-white rounded-lg shadow" style={{ height: '450px' }}>
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Game-Level Composition by Depth and Position</h2>
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
          Compare Across Field Position
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
      <div style={{ height: '450px', padding: '10px' }}>
        <canvas id="metricChart" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default MetricChart;