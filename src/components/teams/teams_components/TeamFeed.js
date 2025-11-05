import React, { useState, useEffect } from 'react';

const TeamFeed = ({ teamData, year }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [author, setAuthor] = useState('Anonymous');
  const [loading, setLoading] = useState(true);

  const postId = `/teams/${teamData.id}/${year}`;
  const apiUrl = process.env.REACT_APP_API_URL;

  // Load comments
  useEffect(() => {
    fetch(`${apiUrl}/api/comments?postId=${postId}`)
      .then(r => r.json())
      .then(setComments)
      .finally(() => setLoading(false));
  }, [postId, apiUrl]);

  // Post comment
  const postComment = () => {
    if (!newComment.trim()) return;
    fetch(`${apiUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, content: newComment, authorName: author })
    })
      .then(r => r.json())
      .then(c => {
        setComments([c, ...comments]);
        setNewComment('');
      });
  };

  // Upvote
  const upvote = (id) => {
    fetch(`${apiUrl}/api/upvotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: id })
    })
      .then(r => r.json())
      .then(({ upvoteCount }) => {
        setComments(comments.map(c => c.id === id ? { ...c, upvoteCount } : c));
      });
  };

  if (loading) return <p className="p-4">Loading comments...</p>;

  return (
    <div className="h-[300px] overflow-auto bg-white rounded-lg p-4 text-sm">
      <div className="mb-3">
        <input
          placeholder="Your name (optional)"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          className="border p-1 mr-2 w-32"
        />
        <textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          className="border p-1 w-full mb-1"
        />
        <button onClick={postComment} className="bg-[#235347] text-white px-3 py-1 rounded">
          Post
        </button>
      </div>

      {comments.map(c => (
        <div key={c.id} className="border-b py-2">
          <div className="flex justify-between">
            <strong>{c.authorName}</strong>
            <button onClick={() => upvote(c.id)} className="text-xs">
              ↑ {c.upvoteCount || 0}
            </button>
          </div>
          <p>{c.content}</p>
        </div>
      ))}
    </div>
  );
};

export default TeamFeed;