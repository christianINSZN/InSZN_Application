import React, { useState, useEffect } from 'react';

const TeamStats = ({ teamData }) => {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTweets = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams_feeds/${teamData.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch tweets: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        setTweets(data.slice(0, 5)); // Top 5 tweets
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (teamData?.id) {
      fetchTweets();
    } else {
      setError('Invalid team data');
      setLoading(false);
    }
  }, [teamData.id]);

  if (loading) return <div className="p-2 text-gray-500">Loading tweets...</div>;
  if (error) return <div className="p-2 text-red-500">Error: {error}</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Latest Tweets</h2>
      {tweets.length === 0 ? (
        <p className="text-gray-500">No tweets available</p>
      ) : (
        tweets.map(tweet => (
          <div key={tweet.id} className="mb-4 p-2 border rounded">
            <p className="font-bold text-gray-800">{tweet.user.name}</p>
            <p className="text-gray-700">{tweet.text}</p>
            <a
              href={tweet.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 underline"
            >
              View on X
            </a>
          </div>
        ))
      )}
    </div>
  );
};

export default TeamStats;