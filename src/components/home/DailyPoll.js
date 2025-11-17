// PollWidget.jsx – Guests vote once (localStorage), results persist
import React, { useState, useEffect } from 'react';

const PollWidget = ({ slug }) => {
  const [poll, setPoll] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const apiUrl = process.env.REACT_APP_API_URL;

  const STORAGE_KEY = `poll_${slug}_voted`;

  useEffect(() => {
    // Check if guest has voted before
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') {
      setHasVoted(true);
    }
    fetchPoll();
  }, [slug]);

  const fetchPoll = async () => {
    try {
      const r = await fetch(`${apiUrl}/api/poll/${slug}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setPoll(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const vote = async () => {
    if (hasVoted || selected == null) return;

    try {
      await fetch(`${apiUrl}/api/poll/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: poll.id,
          optionIndex: selected,
          userId: null, // guest
        }),
      });
      setHasVoted(true);
      localStorage.setItem(STORAGE_KEY, 'true'); // remember
      fetchPoll(); // refresh tally
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p className="text-center text-sm">Loading...</p>;
  if (!poll) return <p className="text-center text-sm">Poll not found.</p>;

  return (
    <div className="bg-white rounded-lg p-5 shadow-md max-w-md mx-auto">
      <h3 className="font-bold text-xl text-center mb-4 text-[#235347]">{poll.question}</h3>

      {!hasVoted ? (
        <div className="space-y-3">
          {poll.options.map((opt, i) => (
            <label key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
              <div className="flex items-center">
                <input
                  type="radio"
                  name={`poll-${poll.id}`}
                  value={i}
                  checked={selected === i}
                  onChange={() => setSelected(i)}
                  className="mr-3 h-4 w-4 text-[#235347]"
                />
                <span className="text-sm font-medium">{opt}</span>
              </div>
            </label>
          ))}
          <button
            onClick={vote}
            disabled={selected == null}
            className="w-full mt-4 bg-[#235347] hover:bg-[#1a3d32] text-white font-semibold py-2.5 rounded-lg disabled:opacity-50 transition"
          >
            Submit Vote
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {poll.options.map((opt, i) => {
            const votes = poll.tally[i];
            const percent = poll.totalVotes ? (votes / poll.totalVotes * 100).toFixed(1) : 0;
            return (
              <div key={i} className="flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{opt}</span>
                  <span className="text-sm font-semibold">{percent}% ({votes})</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-[#235347] h-3 rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-center text-sm text-green-600 font-medium mt-4">Thanks for voting!</p>
        </div>
      )}
    </div>
  );
};

export default PollWidget;