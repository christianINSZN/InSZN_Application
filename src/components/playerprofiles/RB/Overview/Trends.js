import React, { useState, useEffect } from 'react';
import { ChevronDoubleUpIcon, ChevronDoubleDownIcon } from '@heroicons/react/24/solid';

const Trends = ({ isPopupOpen, setIsPopupOpen, setSelectedGrade, selectedGrade, year, teamGames, weeklyGrades, className = "text-sm sm:text-base" }) => {
  const [trendData, setTrendData] = useState({
    trendUp: [],
    trendDown: [],
  });
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    console.log('teamGames:', teamGames);
    console.log('weeklyGrades:', weeklyGrades);
    if (teamGames && weeklyGrades && teamGames.length >= 1) {
      const metrics = {
        'grades_run': 'Rush Grade',
        'yards': 'Yards',
        'attempts': 'Attempts',
        'touchdowns': 'Touchdowns',
        'ypa': 'YPA',
        'long_run': 'Long Run',
        'explosive_rate': 'Explosive %',
        'fumbles': 'Fumbles'
      };
      const gamesWithStats = teamGames
        .map(game => {
          const key = `${game.week}_${game.seasonType}`;
          const grade = weeklyGrades[key];
          const hasStats = grade && Object.keys(metrics).some(metric => grade[metric] !== undefined && grade[metric] !== null);
          return hasStats ? { ...game, key } : null;
        })
        .filter(game => game !== null)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(-3);
      console.log('gamesWithStats:', gamesWithStats);
      const trends = {};
      Object.keys(metrics).forEach(metric => {
        const values = gamesWithStats
          .map(game => {
            const grade = weeklyGrades[game.key];
            console.log(`Checking ${metric} for ${game.key}:`, grade ? grade[metric] : 'undefined');
            return grade && grade[metric] !== undefined && grade[metric] !== null ? grade[metric] : null;
          })
          .filter(value => value !== null);
        console.log(`Metric ${metric} values:`, values);
        if (values.length >= 2) {
          const startValue = values[0];
          const midValue = values[1];
          const endValue = values[values.length - 1];
          let totalGrowth = 0;
          if (startValue !== 0 && isFinite((endValue - startValue) / startValue)) {
            totalGrowth = ((endValue - startValue) / startValue) * 100;
          }
          let recentChange = 0;
          if (values.length >= 3 && midValue !== 0 && isFinite((endValue - midValue) / midValue)) {
            recentChange = ((endValue - midValue) / midValue) * 100;
          }
          const weightedTrend = (0.7 * totalGrowth) + (0.3 * recentChange);
          trends[metric] = { label: metrics[metric], value: weightedTrend };
          console.log(`Trend for ${metric}:`, weightedTrend);
        } else if (values.length === 1) {
          trends[metric] = { label: metrics[metric], value: 0 };
          console.log(`Single value for ${metric}, setting trend to 0`);
        }
      });
      const trendArray = Object.values(trends).sort((a, b) => b.value - a.value);
      const trendUp = trendArray.filter(trend => trend.value >= 0).slice(0, 3);
      const trendDown = trendArray.filter(trend => trend.value < 0).slice(-3).reverse();
      console.log('trendUp:', trendUp);
      console.log('trendDown:', trendDown);
      setTrendData({ trendUp, trendDown });
    } else {
      console.log('No valid teamGames or weeklyGrades:', { teamGames, weeklyGrades });
    }
  }, [teamGames, weeklyGrades]);

  return (
    <div className={isMobile ? `h-auto bg-white rounded-lg shadow-lg ${className}` : `h-80 bg-white rounded-lg shadow-lg ${className}`}>
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Trends (3 Game)</h2>
      {trendData.trendUp.length === 0 && trendData.trendDown.length === 0 ? (
        <p className="text-gray-500 text-center p-4 text-sm sm:text-base">Trends populate after 3 played games</p>
      ) : (
        <>
          <div className={isMobile ? "grid grid-cols-1 gap-4 mb-4 h-auto" : "grid grid-cols-3 gap-4 mb-4 h-[40%]"}>
            {trendData.trendUp.length > 0 ? (
              trendData.trendUp.map((trend, index) => (
                <div
                  key={trend.label}
                  className="bg-gray-0 p-2 rounded text-center h-full shadow-lg hover:bg-[#235347]/20"
                >
                  <h3 className={isMobile ? "text-sm font-medium" : "text-md font-medium"}>{trend.label}</h3>
                  <p className={isMobile ? "text-2xl font-bold text-gray-800 p-2" : "text-3xl font-bold text-gray-800 p-3"}>
                    <ChevronDoubleUpIcon className="h-14 w-14 inline-block text-green-500" />
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center p-4 col-span-3 text-sm sm:text-base">No upward trends</p>
            )}
          </div>
          <div className={isMobile ? "grid grid-cols-1 gap-4 h-auto" : "grid grid-cols-3 gap-2 h-[40%]"}>
            {trendData.trendDown.length > 0 ? (
              trendData.trendDown.map((trend, index) => (
                <div
                  key={trend.label}
                  className="bg-gray-0 p-2 rounded text-center h-full shadow-lg hover:bg-[#235347]/20"
                >
                  <h3 className={isMobile ? "text-sm font-medium" : "text-md font-medium"}>{trend.label}</h3>
                  <p className={isMobile ? "text-2xl font-bold text-gray-800 p-2" : "text-3xl font-bold text-gray-800 p-3"}>
                    <ChevronDoubleDownIcon className="h-14 w-14 inline-block text-red-500" />
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center p-4 col-span-3 text-sm sm:text-base">No downward trends</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Trends;