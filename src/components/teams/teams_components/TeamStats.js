import React, { useState, useEffect } from 'react';

const TeamStats = ({ teamData, year }) => {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTweets = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${teamData.id}/${year}/tweets`);
        if (!response.ok) throw new Error('Failed to fetch tweets');
        const data = await response.json();
        setTweets(data.slice(0, 5)); // Top 5 tweets
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTweets();
  }, [teamData.id, year]);

  if (loading) return <div>Loading tweets...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Latest Tweets</h2>
      {tweets.map(tweet => (
        <div key={tweet.id} className="mb-4 p-2 border rounded">
          <p className="font-bold">{tweet.user.name}</p>
          <p>{tweet.text}</p>
          <a href={tweet.link} target="_blank" rel="noopener noreferrer">View</a>
        </div>
      ))}
    </div>
  );
};

export default TeamStats;