import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const HeadlineGrades = ({
  isPopupOpen,
  setIsPopupOpen,
  setSelectedGrade,
  selectedGrade,
  percentileGrades,
  weeklyGrades,
  weeklyBlockingGrades,
  teamGames,
  width = '50%', // Default width, customizable via prop
  height = '50%', // Default height, customizable via prop
}) => {
  const convertToLetterGrade = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'N/A';
    if (numValue > 97) return 'A+';
    if (numValue >= 93) return 'A';
    if (numValue >= 90) return 'A-';
    if (numValue >= 87) return 'B+';
    if (numValue >= 83) return 'B';
    if (numValue >= 80) return 'B-';
    if (numValue >= 77) return 'C+';
    if (numValue >= 73) return 'C';
    if (numValue >= 70) return 'C-';
    if (numValue >= 67) return 'D+';
    if (numValue >= 63) return 'D';
    if (numValue >= 60) return 'D-';
    return 'F';
  };

  const getGradeValue = (gradeKey) => {
    if (!percentileGrades) return 'N/A';
    switch (gradeKey) {
      case 'Overall Offense Grade': return percentileGrades.percentile_grades_offense || 'N/A';
      case 'Receiving Grade': return percentileGrades.percentile_grades_pass_route || 'N/A';
      case 'BLOS Route Grade': return percentileGrades.percentile_behind_los_grades_pass_route || 'N/A';
      case 'Short Route Grade': return percentileGrades.percentile_short_grades_pass_route || 'N/A';
      case 'Medium Route Grade': return percentileGrades.percentile_medium_grades_pass_route || 'N/A';
      case 'Deep Route Grade': return percentileGrades.percentile_deep_grades_pass_route || 'N/A';
      case 'Run Block Grades': return percentileGrades.percentile_grades_run_block || 'N/A';
      case 'Pass Block Grades': return percentileGrades.percentile_grades_pass_block || 'N/A';
      default: return 'N/A';
    }
  };

  const formatPercentile = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? 'N/A' : `${numValue.toFixed(2)}%`;
  };

  const chartRef = useRef(null);

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
        const opponent = playerTeam === game.homeTeam ? `vs. ${game.awayTeam}` : `at ${game.homeTeam}`;
        acc[key] = { opponent, startDate: game.startDate };
        return acc;
      }, {});
      const labels = sortedGames.map(game => {
        const key = `${game.week}_${game.seasonType}`;
        return opponentLookup[key]?.opponent || `Week ${game.week} (${game.seasonType})`;
      });
      const gradeToField = {
        'Run Grade': 'grades_run',
        'Overall Offense Grade': 'grades_offense',
        'Receiving Grade': 'grades_pass_route',
        'BLOS Route Grade': 'behind_los_grades_pass_route',
        'Short Route Grade': 'short_grades_pass_route',
        'Medium Route Grade': 'medium_grades_pass_route',
        'Deep Route Grade': 'deep_grades_pass_route',
        'Run Block Grades': 'grades_run_block',
        'Pass Block Grades': 'grades_pass_block',
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
      const minValue = 0;
      const maxValue = 100;
      const buffer = (maxValue - minValue) * 0.1;
      const yMin = Math.max(0, minValue - buffer);
      const yMax = maxValue ;
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
            x: { title: { display: true, text: 'Opponent' }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, labelOffset: 10 } },
            y: { title: { display: true, text: 'Grade' }, beginAtZero: true, min: yMin, max: yMax, ticks: { stepSize: (yMax - yMin) / 5 } },
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
    <div className="h-80 bg-white p-2 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-2 text-gray-700 text-center shadow-lg rounded-lg">Headline Grades</h2>
      <div className="grid grid-cols-2 gap-4 mb-4 h-[40%]">
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-gray-100 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Overall Offense Grade'); }}>
          <h3 className="text-md font-medium">Overall Offense</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Overall Offense Grade'))}</p>
          <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Overall Offense Grade'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-gray-100 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Receiving Grade'); }}>
          <h3 className="text-md font-medium">Overall Receiving</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Receiving Grade'))}</p>
          <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Receiving Grade'))}</p>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2 h-[40%]">
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-gray-100 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('BLOS Route Grade'); }}>
          <h3 className="text-sm font-medium">BLOS Grade</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('BLOS Route Grade'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('BLOS Route Grade'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-gray-100 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Short Route Grade'); }}>
          <h3 className="text-sm font-medium">Short Grade</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Short Route Grade'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Short Route Grade'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-gray-100 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Medium Route Grade'); }}>
          <h3 className="text-sm font-medium">Medium Grade</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Medium Route Grade'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Medium Route Grade'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-gray-100 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Deep Route Grade'); }}>
          <h3 className="text-sm font-medium">Deep Grade</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Deep Route Grade'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Deep Route Grade'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-gray-100 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Run Block Grades'); }}>
          <h3 className="text-sm font-medium">Run Block</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Block Grades'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Run Block Grades'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-gray-100 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Pass Block Grades'); }}>
          <h3 className="text-sm font-medium">Pass Block</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Block Grades'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Pass Block Grades'))}</p>
        </div>
      </div>
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg w-1/2 h-1/2 flex flex-col" style={{ width: width, height: height }}>
            <h3 className="text-lg font-semibold mb-2">{selectedGrade}</h3>
            <div className="flex-1 overflow-auto"> {/* Added overflow-auto to handle content */}
              <canvas id="trendChart" className="w-full h-full" />
            </div>
            <div className="mt-2 flex justify-end"> {/* Moved button to fixed footer */}
              <button
                className="bg-red-500 text-white p-2 rounded hover:bg-red-700"
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

export default HeadlineGrades;