import React, { useEffect, useState } from 'react';
import { ChevronDoubleUpIcon, ChevronDoubleDownIcon } from '@heroicons/react/24/solid';

const Trends = ({ teamGames, weeklyGrades }) => {
  const [trendData, setTrendData] = useState({
    trendUp: [],
    trendDown: [],
  });

  useEffect(() => {
    if (teamGames && weeklyGrades) {
      // Sort games by startDate to get the most recent 3 in chronological order
      const recentGames = [...teamGames]
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(-3);

      // Relevant metrics for QB trends
      const metrics = {
        'grades_pass': 'Pass Grade',
        'grades_run': 'Rush Grade',
        'accuracy_percent': 'Accuracy %',
        'completion_percent': 'Completion %',
        'avg_time_to_throw': 'Throw Time',
        'avg_depth_of_target': 'Target Depth',
        'yards': 'Yards',
        'ypa': 'YPA'
      };

      // Calculate trends (weighted percentage growth) for the last 3 games
      const trends = {};
      Object.keys(metrics).forEach(metric => {
        const values = recentGames
          .map(game => {
            const key = `${game.week}_${game.seasonType}`;
            const grade = weeklyGrades[key];
            return grade && grade[metric] !== undefined && grade[metric] !== null ? grade[metric] : null;
          })
          .filter(value => value !== null);

        if (values.length >= 2) { // Need at least 2 points for trend
          const startValue = values[0]; // Week 1 value
          const midValue = values[1]; // Week 2 value
          const endValue = values[values.length - 1]; // Week 3 value
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
        }
      });

      // Convert to array and sort by weighted trend
      const trendArray = Object.values(trends).sort((a, b) => b.value - a.value);
      const trendUp = trendArray.filter(trend => trend.value >= 0).slice(0, 3); // Positive trends
      const trendDown = trendArray.filter(trend => trend.value < 0).slice(-3).reverse(); // Negative trends
      setTrendData({ trendUp, trendDown });
    }
  }, [teamGames, weeklyGrades]);

  return (
    <div className="h-80 bg-white rounded-lg shadow-lg">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">3-Game Trends</h2>
      <div className="grid grid-cols-3 gap-4 mb-4 h-[40%]">
        {trendData.trendUp.map((trend, index) => (
          <div
            key={trend.label}
            className="bg-gray-0 p-2 rounded text-center h-full shadow-lg"
          >
            <h3 className="text-md font-medium">{trend.label}</h3>
            <p className="text-3xl font-bold text-gray-800 p-3">
              <ChevronDoubleUpIcon className="h-14 w-14 inline-block text-green-500" />
            </p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 h-[40%]">
        {trendData.trendDown.map((trend, index) => (
          <div
            key={trend.label}
            className="bg-gray-0 p-2 rounded text-center h-full shadow-lg"
          >
            <h3 className="text-md font-medium">{trend.label}</h3>
            <p className="text-3xl font-bold text-gray-800 p-3">
              <ChevronDoubleDownIcon className="h-14 w-14 inline-block text-red-500" />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Trends;