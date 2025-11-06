import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

const TeamFeed = ({ teamData, year }) => {
  const { user, isSignedIn, isLoaded } = useUser();

  const [comments, setComments] = useState([]);        // top-level
  const [replies, setReplies] = useState({});          // {commentId: [replies]}
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // commentId
  const [author, setAuthor] = useState('Anonymous');
  const [loading, setLoading] = useState(true);

  const postId = `/teams/${teamData.id}/${year}`;
  const apiUrl = process.env.REACT_APP_API_URL;

  // ---- Clerk name -------------------------------------------------
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      setAuthor(name || user.username || user.primaryEmailAddress?.emailAddress || 'User');
    }
  }, [isLoaded, isSignedIn, user]);

  // ---- Load top-level comments ------------------------------------
  useEffect(() => {
    fetch(`${apiUrl}/api/comments?postId=${encodeURIComponent(postId)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [postId, apiUrl]);

  // ---- Load replies when a thread is opened -----------------------
  const loadReplies = (commentId) => {
    if (replies[commentId]) return;
    fetch(`${apiUrl}/api/replies?parentId=${commentId}`)
      .then(r => r.json())
      .then(data => setReplies(prev => ({ ...prev, [commentId]: data || [] })));
  };

  // ---- Post top-level comment ------------------------------------
  const postComment = () => {
    if (!newComment.trim()) return;
    const payload = {
      postId,
      content: newComment.trim(),
      authorName: author,
      authorClerkId: isSignedIn ? user.id : null,
    };
    fetch(`${apiUrl}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(c => {
        setComments([c, ...comments]);
        setNewComment('');
      })
      .catch(console.error);
  };

  // ---- Post reply -------------------------------------------------
  const postReply = (parentId) => {
    if (!newComment.trim()) return;
    const payload = {
      postId,
      parentId,
      content: newComment.trim(),
      authorName: author,
      authorClerkId: isSignedIn ? user.id : null,
    };
    fetch(`${apiUrl}/api/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(r => {
        setReplies(prev => ({
          ...prev,
          [parentId]: [...(prev[parentId] || []), r],
        }));
        setNewComment('');
        setReplyingTo(null);
      })
      .catch(console.error);
  };

  // ---- Upvote ------------------------------------------------------
  const upvote = (id) => {
    fetch(`${apiUrl}/api/upvotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: id }),
    })
      .then(r => r.json())
      .then(({ upvoteCount }) => {
        const update = (list) =>
          list.map(c => (c.id === id ? { ...c, upvoteCount } : c));
        setComments(update);
        Object.keys(replies).forEach(k => setReplies(prev => ({ ...prev, [k]: update(prev[k]) })));
      });
  };

  // ---- Delete own comment -----------------------------------------
  const deleteComment = (id, isReply = false) => {
    if (!isSignedIn) return alert('Sign in to delete');
    fetch(`${apiUrl}/api/comments/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
      .then(r => r.json())
      .then(() => {
        if (isReply) {
          setReplies(prev => {
            const copy = { ...prev };
            Object.keys(copy).forEach(k => {
              copy[k] = copy[k].filter(c => c.id !== id);
            });
            return copy;
          });
        } else {
          setComments(prev => prev.filter(c => c.id !== id));
        }
      })
      .catch(console.error);
  };

  // ---- UI ---------------------------------------------------------
  if (loading) return <p className="p-4 text-gray-500">Loading...</p>;

  const Comment = ({ c, depth = 0, parentId = null }) => {
    const isOwner = isSignedIn && c.authorClerkId === user?.id;
    const reps = replies[c.id] || [];

    return (
      <div
        key={c.id}
        className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''} pb-3`}
      >
        <div className="flex justify-between items-start">
          <div>
            <strong className="text-[#235347]">{c.authorName}</strong>
            <span className="text-xs text-gray-500 ml-2">
              {new Date(c.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => upvote(c.id)}
              className="text-xs text-gray-600 hover:text-[#235347] flex items-center gap-1"
            >
              Up {c.upvoteCount || 0}
            </button>
            {isOwner && (
              <button
                onClick={() => deleteComment(c.id, !!parentId)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-gray-800">{c.content}</p>

        {/* Reply form */}
        {replyingTo === c.id ? (
          <div className="mt-2">
            <textarea
              placeholder="Write a reply..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="border rounded p-2 w-full text-sm resize-none h-16"
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => postReply(c.id)}
                disabled={!newComment.trim()}
                className="bg-[#235347] text-white px-3 py-1 rounded text-xs disabled:opacity-50"
              >
                Post Reply
              </button>
              <button
                onClick={() => { setReplyingTo(null); setNewComment(''); }}
                className="text-xs text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setReplyingTo(c.id);
              setNewComment('');
            }}
            className="text-xs text-blue-600 hover:underline mt-1"
          >
            Reply
          </button>
        )}

        {/* Show replies */}
        {reps.length > 0 ? (
          reps.map(r => <Comment key={r.id} c={r} depth={depth + 1} parentId={c.id} />)
        ) : (
          reps.length === 0 && replies[c.id] !== undefined && (
            <p className="text-xs text-gray-400 ml-4">No replies yet.</p>
          )
        )}
        {/* Load replies button */}
        {replies[c.id] === undefined && (
          <button
            onClick={() => loadReplies(c.id)}
            className="text-xs text-gray-500 hover:underline mt-1"
          >
            Show replies
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="h-[300px] overflow-auto bg-white rounded-lg p-4 text-sm">
      {/* New comment */}
      <div className="mb-4 space-y-2">
        {isSignedIn ? (
          <div className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
            Signed in as: <strong>{author}</strong>
          </div>
        ) : (
          <input
            placeholder="Your name (optional)"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            className="border rounded px-2 py-1 text-xs w-full max-w-xs"
          />
        )}
        <textarea
          placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          className="border rounded p-2 w-full text-sm resize-none h-20"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              replyingTo ? postReply(replyingTo) : postComment();
            }
          }}
        />
        <button
          onClick={() => (replyingTo ? postReply(replyingTo) : postComment())}
          disabled={!newComment.trim()}
          className="bg-[#235347] hover:bg-[#1a3d32] text-white px-4 py-1.5 rounded text-sm disabled:opacity-50 transition"
        >
          {replyingTo ? 'Post Reply' : 'Post Comment'}
        </button>
        {replyingTo && (
          <button
            onClick={() => { setReplyingTo(null); setNewComment(''); }}
            className="ml-2 text-xs text-gray-600"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No comments yet. Be the first!</p>
        ) : (
          comments.map(c => <Comment key={c.id} c={c} />)
        )}
      </div>
    </div>
  );
};

export default TeamFeed;