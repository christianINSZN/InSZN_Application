import React, { useEffect, useMemo, useState, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const conferences = [
  'ACC', 'American Athletic', 'Big 12', 'Big Ten', 'Conference USA',
  'FBS Independents', 'Mid-American', 'Mountain West',
  'Pac-12', 'SEC', 'Sun Belt'
];

const filterTabs = ['All', 'Top 25', ...conferences];

const weeks = Array.from({ length: 15 }, (_, i) => i + 1);

function GamesComponent({ year = '2025' }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [gamesData, setGamesData] = useState([]);
  const [activeWeek, setActiveWeek] = useState(8);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    let isMounted = true;
    if (isLoading) {
      fetch(`${process.env.REACT_APP_API_URL}/api/games?year=${year}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(text => {
          if (isMounted) {
            try {
              const data = JSON.parse(text);
              const validData = Array.isArray(data) ? data.filter(game => game && typeof game === 'object') : [];
              setGamesData(validData);
            } catch (e) {
              console.error('JSON parsing error:', e.message, 'Raw response:', text);
            } finally {
              setIsLoading(false);
            }
          }
        })
        .catch(error => {
          if (isMounted) {
            console.error('API error:', error);
            setIsLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isLoading, year]);

  if (isLoading) {
    return <div className="p-4"><p className="text-black text-base sm:text-lg">Loading games...</p></div>;
  }

  if (gamesData.length === 0) {
    return <div className="p-4"><p className="text-black text-base sm:text-lg">No games data available.</p></div>;
  }

  return (
    <div className="p-2 sm:p-4 shadow-xl rounded-lg mt-0 sm:mt-12">
      <div className="mb-4 sm:mb-6 mt-3 gap-4 items-end bg-gray-200 p-2 sm:p-4 rounded-lg shadow-xl">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="w-full">
            <label htmlFor="yearSelect" className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              id="yearSelect"
              value={year}
              onChange={(e) => navigate(`/games/${e.target.value}`)}
              className="w-full p-3 sm:p-2 border border-gray-300 rounded text-black text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#235347]"
            >
              <option value="2025">2025</option>
            </select>
          </div>
        </div>
      </div>
      <div className="border-b border-gray-300 mb-4 sm:mb-6">
        <div className="overflow-x-auto whitespace-nowrap py-2">
          <ul className="flex gap-2 sm:gap-4 justify-start sm:justify-center p-2 sm:p-4">
            {weeks.map(week => (
              <li key={week}>
                <button
                  className={`text-black hover:text-gray-900 pb-2 border-b-2 text-sm sm:text-base px-2 sm:px-3 py-1 rounded ${activeWeek === week ? 'border-[#235347] bg-[#235347]/10' : 'border-transparent hover:border-[#235347]'}`}
                  onClick={() => setActiveWeek(week)}
                >
                  Week {week}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-b border-gray-300 mb-4 sm:mb-6">
        <div className="overflow-x-auto whitespace-nowrap py-2">
          <ul className="flex gap-2 sm:gap-4 justify-start sm:justify-center p-2 sm:p-4">
            {filterTabs.map(tab => (
              <li key={tab}>
                <button
                  className={`text-black hover:text-gray-900 pb-2 border-b-2 text-sm sm:text-base px-2 sm:px-3 py-1 rounded ${activeTab === tab ? 'border-[#235347] bg-[#235347]/10' : 'border-transparent hover:border-[#235347]'}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 p-2 sm:p-4">
        {/* Placeholder for games content */}
        <p>Games content here, filtered by Week {activeWeek} and {activeTab}</p>
      </div>
    </div>
  );
}

export default memo(GamesComponent);