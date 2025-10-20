import React, { useEffect, useRef, useState, useContext } from 'react';
import Chart from 'chart.js/auto';
import { WeeklyGradesContext } from '../FieldView';

const GameLogPassing = ({
  playerId,
  year,
  weeklyGrades,
  teamGames,
  allPlayerPercentiles,
  selectedZone,
  selectedMetric,
  selectedDistance,
  excludedMetrics = ['bats', 'pressure_to_sack_rate', 'sack_percent', 'sacks', 'scrambles', 'spikes', 'thrown_aways'],
  metricRenames = {
    'ypa': 'YPA',
    'btt_rate': 'Big Time Throw Rate',
    'qb_rating': 'QB Rating',
    'twp_rate': 'Turnover Worthy Play Rate'
  }
}) => {
  const distanceChartRef = useRef(null);
  const positionChartRef = useRef(null);
  const weeklyGradesContext = useContext(WeeklyGradesContext) || {};
  const [distanceData, setDistanceData] = useState([]);
  const [positionData, setPositionData] = useState([]);
  const distances = ['behind_los', 'short', 'medium', 'deep'];
  const positions = ['left', 'center', 'right'];
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    if (distanceChartRef.current?.chart) {
      distanceChartRef.current.chart.destroy();
    }
    if (positionChartRef.current?.chart) {
      positionChartRef.current.chart.destroy();
    }

    const distanceTotals = distances.map(distance => {
      let total = 0;
      let count = 0;
      positions.forEach(position => {
        teamGames.forEach(game => {
          const key = `${game.week}_${game.seasonType}`;
          const weekData = weeklyGradesContext[key] || {};
          const metricKey = `${position}_${distance}_${selectedMetric}`;
          const value = weekData[metricKey];
          if (value !== undefined && value !== null && !isNaN(value)) {
            total += Number(value);
            count++;
          }
        });
      });
      return count > 0 ? total / count : 0;
    });

    const totalDistanceValue = distanceTotals.reduce((sum, value) => sum + value, 0);
    const newDistanceData = distanceTotals.map(value =>
      totalDistanceValue > 0 ? (value / totalDistanceValue) * 100 : 0
    );

    const positionTotals = positions.map(position => {
      let total = 0;
      let count = 0;
      distances.forEach(distance => {
        teamGames.forEach(game => {
          const key = `${game.week}_${game.seasonType}`;
          const weekData = weeklyGradesContext[key] || {};
          const metricKey = `${position}_${distance}_${selectedMetric}`;
          const value = weekData[metricKey];
          if (value !== undefined && value !== null && !isNaN(value)) {
            total += Number(value);
            count++;
          }
        });
      });
      return count > 0 ? total / count : 0;
    });

    const totalPositionValue = positionTotals.reduce((sum, value) => sum + value, 0);
    const newPositionData = positionTotals.map(value =>
      totalPositionValue > 0 ? (value / totalPositionValue) * 100 : 0
    );

    setDistanceData(newDistanceData);
    setPositionData(newPositionData);

    const colors = [
      'rgba(171, 62, 86, 0.8)', // Red
      'rgba(41, 121, 175, 0.8)', // Blue
      'rgba(46, 123, 123, 0.8)', // Teal
      'rgba(193, 121, 49, 0.8)', // Orange
    ];

    const formattedMetric = metricRenames[selectedMetric] || selectedMetric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const distanceCtx = document.getElementById('distanceDonutChart')?.getContext('2d');
    if (distanceCtx) {
      distanceChartRef.current = {
        chart: new Chart(distanceCtx, {
          type: 'doughnut',
          data: {
            labels: distances.map(d => d.charAt(0).toUpperCase() + d.slice(1).replace('_', ' ')),
            datasets: [{
              data: newDistanceData,
              backgroundColor: colors.slice(0, distances.length),
              borderColor: colors.slice(0, distances.length).map(c => c.replace('0.8', '1')),
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { font: { size: isMobile ? 10 : 12 } } },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.label}: ${context.raw.toFixed(1)}%`,
                },
              },
              title: {
                display: true,
                text: 'Rate (%) by Field Depth',
                position: 'top',
                font: { size: isMobile ? 12 : 14, weight: 'bold' },
                color: 'rgba(55, 65, 81, 1)',
              },
            },
            cutout: isMobile ? '60%' : '70%',
          },
          plugins: isMobile ? [] : [{
            id: 'centerText',
            beforeDraw(chart) {
              const { ctx, width, height } = chart;
              ctx.save();
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = "18px system-ui";
              ctx.fillStyle = 'rgba(55, 65, 81, 1)';
              ctx.fillText(formattedMetric, width / 2, height / 1.72);
              ctx.restore();
            },
          }],
        }),
      };
    }

    const positionCtx = document.getElementById('positionDonutChart')?.getContext('2d');
    if (positionCtx) {
      positionChartRef.current = {
        chart: new Chart(positionCtx, {
          type: 'doughnut',
          data: {
            labels: positions.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
            datasets: [{
              data: newPositionData,
              backgroundColor: colors.slice(0, positions.length),
              borderColor: colors.slice(0, positions.length).map(c => c.replace('0.8', '1')),
              borderWidth: 1,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { font: { size: isMobile ? 10 : 12 } } },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.label}: ${context.raw.toFixed(1)}%`,
                },
              },
              title: {
                display: true,
                text: 'Rate (%) by Field Orientation',
                position: 'top',
                font: { size: isMobile ? 12 : 14, weight: 'bold' },
                color: 'rgba(35, 83, 71, 1)',
              },
            },
            cutout: isMobile ? '60%' : '70%',
          },
          plugins: isMobile ? [] : [{
            id: 'centerText',
            beforeDraw(chart) {
              const { ctx, width, height } = chart;
              ctx.save();
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = "18px system-ui";
              ctx.fillStyle = 'rgba(35, 83, 71, 1)';
              ctx.fillText(formattedMetric, width / 2, height / 1.72);
              ctx.restore();
            },
          }],
        }),
      };
    }

    return () => {
      if (distanceChartRef.current?.chart) distanceChartRef.current.chart.destroy();
      if (positionChartRef.current?.chart) positionChartRef.current.chart.destroy();
    };
  }, [weeklyGradesContext, teamGames, selectedMetric]);

  return (
    <div className="bg-white rounded-lg shadow">
      <h2 className="flex items-center justify-center text-base sm:text-lg bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-8 sm:h-10 rounded">Rates by Field Depth and Orientation</h2>
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-4 h-auto sm:h-88 w-full">
        <div className="bg-gray-0 p-2 sm:p-4 rounded shadow h-64 sm:h-full">
          {distanceData.length && distanceData.some(v => v > 0) ? (
            <canvas id="distanceDonutChart" className="w-full h-full" />
          ) : (
            <p className="text-xs sm:text-sm text-gray-500 text-center">No data available for Distance Breakdown</p>
          )}
        </div>
        <div className="bg-gray-0 p-2 sm:p-4 rounded shadow h-64 sm:h-full">
          {positionData.length && positionData.some(v => v > 0) ? (
            <canvas id="positionDonutChart" className="w-full h-full" />
          ) : (
            <p className="text-xs sm:text-sm text-gray-500 text-center">No data available for Position Breakdown</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameLogPassing;