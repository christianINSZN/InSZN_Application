import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

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
  const { user } = useClerk();
  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
  const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium';
  const isPremium = isSubscribed;

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
      case 'Overall Offense Grade': return percentileGrades.percentile_grades_offense || 'N/A';
      case 'Receiving Grade': return percentileGrades.percentile_grades_pass_route || 'N/A';
      case 'Blocking Grade': return percentileGrades.percentile_grades_pass_block || 'N/A';
      case 'BLOS Route Grade': return percentileGrades.percentile_behind_los_grades_pass_route || 'N/A';
      case 'Short Route Grade': return percentileGrades.percentile_short_grades_pass_route || 'N/A';
      case 'Medium Route Grade': return percentileGrades.percentile_medium_grades_pass_route || 'N/A';
      case 'Deep Route Grade': return percentileGrades.percentile_deep_grades_pass_route || 'N/A';
      case 'Zone Coverage Route Grade': return percentileGrades.percentile_zone_grades_pass_route || 'N/A';
      case 'Man Coverage Route Grade': return percentileGrades.percentile_man_grades_pass_route || 'N/A';
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
      if (!teamGames || !Array.isArray(teamGames) || teamGames.length === 0) {
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
        'Overall Offense Grade': 'grades_offense',
        'Receiving Grade': 'grades_pass_route',
        'Blocking Grade': 'grades_pass_block',
        'BLOS Route Grade': 'behind_los_grades_pass_route',
        'Short Route Grade': 'short_grades_pass_route',
        'Medium Route Grade': 'medium_grades_pass_route',
        'Deep Route Grade': 'deep_grades_pass_route',
        'Zone Coverage Route Grade': 'zone_grades_pass_route',
        'Man Coverage Route Grade': 'man_grades_pass_route',
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
    <div className={`h-80 bg-white rounded-lg shadow-lg relative ${className}`}>
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Headline Grades</h2>
      <div className="relative">
        {isSubscribed ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4 h-[40%]">
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Overall Offense Grade'); }}>
                <h3 className="text-md font-medium">Overall Offense</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Overall Offense Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Overall Offense Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Receiving Grade'); }}>
                <h3 className="text-md font-medium">Overall Receiving</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Receiving Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Receiving Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Blocking Grade'); }}>
                <h3 className="text-md font-medium">Overall Blocking</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Blocking Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Blocking Grade'))}</p>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2 h-[40%]">
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('BLOS Route Grade'); }}>
                <h3 className="text-sm font-medium">BLOS Grade</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('BLOS Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('BLOS Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Short Route Grade'); }}>
                <h3 className="text-sm font-medium">Short Grade</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Short Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Short Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Medium Route Grade'); }}>
                <h3 className="text-sm font-medium">Medium Grade</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Medium Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Medium Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Deep Route Grade'); }}>
                <h3 className="text-sm font-medium">Deep Grade</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Deep Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Deep Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Zone Coverage Route Grade'); }}>
                <h3 className="text-sm font-medium">Against Zone</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Zone Coverage Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Zone Coverage Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Man Coverage Route Grade'); }}>
                <h3 className="text-sm font-medium">Against Man</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Man Coverage Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Man Coverage Route Grade'))}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="relative">
            <div className="grid grid-cols-3 gap-4 mb-4 h-[40%] filter blur-xs opacity-80">
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Overall Offense Grade'); }}>
                <h3 className="text-md font-medium">Overall Offense</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Overall Offense Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Overall Offense Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Receiving Grade'); }}>
                <h3 className="text-md font-medium">Overall Receiving</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Receiving Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Receiving Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Blocking Grade'); }}>
                <h3 className="text-md font-medium">Overall Blocking</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Blocking Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Blocking Grade'))}</p>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2 h-[40%] filter blur-xs opacity-80">
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('BLOS Route Grade'); }}>
                <h3 className="text-sm font-medium">BLOS Grade</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('BLOS Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('BLOS Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Short Route Grade'); }}>
                <h3 className="text-sm font-medium">Short Grade</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Short Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Short Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Medium Route Grade'); }}>
                <h3 className="text-sm font-medium">Medium Grade</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Medium Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Medium Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Deep Route Grade'); }}>
                <h3 className="text-sm font-medium">Deep Grade</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Deep Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Deep Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Zone Coverage Route Grade'); }}>
                <h3 className="text-sm font-medium">Against Zone</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Zone Coverage Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Zone Coverage Route Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Man Coverage Route Grade'); }}>
                <h3 className="text-sm font-medium">Against Man</h3>
                <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Man Coverage Route Grade'))}</p>
                <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Man Coverage Route Grade'))}</p>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-filter backdrop-blur-sm rounded-lg h-[240px]">
              <div className="p-4 sm:p-6 bg-white rounded-lg shadow-lg text-center">
                <p className="text-gray-700 text-base sm:text-lg font-semibold mb-2">Exclusive Content</p>
                <p className="text-gray-500 text-sm sm:text-base mb-4">This content is exclusive to INSZN Insider subscribers.</p>
                <Link
                  to="/subscribe"
                  className="px-3 sm:px-4 py-1 sm:py-2 bg-[#235347] text-white text-sm sm:text-base rounded hover:bg-[#1b3e32]"
                >
                  Subscribe Now
                </Link>
              </div>
            </div>
          </div>
        )}
        {/* Popup Chart */}
        {isPopupOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-lg w-1/2 h-1/2 flex flex-col" style={{ width, height }}>
              <h3 className="text-lg font-semibold mb-2">{selectedGrade}</h3>
              <div className="flex-1 overflow-auto">
                <canvas id="trendChart" className="w-full h-full" />
              </div>
              <div className="mt-2 flex justify-end">
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
    </div>
  );
};

export default HeadlineGrades;