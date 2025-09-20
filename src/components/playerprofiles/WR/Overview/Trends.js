import React, { useEffect, useState } from 'react';
import { ChevronDoubleUpIcon, ChevronDoubleDownIcon } from '@heroicons/react/24/solid';

const Trends = ({ isPopupOpen, setIsPopupOpen, setSelectedGrade, selectedGrade, year, teamGames, weeklyGrades }) => {
  const [trendData, setTrendData] = useState({
    trendUp: [],
    trendDown: [],
  });

  useEffect(() => {
    console.log('teamGames:', teamGames);
    console.log('weeklyGrades:', weeklyGrades);

    if (teamGames && weeklyGrades && Array.isArray(teamGames) && teamGames.length >= 1) {
      // Relevant metrics for WR trends
      const metrics = {
        'grades_pass_route': 'Rec. Grade',
        'targets': 'Targets',
        'receptions': 'Receptions',
        'yards': 'Yards',
        'yards_per_reception': 'YPC',
        'touchdowns': 'Touchdowns',
        'longest': 'Longest',
        'drop_rate': 'Drop Rate'
      };

      // Filter games where the player has valid stats (at least one non-null metric)
      const gamesWithStats = teamGames
        .map(game => {
          const key = `${game.week}_${game.seasonType}`;
          const grade = weeklyGrades[key];
          const hasStats = grade && Object.keys(metrics).some(metric => grade[metric] !== undefined && grade[metric] !== null);
          return hasStats ? { ...game, key } : null;
        })
        .filter(game => game !== null)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(-3); // Last 3 games with stats
      console.log('gamesWithStats:', gamesWithStats);

      // Calculate trends for each metric
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

        if (values.length >= 2) { // Need at least 2 points for trend
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

      // Convert to array and sort by weighted trend
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
    <div className="h-80 bg-white rounded-lg shadow-lg">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Trends (3 Game)</h2>
      {trendData.trendUp.length === 0 && trendData.trendDown.length === 0 ? (
        <p className="text-gray-500 text-center p-4">Trends populate after 3 played games</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4 h-[40%]">
            {trendData.trendUp.length > 0 ? (
              trendData.trendUp.map((trend, index) => (
                <div
                  key={trend.label}
                  className="bg-gray-0 p-2 rounded text-center h-full shadow-lg hover:bg-[#235347]/20"
                >
                  <h3 className="text-md font-medium">{trend.label}</h3>
                  <p className="text-3xl font-bold text-gray-800 p-3">
                    <ChevronDoubleUpIcon className="h-14 w-14 inline-block text-green-500" />
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center p-4 col-span-3">No upward trends</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 h-[40%]">
            {trendData.trendDown.length > 0 ? (
              trendData.trendDown.map((trend, index) => (
                <div
                  key={trend.label}
                  className="bg-gray-0 p-2 rounded text-center h-full shadow-lg hover:bg-[#235347]/20"
                >
                  <h3 className="text-md font-medium">{trend.label}</h3>
                  <p className="text-3xl font-bold text-gray-800 p-3">
                    <ChevronDoubleDownIcon className="h-14 w-14 inline-block text-red-500" />
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center p-4 col-span-3">No downward trends</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Trends;