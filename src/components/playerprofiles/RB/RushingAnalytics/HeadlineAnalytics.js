import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const HeadlineAnalytics = ({ playerId, year, weeklyGrades, teamGames, isPopupOpen, setIsPopupOpen, setSelectedContainer, selectedContainer, percentileGrades }) => {
  const containerTitles = ['Yards', 'Total Touches', 'Yards Per Attempt', 'Longest', 'Touchdowns'];
  const chartRef = useRef(null);
  const [selectedGrade, setSelectedGrade] = useState(null);

  const handleContainerClick = (index) => {
    setSelectedContainer(containerTitles[index]);
    setSelectedGrade(containerTitles[index]);
    setIsPopupOpen(true);
  };

  const formatPercentile = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? 'N/A' : `${numValue.toFixed(2)}%`;
  };

  const getGradeValue = (gradeKey) => {
    if (!percentileGrades) return { value: 'N/A', percentile: 'N/A' };
    switch (gradeKey) {
      case 'Yards': return { value: percentileGrades.yards_rushing || 'N/A', percentile: percentileGrades.percentile_yards_rushing || 'N/A' };
      case 'Total Touches': return { value: percentileGrades.total_touches || 'N/A', percentile: percentileGrades.percentile_total_touches || 'N/A' };
      case 'Yards Per Attempt': return { value: percentileGrades.ypa || 'N/A', percentile: percentileGrades.percentile_ypa || 'N/A' };
      case 'Longest': return { value: percentileGrades.longest_rushing || 'N/A', percentile: percentileGrades.percentile_longest_rushing || 'N/A' };
      case 'Touchdowns': return { value: percentileGrades.touchdowns_rushing || 'N/A', percentile: percentileGrades.percentile_touchdowns_rushing || 'N/A' };
      default: return { value: 'N/A', percentile: 'N/A' };
    }
  };

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      console.log('Previous chart destroyed');
    }

    if (isPopupOpen && selectedGrade) {
      const canvas = document.getElementById('trendChart');
      if (!canvas || !canvas.getContext) {
        console.warn('Canvas not available for trendChart');
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!teamGames || teamGames.length === 0) {
        console.warn('teamGames is empty or not iterable, using empty dataset');
        return;
      }

      const sortedGames = [...teamGames].sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        return isNaN(dateA) || isNaN(dateB) ? a.week - b.week : dateA - dateB;
      });

      const opponentLookup = sortedGames.reduce((acc, game) => {
        const key = `${game.week}_${game.seasonType}`;
        const playerTeam = game.team;
        const opponent = playerTeam === game.homeTeam ? `vs. ${game.awayTeamAbrev}` : `at ${game.homeTeamAbrev}`;
        acc[key] = { opponent, startDate: game.startDate };
        return acc;
      }, {});

      const labels = sortedGames.map(game => {
        const key = `${game.week}_${game.seasonType}`;
        return opponentLookup[key]?.opponent || `Week ${game.week} (${game.seasonType})`;
      });

      const gradeToField = {
        'Yards': 'yards',
        'Total Touches': 'total_touches',
        'Yards Per Attempt': 'ypa',
        'Longest': 'longest',
        'Touchdowns': 'touchdowns',
      };

      const metricRanges = {
        'Yards': { min: 0, max: 200, unit: 'Yards' },
        'Total Touches': { min: 0, max: 100, unit: 'Total Touches' },
        'Yards Per Attempt': { min: 0, max: 25, unit: 'Yards' },
        'Longest': { min: 0, max: 80, unit: 'Yards' },
        'Touchdowns': { min: 0, max: 5, unit: 'TD' },
      };

      const gradeField = gradeToField[selectedGrade];
      if (!gradeField) {
        console.warn('No grade field found for', selectedGrade);
        return;
      }

      const dataValues = sortedGames.map(game => {
        const key = `${game.week}_${game.seasonType}`;
        const weekData = weeklyGrades[key] || {};
        const value = weekData[gradeField] !== undefined && weekData[gradeField] !== null ? weekData[gradeField] : null;
        console.log(`Trend data for ${key}, ${gradeField}: ${value}`);
        return value;
      });

      const allData = dataValues.filter(value => value !== null && !isNaN(value));
      const range = metricRanges[selectedGrade] || { min: 0, max: 100, unit: 'Grade' };
      const minValue = range.min;
      const maxValue = range.max;
      const buffer = (maxValue - minValue) * 0.0;
      const yMin = Math.max(0, minValue - buffer);
      const yMax = maxValue + buffer;

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: selectedGrade,
            data: dataValues,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: true,
            tension: 0.2,
            pointRadius: 5,
            pointHoverRadius: 7,
          }],
        },
        options: {
          scales: {
            x: { title: { display: false, text: 'Opponent' }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, labelOffset: 10 } },
            y: { title: { display: true, text: range.unit }, beginAtZero: true, min: yMin, max: yMax, ticks: { stepSize: (yMax - yMin) / 5 } },
          },
          plugins: { legend: { display: true, position: 'top' }, tooltip: { mode: 'index', intersect: false } },
          responsive: true,
          maintainAspectRatio: false,
        },
      });
      console.log('Line chart created successfully for', selectedGrade);
    }
  }, [isPopupOpen, selectedGrade, weeklyGrades, teamGames]);

  return (
    <div className="top-container grid grid-cols-5 gap-4">
      {containerTitles.map((title, index) => (
        <div
          key={title}
          className="bg-gray-50 p-4 rounded shadow cursor-pointer hover:bg-[#235347]/20"
          onClick={() => handleContainerClick(index)}
        >
          <h3 className="text-md font-medium text-gray-700 text-center">{title}</h3>
          <p className="text-4xl font-bold text-gray-900 text-center">{getGradeValue(title).value}</p>
          <p className="text-xs text-gray-500 text-center">Percentile: {formatPercentile(getGradeValue(title).percentile)}</p>
        </div>
      ))}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg w-3/4 h-3/4">
            <h3 className="text-lg font-semibold mb-2">{selectedContainer || 'Selected Container'}</h3>
            <div className="w-full h-5/6">
              <canvas id="trendChart" className="w-full h-full"></canvas>
            </div>
            <button
              className="mt-4 bg-red-500 text-white p-2 rounded hover:bg-red-700"
              onClick={() => setIsPopupOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadlineAnalytics;