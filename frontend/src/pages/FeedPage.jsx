import { useState, useEffect, useCallback, useRef } from 'react';
import Hyperspeed from '../components/Hyperspeed';
import { activity as activityApi, users as usersApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  Activity, Play, Check, Bookmark, Heart, Star,
  MessageSquare, Users, User, Flame, Sparkles,
  Send, Trash2, ChevronDown, ChevronRight, Loader2,
  Database, ShieldCheck, Film, BookOpen, Monitor, Zap,
  RefreshCw, Radio, Quote, ExternalLink, X, Award
} from 'lucide-react';

const REACTION_EMOJIS = ['🔥', '❤️', '🎉', '👏', '👀', '🚀'];

// Module-level cache so switching filters/scopes or navigating away and back
// doesn't refetch from the network every time. Lives for the SPA session
// (cleared on a full page reload), keyed per scope+type combo.
const feedCache = new Map();
const FEED_CACHE_TTL = 45000; // 45s — after this, a cached view still renders instantly but revalidates in the background

const ACTIVITY_CFG = {
  WATCHING: { verb: 'started watching', icon: Play, color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.25)' },
  COMPLETED: { verb: 'completed', icon: Check, color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
  PLANNING: { verb: 'added to watchlist', icon: Bookmark, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
  FAVOURITED: { verb: 'favourited', icon: Heart, color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.25)' },
  RATED: { verb: 'rated', icon: Star, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)' },
  REVIEWED: { verb: 'reviewed', icon: MessageSquare, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)' },
  DROPPED: { verb: 'dropped', icon: ChevronRight, color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.25)' },
};

const CAT_CFG = {
  Anime: { color: '#f472b6', dim: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.25)', icon: Zap },
  Manga: { color: '#60a5fa', dim: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', icon: BookOpen },
  Movie: { color: '#fbbf24', dim: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', icon: Film },
  TV: { color: '#34d399', dim: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', icon: Monitor },
};

function timeAgo(dateStr) {
  if (!dateStr) return 'recently';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Activity Comment Box ────────────────────────────────
function CommentSection({ activityId, initialCount, currentUser, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await activityApi.getComments(activityId);
      if (res.ok) setComments(res.comments || []);
    } catch {
      toast('Failed to load comments', 'error');
    } finally {
      setLoading(false);
    }
  }, [activityId, toast]);

  useEffect(() => {
    if (open) loadComments();
  }, [open, loadComments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await activityApi.addComment(activityId, text.trim());
      if (res.ok) {
        setComments(prev => [...prev, res.comment]);
        setText('');
      }
    } catch (err) {
      toast(err?.message || 'Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await activityApi.deleteComment(commentId);
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (err) {
      toast(err?.message || 'Failed to delete comment', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 8px', borderRadius: 8,
          fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          color: open ? '#7C3AED' : '#9ca3af',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          transition: 'all 0.2s', alignSelf: 'flex-start',
        }}
      >
        <MessageSquare size={13} color={open ? '#7C3AED' : '#6b7280'} />
        <span>{comments.length > 0 ? comments.length : initialCount || 0} Comments</span>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          padding: '14px 16px', background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
          animation: 'fadeUp 0.25s ease'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
              <Loader2 size={16} color="#7C3AED" className="animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#6b7280', textAlign: 'center', padding: '6px 0' }}>
              No transmission notes yet. Join the conversation.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
              {comments.map(c => {
                const canDelete = currentUser && (currentUser.id === c.userId || currentUser.role?.toUpperCase() === 'ADMIN');
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                    }}>
                      {c.user?.avatarUrl ? (
                        <img src={c.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.65rem', color: '#a78bfa' }}>
                          {c.user?.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.72rem', color: '#fff' }}>
                          @{c.user?.username}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#6b7280' }}>
                            {timeAgo(c.createdAt)}
                          </span>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                              title="Delete comment"
                            >
                              <Trash2 size={11} color="#f87171" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#d1d5db', lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {c.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* New comment input */}
          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              type="text"
              placeholder="Write a comment..."
              value={text}
              onChange={e => setText(e.target.value)}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
                color: '#fff', outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '8px 14px', borderRadius: 10, background: '#7C3AED', border: 'none',
                color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700,
                cursor: submitting || !text.trim() ? 'default' : 'pointer',
                opacity: submitting || !text.trim() ? 0.5 : 1, transition: 'all 0.2s',
              }}
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Single Activity Feed Card ──────────────────────────
function ActivityCard({ item, onNavigate, currentUser, onReactionUpdate, onOpenProfile }) {
  const cfg = ACTIVITY_CFG[item.type] || { verb: item.type?.toLowerCase(), icon: Activity, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)' };
  const catCfg = item.content?.category ? (CAT_CFG[item.content.category] || { color: '#7C3AED', dim: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)', icon: Film }) : null;
  const Icon = cfg.icon;
  const toast = useToast();
  const [reacting, setReacting] = useState(false);

  const handleReact = async (emoji) => {
    if (reacting) return;
    setReacting(true);
    try {
      const res = await activityApi.react(item.id, emoji);
      if (res.ok) {
        onReactionUpdate(item.id, res.reactionCounts, res.userReactions);
      }
    } catch (err) {
      toast('Reaction failed', 'error');
    } finally {
      setReacting(false);
    }
  };

  const userReactions = item.userReactions || [];
  const reactionCounts = item.reactionCounts || {};
  const isManga = item.content?.category === 'Manga';
  const totalCount = item.content?.totalEpisodes || (isManga ? item.content?.totalChapters : null);

  return (
    <div style={{
      borderRadius: 20,
      background: 'rgba(18,18,30,0.85)',
      border: '1px solid rgba(255,255,255,0.07)',
      padding: '22px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      transition: 'border-color 0.25s, transform 0.25s, box-shadow 0.25s',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Top row: User info & Action Verb & Timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            onClick={() => onOpenProfile?.(item.user)}
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(34,211,238,0.3))',
              border: '2px solid rgba(124,58,237,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
              boxShadow: '0 0 16px rgba(124,58,237,0.25)',
            }}
          >
            {item.user?.avatarUrl ? (
              <img src={item.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: '#c4b5fd' }}>
                {item.user?.username?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span
                onClick={() => onOpenProfile?.(item.user)}
                style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff', cursor: 'pointer' }}
              >
                @{item.user?.username}
              </span>
              {item.user?.role?.toUpperCase() === 'ADMIN' && (
                <ShieldCheck size={14} color="#7C3AED" />
              )}
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#9ca3af' }}>
                {cfg.verb}
              </span>
            </div>
            {item.user?.bio && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#6b7280', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>
                {item.user.bio}
              </p>
            )}
          </div>
        </div>

        {/* Activity icon badge + Timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={16} color={cfg.color} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#6b7280' }}>
            {timeAgo(item.createdAt)}
          </span>
        </div>
      </div>

      {/* Review Box highlight if type is REVIEWED or has comment */}
      {(item.type === 'REVIEWED' || item.comment) && (
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(18,18,36,0.6) 100%)',
          border: '1px solid rgba(124,58,237,0.25)',
          display: 'flex', flexDirection: 'column', gap: 8,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 10, right: 12, opacity: 0.15 }}>
            <Quote size={36} color="#7C3AED" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              User Transmission Review
            </span>
            {item.rating && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '2px 8px', borderRadius: 20,
                background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 800, color: '#fbbf24',
              }}>
                <Star size={10} fill="#fbbf24" color="#fbbf24" /> {item.rating}/10
              </span>
            )}
          </div>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#e5e7eb',
            fontStyle: 'italic', lineHeight: 1.5, position: 'relative', zIndex: 1,
          }}>
            "{item.comment || `Rated ${item.content?.title || 'title'} a solid ${item.rating}/10.`}"
          </p>
        </div>
      )}

      {/* Media Thumbnail Card */}
      {item.content && (
        <div
          onClick={() => onNavigate(`content/${item.content.id}`)}
          style={{
            display: 'flex', gap: 16, padding: 14,
            borderRadius: 16, background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer', transition: 'all 0.25s', position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
        >
          {/* Thumbnail Image */}
          <div style={{
            width: 72, height: 96, borderRadius: 10,
            overflow: 'hidden', flexShrink: 0, background: '#121212',
            border: `1px solid ${catCfg ? catCfg.border : 'rgba(255,255,255,0.1)'}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)', position: 'relative'
          }}>
            {item.content.coverImage ? (
              <img
                src={item.content.coverImage}
                alt={item.content.title}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Film size={22} color="#4b5563" />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {catCfg && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, background: catCfg.dim,
                    border: `1px solid ${catCfg.border}`, fontFamily: 'var(--font-mono)',
                    fontSize: '0.58rem', color: catCfg.color, fontWeight: 700, textTransform: 'uppercase',
                  }}>
                    {item.content.category}
                  </span>
                )}
                {totalCount > 0 && (
                  <span style={{
                    padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-mono)',
                    fontSize: '0.55rem', color: '#9ca3af',
                  }}>
                    {totalCount} {isManga ? 'Ch' : 'Ep'}
                  </span>
                )}
                {item.content.status && (
                  <span style={{
                    padding: '2px 7px', borderRadius: 6, background: 'rgba(52,211,153,0.08)',
                    border: '1px solid rgba(52,211,153,0.2)', fontFamily: 'var(--font-mono)',
                    fontSize: '0.55rem', color: '#34d399', textTransform: 'uppercase',
                  }}>
                    {item.content.status}
                  </span>
                )}
                {item.content.rating && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '2px 6px', borderRadius: 6, background: 'rgba(251,191,36,0.1)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#fbbf24', fontWeight: 700,
                  }}>
                    <Star size={9} fill="#fbbf24" color="#fbbf24" /> {item.content.rating.toFixed(1)}
                  </span>
                )}
              </div>

              <h4 style={{
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.98rem',
                color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.content.title}
              </h4>

              {item.content.description && (
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#9ca3af',
                  lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginTop: 3,
                }}>
                  {item.content.description}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#7C3AED', fontWeight: 700, textTransform: 'uppercase' }}>
              <span>Inspect Portal</span>
              <ExternalLink size={10} />
            </div>
          </div>
        </div>
      )}

      {/* Reaction and comments footer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Reactions row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          {/* Reaction counters active on item */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {REACTION_EMOJIS.map(emoji => {
              const count = reactionCounts[emoji] || 0;
              const hasReacted = userReactions.includes(emoji);
              if (count === 0 && !hasReacted) return null;
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                    background: hasReacted ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.04)',
                    border: hasReacted ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
                    color: hasReacted ? '#c4b5fd' : '#9ca3af', transition: 'all 0.15s',
                  }}
                  title={hasReacted ? 'Remove reaction' : 'React with ' + emoji}
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              );
            })}

            {/* Quick reaction picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,0.03)', padding: '3px 6px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
              {REACTION_EMOJIS.map(emoji => {
                const hasReacted = userReactions.includes(emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '0.9rem', padding: '2px 4px', borderRadius: 6,
                      transition: 'transform 0.15s',
                      filter: hasReacted ? 'drop-shadow(0 0 4px rgba(124,58,237,0.8))' : 'grayscale(0.2)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title={'React with ' + emoji}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Comment Drawer Section */}
        <CommentSection
          activityId={item.id}
          initialCount={item.commentsCount}
          currentUser={currentUser}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

// ── MAIN FEED PAGE COMPONENT ──────────────────────────
export default function FeedPage({ onNavigate }) {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [scope, setScope] = useState('all'); // 'all' | 'friends' | 'me'
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'WATCHING' | 'COMPLETED' | 'PLANNING' | 'FAVOURITED' | 'RATED' | 'REVIEWED'
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const PAGE_SIZE = 15;

  const fetchFeed = useCallback(async (offset = 0, isAppend = false, { silent = false, force = false } = {}) => {
    const cacheKey = `${scope}::${typeFilter}`;

    // Serve cached results instantly for a fresh (offset 0) load, then
    // silently revalidate in the background if the cache has gone stale.
    if (offset === 0 && !isAppend && !force) {
      const cached = feedCache.get(cacheKey);
      if (cached) {
        setActivities(cached.activities);
        setHasMore(cached.hasMore);
        setTotal(cached.total);
        setLoading(false);
        if (Date.now() - cached.ts > FEED_CACHE_TTL) {
          fetchFeed(0, false, { silent: true, force: true });
        }
        return;
      }
    }

    if (!silent) {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
    }

    try {
      const res = await activityApi.feed({
        scope,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        limit: PAGE_SIZE,
        offset,
      });

      if (res.ok) {
        setActivities(prev => {
          const next = isAppend ? [...prev, ...res.activities] : res.activities;
          feedCache.set(cacheKey, { activities: next, hasMore: res.hasMore, total: res.total, ts: Date.now() });
          return next;
        });
        setHasMore(res.hasMore);
        setTotal(res.total);
      }
    } catch (err) {
      if (!silent) toast('Failed to load activity feed', 'error');
    } finally {
      if (!silent) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [scope, typeFilter, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchFeed(0, false);
    }
  }, [fetchFeed, authLoading]);

  // ── Auto-load more when the sentinel at the bottom scrolls into view ──
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          fetchFeed(activities.length, true);
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, activities.length, fetchFeed]);

  const handleReactionUpdate = (activityId, reactionCounts, userReactions) => {
    setActivities(prev => {
      const next = prev.map(act => {
        if (act.id === activityId) {
          return { ...act, reactionCounts, userReactions };
        }
        return act;
      });
      const cacheKey = `${scope}::${typeFilter}`;
      const cached = feedCache.get(cacheKey);
      if (cached) feedCache.set(cacheKey, { ...cached, activities: next });
      return next;
    });
  };

  const openProfile = async (targetUser) => {
    if (!targetUser || (user && targetUser.id === user.id)) return;
    setSelectedUser(targetUser);
    setProfileLoading(true);
    try {
      const data = await usersApi.profile(targetUser.id);
      setProfile(data.user);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const FILTER_SCOPES = [
    { id: 'all', label: 'Global Stream', icon: Radio, desc: 'All members' },
    { id: 'friends', label: 'Friends Stream', icon: Users, desc: 'People you follow' },
    { id: 'me', label: 'My Logs', icon: User, desc: 'Your transmissions' },
  ];

  const TYPE_CHIPS = [
    { id: 'ALL', label: 'All Transmissions' },
    { id: 'WATCHING', label: 'Watching', icon: Play },
    { id: 'COMPLETED', label: 'Completed', icon: Check },
    { id: 'PLANNING', label: 'Watchlist', icon: Bookmark },
    { id: 'FAVOURITED', label: 'Favourites', icon: Heart },
    { id: 'RATED', label: 'Ratings', icon: Star },
    { id: 'REVIEWED', label: 'Reviews', icon: MessageSquare },
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* Background hyperspeed canvas */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.15 }}>
        <Hyperspeed effectOptions={{
          distortion: 'turbulentDistortion', length: 400, roadWidth: 10, islandWidth: 2,
          lanesPerRoad: 4, fov: 90, fovSpeedUp: 150, speedUp: 2, carLightsFade: 0.4,
          totalSideLightSticks: 20, lightPairsPerRoadWay: 40,
          shoulderLinesWidthPercentage: 0.05, brokenLinesWidthPercentage: 0.1,
          brokenLinesLengthPercentage: 0.5, lightStickWidth: [0.12, 0.5],
          lightStickHeight: [1.3, 1.7], movingAwaySpeed: [60, 80],
          movingCloserSpeed: [-120, -160], carLightsLength: [12, 80],
          carLightsRadius: [0.05, 0.14], carWidthPercentage: [0.3, 0.5],
          carShiftX: [-0.8, 0.8], carFloorSeparation: [0, 5],
          colors: {
            roadColor: 0x080808, islandColor: 0x0a0a0a, background: 0x000000,
            shoulderLines: 0x131318, brokenLines: 0x131318,
            leftCars: [0x8B5CF6, 0x7C3AED, 0xA78BFA],
            rightCars: [0x06b6d4, 0x0891b2, 0x22d3ee],
            sticks: 0x06b6d4,
          }
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 840, margin: '0 auto' }} className="feed-page">
        <style>{`
            @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
            @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
            @keyframes spin { to { transform:rotate(360deg); } }
            @keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }
            @media (max-width: 768px) {
              .feed-page { gap: 24px !important; }
              .feed-page h1 { font-size: 1.6rem !important; }
              .feed-page .scope-tabs { grid-template-columns: 1fr !important; }
              .feed-page .profile-panel { max-width: 100% !important; right: 0 !important; left: 0 !important; bottom: 0 !important; top: auto !important; max-height: 50vh !important; border-left: none !important; border-top: 1px solid rgba(255,255,255,0.07) !important; }
            }
          `}</style>

        {/* ── Header ─────────────────────────────────── */}
        <header style={{ animation: 'fadeUp 0.4s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399', animation: 'pulse 1.8s infinite' }} />
              <span style={{
                padding: '3px 10px', borderRadius: 20,
                background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)',
                fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#a78bfa',
                textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
              }}>
                Live Stream • {total} Transmissions
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.4rem', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
              Activity <span style={{ color: '#7C3AED' }}>Feed</span>
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
              Real-time watch progress, reviews, community reactions, and ratings across LogHorizon.
            </p>
          </div>

          <button
            onClick={() => fetchFeed(0, false, { force: true })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#9ca3af',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <RefreshCw size={13} style={loading ? { animation: 'spin 0.8s linear infinite' } : {}} />
            <span>Sync</span>
          </button>
        </header>

        {/* ── Scope Tabs ─────────────────────────────── */}
        <div className="scope-tabs" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          padding: 6, background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16,
        }}>
          {FILTER_SCOPES.map(tab => {
            const active = scope === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setScope(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(124,58,237,0.2)' : 'transparent',
                  borderBottom: active ? '2px solid #7C3AED' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <TabIcon size={16} color={active ? '#a78bfa' : '#6b7280'} />
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', color: active ? '#fff' : '#9ca3af', lineHeight: 1 }}>
                    {tab.label}
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: active ? '#a78bfa' : '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                    {tab.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Event Type Filter Chips ───────────────── */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {TYPE_CHIPS.map(chip => {
            const active = typeFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setTypeFilter(chip.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
                  border: active ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  background: active ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                  color: active ? '#fff' : '#6b7280',
                  fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >
                {chip.icon && <chip.icon size={10} color={active ? '#7C3AED' : '#6b7280'} />}
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* ── Activity Cards List ────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 14 }}>
            <Loader2 size={32} color="#7C3AED" className="animate-spin" />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Synchronizing neural stream...
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div style={{
            padding: '64px 32px', textAlign: 'center',
            background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <Activity size={40} color="#374151" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>
              No Activity Found
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic', maxWidth: 360 }}>
              {scope === 'friends'
                ? 'You are not following anyone yet, or your friends haven\'t had recent activity.'
                : 'No transmission logs match the selected filter.'}
            </p>
            {scope === 'friends' && (
              <button
                onClick={() => onNavigate('community')}
                style={{
                  marginTop: 6, padding: '9px 18px', borderRadius: 10,
                  background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                  color: '#a78bfa', fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
                }}
              >
                Find Members to Follow →
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activities.map((item, i) => (
              <div key={item.id} style={{ animation: `fadeUp 0.35s ${Math.min(i * 30, 300)}ms ease both` }}>
                <ActivityCard
                  item={item}
                  onNavigate={onNavigate}
                  currentUser={user}
                  onReactionUpdate={handleReactionUpdate}
                  onOpenProfile={openProfile}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Auto-loading pagination ─────────────────── */}
        {hasMore && (
          <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 10, paddingBottom: 40, minHeight: 50 }}>
            {loadingMore && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={16} color="#7C3AED" className="animate-spin" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Loading more transmissions...
                </span>
              </div>
            )}
          </div>
        )}
        {!hasMore && !loading && activities.length > 0 && (
          <div style={{ textAlign: 'center', paddingTop: 10, paddingBottom: 40 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              End of stream • {total} transmission{total === 1 ? '' : 's'} total
            </span>
          </div>
        )}
      </div>

      {/* Profile side panel modal */}
      {selectedUser && (
        <>
          <div onClick={() => setSelectedUser(null)} style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 160, width: '100%', maxWidth: 340,
            background: '#0e0e16', borderLeft: '1px solid rgba(255,255,255,0.07)',
            overflowY: 'auto', animation: 'slideInRight 0.25s ease',
          }} className="profile-panel">
            <div style={{ height: 2, background: 'linear-gradient(90deg, #7C3AED, #22d3ee)' }} />
            <div style={{ padding: '20px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Member Profile</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>
                <X size={15} color="#9ca3af" />
              </button>
            </div>

            {profileLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <Loader2 size={28} color="#7C3AED" className="animate-spin" />
              </div>
            ) : !profile ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Profile not found
              </div>
            ) : (
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1a1a24', overflow: 'hidden', border: '2px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.2rem', color: '#7C3AED' }}>{profile.username?.[0]?.toUpperCase()}</span>}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{profile.username}</span>
                      {profile.role?.toUpperCase() === 'ADMIN' && <ShieldCheck size={14} color="#7C3AED" />}
                    </div>
                    {profile.bio && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>{profile.bio}</p>}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Total', value: profile.stats?.total || 0, color: '#7C3AED' },
                    { label: 'Done', value: profile.stats?.completed || 0, color: '#34d399' },
                    { label: 'Active', value: profile.stats?.current || 0, color: '#22d3ee' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: s.color, marginBottom: 3 }}>{s.value}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}