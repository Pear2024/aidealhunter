'use client';
import { useState, useEffect } from 'react';
import { SignInButton, useUser } from '@clerk/nextjs';

export default function Comments({ postId }) {
    const { isSignedIn, user } = useUser();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/blog/comments?postId=${postId}`);
            const data = await res.json();
            if (data.comments) setComments(data.comments);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !isSignedIn) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/blog/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    postId, 
                    userName: user.fullName || user.firstName || 'Anonymous', 
                    userId: user.id, 
                    commentText: newComment 
                })
            });
            if (res.ok) {
                setNewComment("");
                fetchComments(); // Refresh list
            }
        } catch(e) { console.error(e); }
        finally { setSubmitting(false); }
    };

    return (
        <div>
            {loading ? <p style={{ color: '#888' }}>Loading comments...</p> : (
                <div style={{ marginBottom: '2rem' }}>
                    {comments.length === 0 ? <p style={{ color: '#888', fontStyle: 'italic' }}>Be the first to share your thoughts!</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {comments.map(c => (
                                <div key={c.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #ff3366' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <strong style={{ color: '#fff' }}>{c.user_name}</strong>
                                        <span style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                                    </div>
                                    <p style={{ color: '#ddd', margin: 0, lineHeight: '1.5' }}>{c.comment_text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {!isSignedIn ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <p style={{ color: '#aaa', marginBottom: '1rem' }}>Join the conversation! You must be logged in to post a comment.</p>
                        <SignInButton mode="modal">
                            <button className="btn-primary" style={{ padding: '10px 25px', borderRadius: '30px', fontWeight: 'bold' }}>Sign in to Comment</button>
                        </SignInButton>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '10px', color: '#ffcc80', fontSize: '0.9rem' }}>
                            Posting publicly as: <strong>{user.fullName || user.firstName || 'Shopper'}</strong>
                        </div>
                        <textarea 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your opinions, tips, or questions here..."
                            rows={4}
                            required
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '15px', borderRadius: '10px', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                        <div style={{ textAlign: 'right', marginTop: '15px' }}>
                            <button 
                                type="submit" 
                                disabled={submitting || !newComment.trim()} 
                                className="btn-primary" 
                                style={{ 
                                    padding: '10px 30px', 
                                    borderRadius: '30px', 
                                    fontWeight: 'bold', 
                                    opacity: submitting ? 0.7 : (!newComment.trim() ? 0.6 : 1), 
                                    cursor: submitting ? 'wait' : (!newComment.trim() ? 'not-allowed' : 'pointer'),
                                    backgroundColor: (!newComment.trim() || submitting) ? '#444' : '#ff3366',
                                    color: '#ffffff',
                                    border: 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {submitting ? 'Posting...' : 'Post Comment'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
