import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const HeadlineAnalytics = ({
  playerId,
  year,
  weeklyGrades,
  teamGames,
  isPopupOpen,
  setIsPopupOpen,
  setSelectedContainer,
  selectedContainer,
  percentileGrades,
  className = "text-sm sm:text-base"
}) => {
  const containerTitles = ['Yards', 'Receptions', 'Yards Per Reception', 'Caught (%)', 'Touchdowns'];
  const chartRef = useRef(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const isMobile = window.innerWidth < 640;

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
      case 'Yards': return { value: percentileGrades.yards || 'N/A', percentile: percentileGrades.percentile_yards || 'N/A' };
      case 'Receptions': return { value: percentileGrades.receptions || 'N/A', percentile: percentileGrades.percentile_receptions || 'N/A' };
      case 'Yards Per Reception': return { value: percentileGrades.yards_per_reception || 'N/A', percentile: percentileGrades.percentile_yards_per_reception || 'N/A' };
      case 'Caught (%)': return { value: percentileGrades.caught_percent || 'N/A', percentile: percentileGrades.percentile_caught_percent || 'N/A' };
      case 'Touchdowns': return { value: percentileGrades.touchdowns || 'N/A', percentile: percentileGrades.percentile_touchdowns || 'N/A' };
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
        'Receptions': 'receptions',
        'Yards Per Reception': 'yards_per_reception',
        'Caught (%)': 'caught_percent',
        'Touchdowns': 'touchdowns',
      };

      const metricRanges = {
        'Yards': { min: 0, max: 600, unit: 'Yards' },
        'Receptions': { min: 0, max: 20, unit: 'Receptions' },
        'Yards Per Reception': { min: 0, max: 25, unit: 'Yards' },
        'Caught (%)': { min: 0, max: 100, unit: 'Percent' },
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
            x: {
              title: { display: false, text: 'Opponent' },
              ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, labelOffset: 10, font: { size: isMobile ? 10 : 12 } },
            },
            y: {
              title: { display: true, text: range.unit, font: { size: isMobile ? 12 : 14 } },
              beginAtZero: true,
              min: yMin,
              max: yMax,
              ticks: { stepSize: (yMax - yMin) / 5, font: { size: isMobile ? 10 : 12 } },
            },
          },
          plugins: { legend: { display: true, position: 'top', labels: { font: { size: isMobile ? 10 : 12 } } }, tooltip: { mode: 'index', intersect: false } },
          responsive: true,
          maintainAspectRatio: false,
        },
      });
      console.log('Line chart created successfully for', selectedGrade);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        console.log('Chart destroyed on cleanup');
      }
    };
  }, [isPopupOpen, selectedGrade, weeklyGrades, teamGames, isMobile]);

  return (
    <div className={`top-container grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 ${className}`}>
      {containerTitles.map((title, index) => (
        <div
          key={title}
          className="bg-gray-50 p-2 sm:p-4 rounded shadow cursor-pointer hover:bg-[#235347]/20 min-h-[80px]"
          onClick={() => handleContainerClick(index)}
        >
          <h3 className="text-sm sm:text-md font-medium text-gray-700 text-center">{title}</h3>
          <p className="text-2xl sm:text-4xl font-bold text-gray-900 text-center">{getGradeValue(title).value}</p>
          <p className="text-[10px] sm:text-xs text-gray-500 text-center">Percentile: {formatPercentile(getGradeValue(title).percentile)}</p>
        </div>
      ))}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-2 sm:p-4 rounded-lg shadow-lg w-[95%] sm:w-3/4 h-[70%] sm:h-3/4 flex flex-col">
            <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">{selectedContainer || 'Selected Container'}</h3>
            <div className="flex-1 overflow-auto" style={{ maxHeight: isMobile ? '250px' : undefined }}>
              <canvas id="trendChart" className="w-full h-full"></canvas>
            </div>
            <div className="mt-2 sm:mt-4 flex justify-end">
              <button
                className="bg-red-500 text-white p-1 sm:p-2 rounded hover:bg-red-700"
                onClick={() => setIsPopupOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadlineAnalytics;