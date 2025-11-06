// DailyPoll.jsx
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

const DailyPoll = () => {
  const { user, isSignedIn } = useUser();
  const [poll, setPoll] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetchPoll();
  }, []);

  const fetchPoll = () => {
    fetch(`${apiUrl}/api/poll`)
      .then(r => r.json())
      .then(data => {
        setPoll(data);
        if (isSignedIn) checkVoted(data.id);
      })
      .finally(() => setLoading(false));
  };

  const checkVoted = (pollId) => {
    // Check server if user has voted
    fetch(`${apiUrl}/api/poll/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, optionIndex: -1, userId: user.id }),
    }).catch(() => {})
      .then(() => setHasVoted(true));
  };

  const vote = () => {
    if (!isSignedIn) return alert('Sign in to vote');
    if (hasVoted || selected == null) return;

    fetch(`${apiUrl}/api/poll/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pollId: poll.id,
        optionIndex: selected,
        userId: user.id,
      }),
    })
      .then(() => {
        setHasVoted(true);
        fetchPoll(); // Refresh tally
      });
  };

  if (loading) return <p>Loading poll...</p>;
  if (!poll) return <p>No poll today.</p>;

  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <h3 className="font-bold text-lg mb-3">{poll.question}</h3>

      {!hasVoted ? (
        <div className="space-y-2">
          {poll.options.map((opt, i) => (
            <label key={i} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="poll"
                value={i}
                checked={selected === i}
                onChange={() => setSelected(i)}
                className="mr-2"
              />
              {opt}
            </label>
          ))}
          <button
            onClick={vote}
            disabled={selected == null}
            className="mt-3 bg-[#235347] text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Submit Vote
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {poll.options.map((opt, i) => {
            const votes = poll.tally[i];
            const percent = poll.totalVotes ? (votes / poll.totalVotes * 100).toFixed(1) : 0;
            return (
              <div key={i} className="flex justify-between items-center">
                <span>{opt}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#235347] h-2 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-sm">{percent}% ({votes})</span>
                </div>
              </div>
            );
          })}
          <p className="text-sm text-green-600 mt-3">Thanks for voting!</p>
        </div>
      )}
    </div>
  );
};

export default DailyPoll;