// In src/components/teams/teams_components/TeamNewsfeed.js
import React, { useState, useEffect } from 'react';

const TeamNewsfeed = ({ teamData, year }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      console.log('Fetching newsfeed for teamId:', teamData.id, 'year:', year); // Debug log
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/teams/${teamData.id}/${year}/newsfeed`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch newsfeed: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log('Newsfeed data received:', data); // Debug log
        setNews(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [teamData, year]);

  if (loading) return <div className="p-2 text-gray-500">Loading newsfeed...</div>;
  if (error) return <div className="p-2 text-red-500">Error: {error}</div>;

  return (
    <div>
      <h3 className="text-md font-semibold mb-2">Newsfeed</h3>
      <ul className="list-disc pl-5">
        {news.map((item, index) => (
          <li key={index} className="mb-2">
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline">
              {item.title} ({item.pubDate})
            </a>
          </li>
        ))}
      </ul>
      {news.length === 0 && <p>No news available</p>}
    </div>
  );
};

export default TeamNewsfeed;