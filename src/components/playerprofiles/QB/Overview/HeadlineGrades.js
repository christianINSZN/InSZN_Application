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
    if (numValue >= 87.91666667) return 'A';
    if (numValue >= 80.83333333) return 'A-';
    if (numValue >= 73.75) return 'B+';
    if (numValue >= 66.66666667) return 'B';
    if (numValue >= 59.58333333) return 'B-';
    if (numValue >= 52.5) return 'C+';
    if (numValue >= 45.41666667) return 'C';
    if (numValue >= 38.33333333) return 'C-';
    if (numValue >= 31.25) return 'D+';
    if (numValue >= 24.16666667) return 'D';
    if (numValue >= 17.08333333) return 'D-';
    return 'F';
  };

  const getGradeValue = (gradeKey) => {
    if (!percentileGrades) return 'N/A';
    switch (gradeKey) {
      case 'Pass Grade': return percentileGrades.percentile_grades_pass || 'N/A';
      case 'Overall Offense Grade': return percentileGrades.percentile_grades_offense || 'N/A';
      case 'Rushing Grade': return percentileGrades.percentile_grades_run || 'N/A';
      case 'Behind LOS Pass Grade': return percentileGrades.percentile_behind_los_grades_pass || 'N/A';
      case 'Short Pass Grade': return percentileGrades.percentile_short_grades_pass || 'N/A';
      case 'Medium Pass Grade': return percentileGrades.percentile_medium_grades_pass || 'N/A';
      case 'Deep Pass Grade': return percentileGrades.percentile_deep_grades_pass || 'N/A';
      case 'Pressure Pass Grades': return percentileGrades.percentile_pressure_grades_pass || 'N/A';
      case 'Blitz Pass Grades': return percentileGrades.percentile_blitz_grades_pass || 'N/A';
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
        'Pass Grade': 'grades_pass',
        'Overall Offense Grade': 'grades_offense',
        'Rushing Grade': 'grades_run',
        'Behind LOS Pass Grade': 'behind_los_grades_pass',
        'Short Pass Grade': 'short_grades_pass',
        'Medium Pass Grade': 'medium_grades_pass',
        'Deep Pass Grade': 'deep_grades_pass',
        'Pressure Pass Grades': 'pressure_grades_pass',
        'Blitz Pass Grades': 'blitz_grades_pass',
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
              y: { title: { display: true, text: 'Grade' }, beginAtZero: true, min: yMin, max: yMax, ticks: { stepSize: (yMax - yMin) / 5 } },
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

  return (
    <div className="h-auto bg-white rounded-lg shadow-lg relative">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Headline Grades</h2>

      <div className="relative">
        {isSubscribed ? (
          isMobile ? (
            <div className="grid grid-cols-1 gap-4 mb-4 h-auto">
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Pass Grade'); }}>
                <h3 className="text-sm font-medium">Overall Passing</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Overall Offense Grade'); }}>
                <h3 className="text-sm font-medium">Overall Offense</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Overall Offense Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Overall Offense Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Rushing Grade'); }}>
                <h3 className="text-sm font-medium">Overall Rushing</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Rushing Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Rushing Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Behind LOS Pass Grade'); }}>
                <h3 className="text-xs font-medium">BLOS Pass</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Behind LOS Pass Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Behind LOS Pass Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Short Pass Grade'); }}>
                <h3 className="text-xs font-medium">Short Pass</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Short Pass Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Short Pass Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Medium Pass Grade'); }}>
                <h3 className="text-xs font-medium">Medium Pass</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Medium Pass Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Medium Pass Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Deep Pass Grade'); }}>
                <h3 className="text-xs font-medium">Deep Pass</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Deep Pass Grade'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Deep Pass Grade'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Pressure Pass Grades'); }}>
                <h3 className="text-xs font-medium">Pressure Pass</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pressure Pass Grades'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pressure Pass Grades'))}</p>
              </div>
              <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Blitz Pass Grades'); }}>
                <h3 className="text-xs font-medium">Blitz Pass</h3>
                <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Blitz Pass Grades'))}</p>
                <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Blitz Pass Grades'))}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4 h-[40%]">
                <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Pass Grade'); }}>
                  <h3 className="text-md font-medium">Overall Passing</h3>
                  <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Grade'))}</p>
                  <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Overall Offense Grade'); }}>
                  <h3 className="text-md font-medium">Overall Offense</h3>
                  <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Overall Offense Grade'))}</p>
                  <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Overall Offense Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Rushing Grade'); }}>
                  <h3 className="text-md font-medium">Overall Rushing</h3>
                  <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Rushing Grade'))}</p>
                  <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Rushing Grade'))}</p>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2 h-[40%]">
                <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Behind LOS Pass Grade'); }}>
                  <h3 className="text-sm font-medium">BLOS Pass</h3>
                  <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Behind LOS Pass Grade'))}</p>
                  <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Behind LOS Pass Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Short Pass Grade'); }}>
                  <h3 className="text-sm font-medium">Short Pass</h3>
                  <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Short Pass Grade'))}</p>
                  <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Short Pass Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Medium Pass Grade'); }}>
                  <h3 className="text-sm font-medium">Medium Pass</h3>
                  <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Medium Pass Grade'))}</p>
                  <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Medium Pass Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Deep Pass Grade'); }}>
                  <h3 className="text-sm font-medium">Deep Pass</h3>
                  <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Deep Pass Grade'))}</p>
                  <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Deep Pass Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Pressure Pass Grades'); }}>
                  <h3 className="text-sm font-medium">Pressure Pass</h3>
                  <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pressure Pass Grades'))}</p>
                  <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Pressure Pass Grades'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Blitz Pass Grades'); }}>
                  <h3 className="text-sm font-medium">Blitz Pass</h3>
                  <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Blitz Pass Grades'))}</p>
                  <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Blitz Pass Grades'))}</p>
                </div>
              </div>
            </>
          )
        ) : (
          <div className="relative">
            {isMobile ? (
              <div className="grid grid-cols-1 gap-4 mb-4 h-auto filter blur-xs opacity-80">
                <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Pass Grade'); }}>
                  <h3 className="text-sm font-medium">Overall Passing</h3>
                  <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Grade'))}</p>
                  <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Overall Offense Grade'); }}>
                  <h3 className="text-sm font-medium">Overall Offense</h3>
                  <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Overall Offense Grade'))}</p>
                  <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Overall Offense Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Rushing Grade'); }}>
                  <h3 className="text-sm font-medium">Overall Rushing</h3>
                  <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Rushing Grade'))}</p>
                  <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Rushing Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Behind LOS Pass Grade'); }}>
                  <h3 className="text-xs font-medium">BLOS Pass</h3>
                  <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Behind LOS Pass Grade'))}</p>
                  <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Behind LOS Pass Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Short Pass Grade'); }}>
                  <h3 className="text-xs font-medium">Short Pass</h3>
                  <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Short Pass Grade'))}</p>
                  <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Short Pass Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Medium Pass Grade'); }}>
                  <h3 className="text-xs font-medium">Medium Pass</h3>
                  <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Medium Pass Grade'))}</p>
                  <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Medium Pass Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Deep Pass Grade'); }}>
                  <h3 className="text-xs font-medium">Deep Pass</h3>
                  <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Deep Pass Grade'))}</p>
                  <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Deep Pass Grade'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Pressure Pass Grades'); }}>
                  <h3 className="text-xs font-medium">Pressure Pass</h3>
                  <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pressure Pass Grades'))}</p>
                  <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pressure Pass Grades'))}</p>
                </div>
                <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg min-h-[120px]" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Blitz Pass Grades'); }}>
                  <h3 className="text-xs font-medium">Blitz Pass</h3>
                  <p className="text-2xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Blitz Pass Grades'))}</p>
                  <p className="text-[10px] text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Blitz Pass Grades'))}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4 h-[40%] filter blur-xs opacity-80">
                  <div className="bg-gray-0 p-2 rounded text-center hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Pass Grade'); }}>
                    <h3 className="text-md font-medium">Overall Passing</h3>
                    <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pass Grade'))}</p>
                    <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Pass Grade'))}</p>
                  </div>
                  <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Overall Offense Grade'); }}>
                    <h3 className="text-md font-medium">Overall Offense</h3>
                    <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Overall Offense Grade'))}</p>
                    <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Overall Offense Grade'))}</p>
                  </div>
                  <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Rushing Grade'); }}>
                    <h3 className="text-md font-medium">Overall Rushing</h3>
                    <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Rushing Grade'))}</p>
                    <p className="text-xs text-gray-500 p-2">Percentile: {formatPercentile(getGradeValue('Rushing Grade'))}</p>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2 h-[40%] filter blur-xs opacity-80">
                  <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Behind LOS Pass Grade'); }}>
                    <h3 className="text-sm font-medium">BLOS Pass</h3>
                    <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Behind LOS Pass Grade'))}</p>
                    <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Behind LOS Pass Grade'))}</p>
                  </div>
                  <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Short Pass Grade'); }}>
                    <h3 className="text-sm font-medium">Short Pass</h3>
                    <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Short Pass Grade'))}</p>
                    <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Short Pass Grade'))}</p>
                  </div>
                  <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Medium Pass Grade'); }}>
                    <h3 className="text-sm font-medium">Medium Pass</h3>
                    <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Medium Pass Grade'))}</p>
                    <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Medium Pass Grade'))}</p>
                  </div>
                  <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Deep Pass Grade'); }}>
                    <h3 className="text-sm font-medium">Deep Pass</h3>
                    <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Deep Pass Grade'))}</p>
                    <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Deep Pass Grade'))}</p>
                  </div>
                  <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Pressure Pass Grades'); }}>
                    <h3 className="text-sm font-medium">Pressure Pass</h3>
                    <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Pressure Pass Grades'))}</p>
                    <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Pressure Pass Grades'))}</p>
                  </div>
                  <div className="bg-gray-0 p-2 rounded text-center h-full hover:bg-[#235347]/20 shadow-lg" onClick={() => { setIsPopupOpen(true); setSelectedGrade('Blitz Pass Grades'); }}>
                    <h3 className="text-sm font-medium">Blitz Pass</h3>
                    <p className="text-4xl font-bold text-gray-800">{convertToLetterGrade(getGradeValue('Blitz Pass Grades'))}</p>
                    <p className="text-[11px] text-gray-500 p-2.5">Percentile: {formatPercentile(getGradeValue('Blitz Pass Grades'))}</p>
                  </div>
                </div>
              </>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-filter backdrop-blur-sm rounded-lg h-auto sm:h-[240px]">
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
            <div className="bg-white p-4 rounded-lg shadow-lg w-1/2 h-1/2 flex flex-col">
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