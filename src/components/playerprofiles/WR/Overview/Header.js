import React, { useState, useEffect } from 'react';

const Header = ({ firstName, lastName, school, position, jersey, height, weight, year, gradesData = {}, headshotURL, playerId }) => {
  const [fetchedHeadshotURL, setFetchedHeadshotURL] = useState(headshotURL || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (playerId) {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/player_metadata_wr/${playerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (data.length > 0) {
            setFetchedHeadshotURL(data[0].headshotURL || '');
          } else {
            setError('Player not found');
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setFetchedHeadshotURL(headshotURL || '');
        setError(null);
      }
    };
    fetchPlayerData();
  }, [playerId, headshotURL]);

  return (
    <div className="bg-gray-100 p-2 sm:p-4 rounded-xl shadow-xl mt-2 sm:mt-3 mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-2 sm:gap-4 items-center">
      {/* Left Column: Player Info */}
      <div className="space-y-2 sm:space-y-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Headshot Image */}
          {(fetchedHeadshotURL || headshotURL) && (
            <img
              src={fetchedHeadshotURL || headshotURL}
              alt={`${firstName} ${lastName} headshot`}
              className="w-20 sm:w-30 h-16 sm:h-20 object-cover"
            />
          )}
          {/* Container for First and Last Name */}
          <div>
            <h1 className="text-xl sm:text-3xl text-gray-900">{firstName}</h1>
            <h2 className="text-2xl sm:text-4xl font-semibold text-gray-700">{lastName}</h2>
          </div>
          {/* Vertical Line */}
          <div className="h-16 sm:h-20 border-l-2 border-[#235347]"></div>
          {/* Container for Metadata */}
          <div className="flex flex-col text-sm sm:text-lg text-gray-600">
            <span>{school || 'N/A'} · {position || 'N/A'} · #{jersey || 'N/A'}</span>
            <span className="text-xs sm:text-md text-gray-500">{height ? `${height}in` : 'N/A'} · {weight ? `${weight}lbs` : 'N/A'}</span>
          </div>
        </div>
      </div>
      {/* Right Column: Stats */}
      <div className="space-y-2 bg-gray-100 rounded-xl shadow-md">
        <p className="flex items-center justify-center text-xs sm:text-sm bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[20px] rounded">{year || 'N/A'} Season</p>
        <div className="flex flex-row gap-2 sm:flex-row sm:gap-0 sm:justify-around overflow-x-auto">
          <div className="text-center min-w-[80px]">
            <p className="text-lg sm:text-2xl font-bold text-gray-800">{gradesData.yards || 'N/A'}</p>
            <p className="text-xs sm:text-md text-gray-600">Yards</p>
          </div>
          <div className="text-center min-w-[80px]">
            <p className="text-lg sm:text-2xl font-bold text-gray-800">{gradesData.touchdowns || 'N/A'}</p>
            <p className="text-xs sm:text-md text-gray-600">TD</p>
          </div>
          <div className="text-center min-w-[80px]">
            <p className="text-lg sm:text-2xl font-bold text-gray-800">{gradesData.receptions || 'N/A'}</p>
            <p className="text-xs sm:text-md text-gray-600">Receptions</p>
          </div>
          <div className="text-center min-w-[80px]">
            <p className="text-lg sm:text-2xl font-bold text-gray-800">{gradesData.grades_pass_route || 'N/A'}</p>
            <p className="text-xs sm:text-md text-gray-600">Rec. Grade</p>
          </div>
        </div>
      </div>
      {loading && <div className="flex justify-center mt-2 sm:mt-4"><div className="w-5 sm:w-6 h-5 sm:h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div></div>}
      {error && <div className="text-red-500 text-center text-sm sm:text-base mt-2 sm:mt-4">{error}</div>}
    </div>
  );
};

export default Header;