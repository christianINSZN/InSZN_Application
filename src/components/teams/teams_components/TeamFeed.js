import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

const TeamFeed = ({ teamData, year }) => {
  const { user, isSignedIn, isLoaded } = useUser();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [author, setAuthor] = useState('Anonymous');
  const [loading, setLoading] = useState(true);

  const postId = `/teams/${teamData.id}/${year}`;
  const apiUrl = process.env.REACT_APP_API_URL;

  // Auto-set author when Clerk loads
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      setAuthor(name || user.username || user.primaryEmailAddress?.emailAddress || 'User');
    }
  }, [isLoaded, isSignedIn, user]);

  // Load comments
  useEffect(() => {
    fetch(`${apiUrl}/api/comments?postId=${encodeURIComponent(postId)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [postId, apiUrl]);

  // Post comment
  const postComment = () => {
    if (!newComment.trim()) return;

    fetch(`${apiUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId,
        content: newComment.trim(),
        authorName: author
      })
    })
      .then(r => r.json())
      .then(c => {
        setComments([c, ...comments]);
        setNewComment('');
      })
      .catch(console.error);
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
        setComments(comments.map(c =>
          c.id === id ? { ...c, upvoteCount } : c
        ));
      });
  };

  if (loading) return <p className="p-4 text-gray-500">Loading comments...</p>;

  return (
    <div className="h-[300px] overflow-auto bg-white rounded-lg p-4 text-sm">
      <div className="mb-4 space-y-2">
        {isSignedIn ? (
          <div className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
            Signed in as: <strong>{author}</strong>
          </div>
        ) : (
          <input
            placeholder="Your name (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="border rounded px-2 py-1 text-xs w-full max-w-xs"
          />
        )}

        <textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="border rounded p-2 w-full text-sm resize-none h-20"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              postComment();
            }
          }}
        />

        <button
          onClick={postComment}
          disabled={!newComment.trim()}
          className="bg-[#235347] hover:bg-[#1a3d32] text-white px-4 py-1.5 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Post Comment
        </button>
      </div>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="border-b border-gray-200 pb-3 last:border-0">
              <div className="flex justify-between items-start">
                <div>
                  <strong className="text-[#235347]">{c.authorName}</strong>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => upvote(c.id)}
                  className="text-xs text-gray-600 hover:text-[#235347] flex items-center gap-1"
                >
                  Up {c.upvoteCount || 0}
                </button>
              </div>
              <p className="mt-1 text-gray-800">{c.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamFeed;