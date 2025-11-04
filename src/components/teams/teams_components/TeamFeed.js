import React, { useState, useEffect } from 'react';

const TeamStats = ({ teamData }) => {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

    return (
    <div className="p-0 shadow-xl rounded-lg h-[full]">
      <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-[#235347] text-xl text-center">TEAM FEED COMING SOON</p>
      </div>
    </div>
  );
}

export default TeamStats;