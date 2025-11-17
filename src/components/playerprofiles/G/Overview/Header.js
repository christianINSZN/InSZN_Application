import React, { useState, useEffect } from 'react';

const Header = ({ firstName, lastName, school, position, jersey, height, weight, year, gradesData = {}, headshotURL, playerId }) => {
  const [fetchedHeadshotURL, setFetchedHeadshotURL] = useState(headshotURL || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMobile = window.innerWidth < 640;

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (playerId) {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/player_metadata_g/${playerId}`, {
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
    <div className={isMobile ? "bg-gray-100 p-4 rounded-xl shadow-xl mt-2 mb-4 grid grid-cols-1 gap-4 items-center" : "bg-gray-100 p-6 rounded-xl shadow-xl mt-3 mb-6 grid grid-cols-[3fr_2fr] gap-6 items-center"}>
      {/* Left Column: Player Info */}
      <div className={isMobile ? "space-y-2" : "space-y-4"}>
        <div className={isMobile ? "flex items-center space-x-4" : "flex items-center space-x-6"}>
          {/* Headshot Image */}
          {(fetchedHeadshotURL || headshotURL) && (
            <img
              src={fetchedHeadshotURL || headshotURL}
              alt={`${firstName} ${lastName} headshot`}
              className={isMobile ? "w-20 h-16 object-cover" : "w-30 h-20 object-cover"}
            />
          )}
          {/* Container for First and Last Name */}
          <div>
            <h1 className={isMobile ? "text-xl text-gray-900" : "text-3xl text-gray-900"}>{firstName}</h1>
            <h2 className={isMobile ? "text-2xl font-semibold text-gray-700" : "text-4xl font-semibold text-gray-700"}>{lastName}</h2>
          </div>
          {/* Vertical Line */}
          <div className={isMobile ? "h-16 border-l-2 border-[#235347]" : "h-20 border-l-2 border-[#235347]"}></div>
          {/* Container for Metadata */}
          <div className={isMobile ? "flex flex-col text-sm text-gray-600" : "flex flex-col text-lg text-gray-600"}>
            <span>{school || 'N/A'} · {position || 'N/A'} · #{jersey || 'N/A'}</span>
            <span className={isMobile ? "text-xs text-gray-500" : "text-md text-gray-500"}>{height ? `${height}in` : 'N/A'} · {weight ? `${weight}lbs` : 'N/A'}</span>
          </div>
        </div>
      </div>
      {/* Right Column: Stats */}
      <div className="space-y-2 bg-gray-100 rounded-xl shadow-md">
        <p className={isMobile ? "flex items-center justify-center text-xs bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[20px] rounded" : "flex items-center justify-center text-sm bg-[#235347] font-bold text-white shadow-lg border-b border-[#235347] h-[20px] rounded"}>{year || 'N/A'} Season</p>
        <div className={isMobile ? "flex flex-row gap-2 overflow-x-auto" : "flex flex-row gap-0 justify-around"}>
          <div className="text-center min-w-[80px]">
            <p className={isMobile ? "text-lg font-bold text-gray-800" : "text-2xl font-bold text-gray-800"}>{gradesData.snap_counts_offense || 'N/A'}</p>
            <p className={isMobile ? "text-xs text-gray-600" : "text-md text-gray-600"}>Snaps</p>
          </div>
          <div className="text-center min-w-[80px]">
            <p className={isMobile ? "text-lg font-bold text-gray-800" : "text-2xl font-bold text-gray-800"}>{gradesData.sacks_allowed || 'N/A'}</p>
            <p className={isMobile ? "text-xs text-gray-600" : "text-md text-gray-600"}>Sacks</p>
          </div>
          <div className="text-center min-w-[80px]">
            <p className={isMobile ? "text-lg font-bold text-gray-800" : "text-2xl font-bold text-gray-800"}>{gradesData.grades_offense || 'N/A'}</p>
            <p className={isMobile ? "text-xs text-gray-600" : "text-md text-gray-600"}>Block Grade</p>
          </div>
          <div className="text-center min-w-[80px]">
            <p className={isMobile ? "text-lg font-bold text-gray-800" : "text-2xl font-bold text-gray-800"}>{gradesData.pbe || 'N/A'}</p>
            <p className={isMobile ? "text-xs text-gray-600" : "text-md text-gray-600"}>PBE</p>
          </div>
        </div>
      </div>
      {loading && (
        <div className={isMobile ? "flex justify-center mt-2" : "flex justify-center mt-4"}>
          <div className={isMobile ? "w-5 h-5 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin" : "w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"}></div>
        </div>
      )}
      {error && (
        <div className={isMobile ? "text-red-500 text-center text-sm mt-2" : "text-red-500 text-center text-base mt-4"}>{error}</div>
      )}
    </div>
  );
};

export default Header;