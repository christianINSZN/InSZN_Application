import React, { useState, useEffect } from 'react';
import { ChevronDoubleUpIcon, ChevronDoubleDownIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

const Trends = ({ teamGames, weeklyGrades }) => {
  const { user } = useClerk();
  const subscriptionPlan = user?.publicMetadata?.subscriptionPlan;
  const isSubscribed = subscriptionPlan === 'pro' || subscriptionPlan === 'premium';
  const isPremium = isSubscribed;

  const [trendData, setTrendData] = useState({
    trendUp: [],
    trendDown: [],
  });

  useEffect(() => {
    if (teamGames && weeklyGrades && teamGames.length >= 1) {
      const metrics = {
        'snap_counts_defense': 'Snap Count',
        'grades_pass_rush_defense': 'Pass Rush Grade',
        'snap_counts_coverage': 'Coverage Rate',
        'grades_coverage_defense': 'Coverage Grade',
        'grades_tackle': 'Tackling',
        'forced_incompletion_rate': 'Force Inc. (%)',
        'avg_depth_of_target': 'Avg. Depth (yd)',
        'missed_tackles': 'Missed Tackles',
        'yards_after_catch': 'YAC Allowed',
        'coverage_snaps_per_target': 'Snaps/Target',
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

      const trends = {};
      Object.keys(metrics).forEach(metric => {
        const values = gamesWithStats
          .map(game => {
            const grade = weeklyGrades[game.key];
            return grade && grade[metric] !== undefined && grade[metric] !== null ? grade[metric] : null;
          })
          .filter(value => value !== null);

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
        } else if (values.length === 1) {
          trends[metric] = { label: metrics[metric], value: 0 };
        }
      });

      const trendArray = Object.values(trends).sort((a, b) => b.value - a.value);
      const trendUp = trendArray.filter(trend => trend.value >= 0).slice(0, 3);
      const trendDown = trendArray.filter(trend => trend.value < 0).slice(-3).reverse();

      setTrendData({ trendUp, trendDown });
    }
  }, [teamGames, weeklyGrades]);

  return (
    <div className="bg-white rounded-lg shadow-lg relative">
      <h2 className="flex items-center justify-center text-xl bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[40px] rounded">Trends (3 Game)</h2>
      <div className="relative">
        {isPremium ? (
          <>
            {trendData.trendUp.length === 0 && trendData.trendDown.length === 0 ? (
              <p className="text-gray-500 text-center p-4 text-sm sm:text-base">Trends populate after 3 played games</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4 h-[40%]">
                  {trendData.trendUp.length > 0 ? (
                    trendData.trendUp.map((trend, index) => (
                      <div key={trend.label} className="bg-gray-0 p-2 rounded text-center h-full shadow-lg">
                        <h3 className="text-sm sm:text-md font-medium">{trend.label}</h3>
                        <p className="text-3xl font-bold text-gray-800 p-3">
                          <ChevronDoubleUpIcon className="h-14 w-14 inline-block text-green-500" />
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center p-4 col-span-3 text-sm sm:text-base">No upward trends</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 h-[40%]">
                  {trendData.trendDown.length > 0 ? (
                    trendData.trendDown.map((trend, index) => (
                      <div key={trend.label} className="bg-gray-0 p-2 rounded text-center h-full shadow-lg">
                        <h3 className="text-sm sm:text-md font-medium">{trend.label}</h3>
                        <p className="text-3xl font-bold text-gray-800 p-3">
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
          </>
        ) : (
          <div className="relative">
            <div className="filter blur-xs opacity-80">
              {trendData.trendUp.length === 0 && trendData.trendDown.length === 0 ? (
                <p className="text-gray-500 text-center p-4 text-sm sm:text-base">Trends populate after 3 played games</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4 h-[40%]">
                    {trendData.trendUp.length > 0 ? (
                      trendData.trendUp.map((trend, index) => (
                        <div key={trend.label} className="bg-gray-0 p-2 rounded text-center h-full shadow-lg">
                          <h3 className="text-sm sm:text-md font-medium">{trend.label}</h3>
                          <p className="text-3xl font-bold text-gray-800 p-3">
                            <ChevronDoubleUpIcon className="h-14 w-14 inline-block text-green-500" />
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center p-4 col-span-3 text-sm sm:text-base">No upward trends</p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 h-[40%]">
                    {trendData.trendDown.length > 0 ? (
                      trendData.trendDown.map((trend, index) => (
                        <div key={trend.label} className="bg-gray-0 p-2 rounded text-center h-full shadow-lg">
                          <h3 className="text-sm sm:text-md font-medium">{trend.label}</h3>
                          <p className="text-3xl font-bold text-gray-800 p-3">
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
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-filter backdrop-blur-sm rounded-b-lg">
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
      </div>
    </div>
  );
};

export default Trends;