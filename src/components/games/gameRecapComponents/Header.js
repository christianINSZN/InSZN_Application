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
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/player_metadata_qb/${playerId}`);
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
    <div className="bg-gradient-to-r from-gray-100 to-white p-6 rounded-xl shadow-xl mb-6 grid grid-cols-[3fr_2fr] gap-6 items-center">
      {/* Left Column: Player Info */}
      <div className="space-y-4">
        <div className="flex items-center space-x-6">
          {/* Headshot Image */}
          {(fetchedHeadshotURL || headshotURL) && (
            <img
              src={fetchedHeadshotURL || headshotURL}
              alt={`${firstName} ${lastName} headshot`}
              className="w-30 h-20 object-cover"
            />
          )}
          {/* Container for First and Last Name */}
          <div>
            <h1 className="text-3xl text-gray-900">{firstName}</h1>
            <h2 className="text-4xl font-semibold text-gray-700">{lastName}</h2>
          </div>
          {/* Vertical Line */}
          <div className="h-20 border-l-2 border-gray-400"></div>
          {/* Container for Metadata */}
          <div className="flex flex-col text-lg text-gray-600">
            <span>{school || 'N/A'} · {position || 'N/A'} · #{jersey || 'N/A'}</span>
            <span className="text-md text-gray-500">{height ? `${height}in` : 'N/A'} · {weight ? `${weight}lbs` : 'N/A'}</span>
          </div>
        </div>
      </div>
      {/* Right Column: Stats */}
      <div className="space-y-4">
        <p className="text-md text-gray-600 text-center">{year || 'N/A'} Season</p>
        <div className="flex justify-around">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{gradesData.yards || 'N/A'}</p>
            <p className="text-md text-gray-600">Yards</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{gradesData.touchdowns || 'N/A'}</p>
            <p className="text-md text-gray-600">TD</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{gradesData.interceptions || 'N/A'}</p>
            <p className="text-md text-gray-600">INT</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{gradesData.grades_pass || 'N/A'}</p>
            <p className="text-md text-gray-600">Pass Grade</p>
          </div>
        </div>
      </div>
      {loading && <div className="flex justify-center mt-4"><div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div></div>}
      {error && <div className="text-red-500 text-center mt-4">{error}</div>}
    </div>
  );
};

export default Header;