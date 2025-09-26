import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const HeadlineGrades = ({
  isPopupOpen,
  setIsPopupOpen,
  setSelectedGrade,
  selectedGrade,
  percentileGrades,
  weeklyGrades,
  teamGames,
  width = '50%',
  height = '50%',
  className = "text-sm sm:text-base"
}) => {
  const convertToLetterGrade = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 'N/A';
    if (numValue >= 100) return '#1';
    if (numValue >= 95) return 'A+';
    if (numValue >= 90) return 'A';
    if (numValue >= 85) return 'A-';
    if (numValue >= 80) return 'B+';
    if (numValue >= 75) return 'B';
    if (numValue >= 70) return 'B-';
    if (numValue >= 65) return 'C+';
    if (numValue >= 60) return 'C';
    if (numValue >= 55) return 'C-';
    if (numValue >= 50) return 'D+';
    if (numValue >= 45) return 'D';
    if (numValue >= 40) return 'D-';
    return 'F';
  };

  const getGradeValue = (gradeKey) => {
    if (!percentileGrades) return 'N/A';
    switch (gradeKey) {
      case 'Run Grade': return percentileGrades.percentile_grades_run || 'N/A';
      case 'Overall Offense Grade': return percentileGrades.percentile_grades_offense_rushing || 'N/A';
      case 'Receiving Grade': return percentileGrades.percentile_grades_pass_route_rushing || 'N/A';
      case 'Ball Security Grade': return percentileGrades.percentile_grades_hands_fumble_rushing || 'N/A';
      case 'Elusiveness Grade': return percentileGrades.percentile_elusive_rating || 'N/A';
      case 'Breakaway Percentage': return percentileGrades.percentile_breakaway_percent || 'N/A';
      case 'Penalty Aversion': return percentileGrades.percentile_grades_offense_penalty || 'N/A';
      case 'Run Blocking Grade': return percentileGrades.percentile_grades_run_block_rushing || 'N/A';
      case 'Blitz Pass Grades': return percentileGrades.percentile_grades_pass_block_rushing || 'N/A';
      default: return 'N/A';
    }
  };

  const formatPercentile = (value) => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A';
    const numValue = parseFloat(value);
    return isNaN(numValue) ? 'N/A' : `${numValue.toFixed(2)}%`;
  };

  const chartRef = useRef(null);
  const mobileChartRef = useRef(null);
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    const chartInstance = isMobile ? mobileChartRef.current : chartRef.current;
    if (chartInstance) {
      chartInstance.destroy();
      console.log('Previous chart destroyed');
    }
    if (isPopupOpen && selectedGrade) {
      const canvasId = isMobile ? 'mobileTrendChart' : 'trendChart';
      const canvas = document.getElementById(canvasId);
      if (!canvas || !canvas.getContext) {
        console.warn(`Canvas not available for ${canvasId}`);
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
        'Run Grade': 'grades_run',
        'Overall Offense Grade': 'grades_offense',
        'Receiving Grade': 'grades_pass_route',
        'Ball Security Grade': 'grades_hands_fumble',
        'Elusiveness Grade': 'elusive_rating',
        'Breakaway Percentage': 'breakaway_percent',
        'Penalty Aversion': 'grades_offense_penalty',
        'Run Blocking Grade': 'grades_run_block',
        'Blitz Pass Grades': 'grades_pass_block',
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
      const yMax = maxValue;
      const chartOptions = isMobile
        ? {
            scales: {
              x: {
                title: { display: false, text: 'Opponent' },
                ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, labelOffset: 10, font: { size: 10 } },
              },
              y: {
                title: { display: true, text: 'Grade', font: { size: 12 } },
                beginAtZero: true,
                min: yMin,
                max: yMax,
                ticks: { stepSize: (yMax - yMin) / 5, font: { size: 10 } },
              },
            },
            plugins: { legend: { display: true, position: 'top' }, tooltip: { mode: 'index', intersect: false } },
            responsive: true,
            maintainAspectRatio: false,
          }
        : {
            scales: {
              x: { title: { display: false, text: 'Opponent' }, ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, labelOffset: 10 } },
              y: { title: { display:  true, text: 'Grade' }, beginAtZero: true, min: yMin, max: yMax, ticks: { stepSize: (yMax - yMin) / 5 } },
            },
            plugins: { legend: { display: true, position: 'top' }, tooltip: { mode: 'index', intersect: false } },
            responsive: true,
            maintainAspectRatio: false,
          };
      const newChart = new Chart(ctx, {
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
        options: chartOptions,
      });
      if (isMobile) {
        mobileChartRef.current = newChart;
      } else {
        chartRef.current = newChart;
      }
      console.log('Line chart created successfully for', selectedGrade);
    }
  }, [isPopupOpen, selectedGrade, weeklyGrades, teamGames, isMobile]);

  if (isMobile) {
    return (
      <div className={`h-auto bg-white rounded-lg shadow-lg ${className}`}>
        <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Headline Grades</h2>
        <div className="grid grid-cols-1 gap-4 mb-4 h-auto">
          <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Run Grade'); }}>
            <h3 className="text-sm font-medium">Overall Rushing</h3>
            <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Grade'))}</p>
            <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Run Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Overall Offense Grade'); }}>
            <h3 className="text-sm font-medium">Overall Offense</h3>
            <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Overall Offense Grade'))}</p>
            <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Overall Offense Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Receiving Grade'); }}>
            <h3 className="text-xs font-medium">Overall Receiving</h3>
            <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Receiving Grade'))}</p>
            <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Receiving Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Ball Security Grade'); }}>
            <h3 className="text-xs font-medium">Ball Security</h3>
            <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Ball Security Grade'))}</p>
            <p className="text-[10px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Ball Security Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Elusiveness Grade'); }}>
            <h3 className="text-xs font-medium">Elusiveness</h3>
            <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Elusiveness Grade'))}</p>
            <p className="text-[10px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Elusiveness Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Breakaway Percentage'); }}>
            <h3 className="text-xs font-medium">Breakaway Ability</h3>
            <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Breakaway Percentage'))}</p>
            <p className="text-[10px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Breakaway Percentage'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Penalty Aversion'); }}>
            <h3 className="text-xs font-medium">Penalty Aversion</h3>
            <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Penalty Aversion'))}</p>
            <p className="text-[10px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Penalty Aversion'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Run Blocking Grade'); }}>
            <h3 className="text-xs font-medium">Run Blocking</h3>
            <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Blocking Grade'))}</p>
            <p className="text-[10px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Run Blocking Grade'))}</p>
          </div>
          <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Blitz Pass Grades'); }}>
            <h3 className="text-xs font-medium">Pass Blocking</h3>
            <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Blitz Pass Grades'))}</p>
            <p className="text-[10px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Blitz Pass Grades'))}</p>
          </div>
        </div>
        {isPopupOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={isMobile ? "bg-white p-2 rounded-lg shadow-lg w-[95%] h-[50%] flex flex-col" : "bg-white p-4 rounded-lg shadow-lg w-1/2 h-1/2 flex flex-col"} style={{ width: width, height: height }}>
              <h3 className={isMobile ? "text-sm font-semibold mb-1" : "text-lg font-semibold mb-2"}>{selectedGrade}</h3>
              <div className="flex-1 overflow-auto" style={{ maxHeight: isMobile ? '275px' : undefined }}>
                <canvas id={isMobile ? "mobileTrendChart" : "trendChart"} className="w-full h-full" />
              </div>
              <div className={isMobile ? "mt-1 flex justify-end" : "mt-2 flex justify-end"}>
                <button
                  className={isMobile ? "bg-red-500 text-white p-1 rounded hover:bg-red-700" : "bg-red-500 text-white p-2 rounded hover:bg-red-700"}
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
  }

  return (
    <div className={`h-80 bg-white rounded-lg shadow-lg ${className}`}>
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Headline Grades</h2>
      <div className="grid grid-cols-3 gap-4 mb-4 h-[40%]">
        <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Run Grade'); }}>
          <h3 className="text-md font-medium">Overall Rushing</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Grade'))}</p>
          <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Run Grade'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Overall Offense Grade'); }}>
          <h3 className="text-md font-medium">Overall Offense</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Overall Offense Grade'))}</p>
          <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Overall Offense Grade'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Receiving Grade'); }}>
          <h3 className="text-md font-medium">Overall Receiving</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Receiving Grade'))}</p>
          <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Receiving Grade'))}</p>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2 h-[40%]">
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Ball Security Grade'); }}>
          <h3 className="text-sm font-medium">Ball Security</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Ball Security Grade'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Ball Security Grade'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Elusiveness Grade'); }}>
          <h3 className="text-sm font-medium">Elusiveness</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Elusiveness Grade'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Elusiveness Grade'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Breakaway Percentage'); }}>
          <h3 className="text-sm font-medium">Breakaway Ability</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Breakaway Percentage'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Breakaway Percentage'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Penalty Aversion'); }}>
          <h3 className="text-sm font-medium">Penalty Aversion</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Penalty Aversion'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Penalty Aversion'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Run Blocking Grade'); }}>
          <h3 className="text-sm font-medium">Run Blocking</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Run Blocking Grade'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Run Blocking Grade'))}</p>
        </div>
        <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Blitz Pass Grades'); }}>
          <h3 className="text-sm font-medium">Pass Blocking</h3>
          <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Blitz Pass Grades'))}</p>
          <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Blitz Pass Grades'))}</p>
        </div>
      </div>
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={isMobile ? "bg-white p-2 rounded-lg shadow-lg w-[95%] h-[50%] flex flex-col" : "bg-white p-4 rounded-lg shadow-lg w-1/2 h-1/2 flex flex-col"} style={{ width: width, height: height }}>
            <h3 className={isMobile ? "text-sm font-semibold mb-1" : "text-lg font-semibold mb-2"}>{selectedGrade}</h3>
            <div className="flex-1 overflow-auto" style={{ maxHeight: isMobile ? '275px' : undefined }}>
              <canvas id={isMobile ? "mobileTrendChart" : "trendChart"} className="w-full h-full" />
            </div>
            <div className={isMobile ? "mt-1 flex justify-end" : "mt-2 flex justify-end"}>
              <button
                className={isMobile ? "bg-red-500 text-white p-1 rounded hover:bg-red-700" : "bg-red-500 text-white p-2 rounded hover:bg-red-700"}
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