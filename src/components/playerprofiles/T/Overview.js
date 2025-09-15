// In src/components/players/OverviewPlayer.js
import React from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';

function OverviewT() {
  const { playerId, position } = useParams();
  const location = useLocation();

  // Placeholder for active tab logic (simplified without state)
  const isOverviewActive = location.pathname === `/players/${position}/${playerId}`;
  const isAnalyticsActive = location.pathname === `/players/${position}/${playerId}/analytics`;
  const isFieldViewActive = location.pathname === `/players/${position}/${playerId}/fieldview`;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="px-4 py-6">
        <div className="p-4 bg-white rounded-lg shadow mb-4">
          {/* Placeholder for Header */}
          <div className="h-20 flex items-center justify-center text-gray-500">
            [Header: Player Name, Team, Position, Jersey, Height, Weight]
          </div>
        </div>
        <div className="border-b border-gray-300 mb-4">
          <ul className="flex gap-4">
            <li>
              <Link
                to={`/players/${position}/${playerId}`}
                className={`text-blue-500 hover:text-blue-700 pb-2 border-b-2 ${isOverviewActive ? 'border-blue-500' : 'border-transparent hover:border-blue-500'}`}
              >
                Overview
              </Link>
            </li>
            <li>
              <Link
                to={`/players/${position}/${playerId}/analytics`}
                className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${isAnalyticsActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
              >
                Analytics
              </Link>
            </li>
            <li>
              <Link
                to={`/players/${position}/${playerId}/fieldview`}
                className={`text-gray-500 hover:text-gray-700 pb-2 border-b-2 ${isFieldViewActive ? 'border-gray-500' : 'border-transparent hover:border-gray-500'}`}
              >
                FieldView
              </Link>
            </li>
          </ul>
        </div>
        <div className="grid grid-cols-[70%_30%] gap-4 w-full">
          <div className="space-y-4">
            {/* Placeholder for MatchupProjection */}
            <div className="p-4 bg-white rounded-lg shadow min-h-[200px] flex items-center justify-center text-gray-500">
              [MatchupProjection Container]
            </div>
            {/* Placeholder for GameLog */}
            <div className="p-4 bg-white rounded-lg shadow min-h-[300px] flex items-center justify-center text-gray-500">
              [GameLog Container]
            </div>
            {/* Placeholder for HeadlineGrades */}
            <div className="p-4 bg-white rounded-lg shadow min-h-[200px] flex items-center justify-center text-gray-500">
              [HeadlineGrades Container]
            </div>
          </div>
          <div className="grid grid-rows-[1fr_1fr] gap-4 h-full">
            {/* Placeholder for AttributionRadial */}
            <div className="p-4 bg-white rounded-lg shadow min-h-[full] flex items-center justify-center text-gray-500 row-span-2">
              [AttributionRadial Container]
            </div>
            {/* Placeholder for Trends */}
            <div className="p-4 bg-white rounded-lg shadow flex items-center justify-center text-gray-500">
              [Trends Container]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewT;