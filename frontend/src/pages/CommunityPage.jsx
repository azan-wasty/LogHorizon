import { useState, useEffect, useCallback } from 'react';
import Radar from '../components/Radar';
import {
   Calendar, Users, MessageSquare, Plus, RefreshCw,
   Search, ExternalLink, X, ChevronRight, Loader2, Star,
   Database, ShieldCheck, Clock, CheckCircle, Activity,
   UserPlus, UserCheck,
 } from 'lucide-react';
import { events as eventsApi, users as usersApi, content as contentApi, friends as friendsApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

// ── Constants ──────────────────────────────────────
const EVENT_TYPES = ['WATCH_PARTY', 'DISCUSSION', 'TOURNAMENT', 'COMMUNITY'];
const EVENT_LABELS = { WATCH_PARTY: 'Watch Party', DISCUSSION: 'Discussion', TOURNAMENT: 'Tournament', COMMUNITY: 'Community' };
const EVENT_CFG = {
  WATCH_PARTY: { color: '#22d3ee', dim: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.2)' },
  DISCUSSION:  { color: '#34d399', dim: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  TOURNAMENT:  { color: '#fbbf24', dim: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
  COMMUNITY:   { color: '#7C3AED', dim: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)' },
};
const CAT_CFG = {
  Anime: { color: '#f472b6', dim: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)' },
  Manga: { color: '#60a5fa', dim: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
  Movie: { color: '#fbbf24', dim: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
  TV:    { color: '#34d399', dim: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
};

function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ── Avatar ─────────────────────────────────────────
function Avatar({ user, size = 36 }) {
  if (user?.avatarUrl) return (
    <img src={user.avatarUrl} alt={user.username} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(124,58,237,0.3)', flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(139,92,246,0.15))',
      border: '2px solid rgba(124,58,237,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 900,
      fontSize: size * 0.38, color: '#8B5CF6',
    }}>
      {user?.username?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

// ── Status Pill ────────────────────────────────────
function StatusPill({ status }) {
  const cfg = {
    LIVE:     { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', color: '#34d399', label: 'Live', pulse: true },
    UPCOMING: { bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.3)', color: '#a78bfa', label: 'Upcoming', pulse: false },
    ENDED:    { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', color: '#6b7280', label: 'Ended', pulse: false },
  }[status] || { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', color: '#6b7280', label: status, pulse: false };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.pulse && <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`, animation: 'pulse 1.5s infinite', flexShrink: 0 }} />}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════
// EVENTS SECTION
// ══════════════════════════════════════════════════
function EventsSection({ currentUser, isAdmin }) {
  const toast = useToast();
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'WATCH_PARTY', startDate: '', discordServer: '' });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'All') params.type = filter;
      const data = await eventsApi.list(params);
      setEventsList(data.events || []);
    } catch {
      toast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async (e) => {
    e.preventDefault();
    console.log("Submitting event form:", form);
    if (!form.title.trim() || !form.startDate) {
      toast('Title and Start Date are required', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await eventsApi.create(form);
      console.log("Event created res:", res);
      toast(res.event?.approval === 'PENDING' ? 'Event submitted for admin approval!' : 'Event created!', 'success');
      setShowCreate(false);
      setForm({ title: '', description: '', type: 'WATCH_PARTY', startDate: '', discordServer: '' });
      fetchEvents();
    } catch (err) {
      console.error("Event creation error:", err);
      toast(err.message || 'Failed to create event', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try { await eventsApi.delete(id); fetchEvents(); } catch (err) { toast(err.message, 'error'); }
  };

  const canDelete = (ev) => isAdmin || ev.createdBy === currentUser?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 3, padding: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, flexWrap: 'wrap' }}>
          {['All', ...EVENT_TYPES].map(t => {
            const active = filter === t;
            const cfg = EVENT_CFG[t];
            return (
              <button key={t} onClick={() => setFilter(t)} style={{
                padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700,
                background: active ? (cfg ? cfg.dim : 'rgba(124,58,237,0.15)') : 'transparent',
                color: active ? (cfg ? cfg.color : '#7C3AED') : '#6b7280',
              }}>
                {t === 'All' ? 'All Types' : EVENT_LABELS[t]}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchEvents} style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#6b7280' }}>
            <RefreshCw size={15} style={loading ? { animation: 'spin 0.8s linear infinite' } : {}} />
          </button>
          {currentUser && (
            <button onClick={() => setShowCreate(true)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
              borderRadius: 10, background: '#7C3AED', color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
              boxShadow: '0 0 20px rgba(124,58,237,0.3)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#8B5CF6'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#7C3AED'; e.currentTarget.style.transform = 'none'; }}
            >
              <Plus size={15} /> Create Event
            </button>
          )}
        </div>
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="community-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 180, borderRadius: 16, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : eventsList.length === 0 ? (
        <div style={{ padding: '60px 32px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 20 }}>
          <Calendar size={40} color="#374151" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: 6 }}>No Events Scheduled</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>Be the first to create a community gathering.</p>
        </div>
      ) : (
        <div className="community-grid">
          {eventsList.map((event, i) => {
            const ecfg = EVENT_CFG[event.type] || EVENT_CFG.COMMUNITY;
            return (
              <div key={event.id} style={{
                borderRadius: 16, overflow: 'hidden',
                background: 'rgba(255,255,255,0.025)', border: `1px solid rgba(255,255,255,0.06)`,
                padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
                animation: `fadeUp 0.4s ${i * 40}ms ease both`,
                transition: 'all 0.2s', position: 'relative',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${ecfg.color}30`; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}
              >
                {/* Left accent bar */}
                <div style={{ position: 'absolute', left: 0, top: 20, bottom: 20, width: 3, borderRadius: '0 3px 3px 0', background: ecfg.color, boxShadow: `0 0 8px ${ecfg.color}` }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 20,
                    background: ecfg.dim, border: `1px solid ${ecfg.border}`,
                    fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700,
                    color: ecfg.color, textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    {EVENT_LABELS[event.type] || event.type}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {event.approval === 'PENDING' && (
                      <span style={{
                        padding: '4px 8px', borderRadius: 20, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
                        fontFamily: 'var(--font-mono)', fontSize: '0.52rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>Pending</span>
                    )}
                    {event.approval === 'REJECTED' && (
                      <span style={{
                        padding: '4px 8px', borderRadius: 20, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
                        fontFamily: 'var(--font-mono)', fontSize: '0.52rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>Rejected</span>
                    )}
                    <StatusPill status={event.status} />
                  </div>
                </div>

                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 6, lineHeight: 1.3 }}>
                    {event.title}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#6b7280', fontStyle: 'italic', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {event.description}
                  </p>
                  {event.discordServer && (
                    <a href={event.discordServer} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
                      padding: '4px 10px', borderRadius: 8, background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.2)',
                      fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#5865F2', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.07em', textDecoration: 'none', transition: 'all 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#5865F2'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(88,101,242,0.1)'; e.currentTarget.style.color = '#5865F2'; }}
                    >
                      <ExternalLink size={10} /> Discord Server
                    </a>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar user={event.host} size={26} />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.75rem', color: '#9ca3af' }}>
                      {event.host?.username}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#4b5563' }}>
                    <Clock size={11} />
                    {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {canDelete(event) && (
                  <button onClick={() => handleDelete(event.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: 'rgba(248,113,113,0.4)', transition: 'color 0.15s', padding: '4px 0',
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(248,113,113,0.4)'}
                  >
                    Delete Event
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div style={{ width: '100%', maxWidth: 440, background: '#121220', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, #7C3AED, #22d3ee)' }} />
            <div style={{ padding: '22px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Create Event</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>
                <X size={16} color="#9ca3af" />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Event Title</label>
                <input className="input" placeholder="Attack on Titan Watch Party" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={3} placeholder="What's this event about?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'none' }} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Start Date & Time</label>
                <input className="input" type="datetime-local" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Discord Server (optional)</label>
                <input className="input" placeholder="https://discord.gg/..." value={form.discordServer} onChange={e => setForm(f => ({ ...f, discordServer: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', color: '#9ca3af' }}>Cancel</button>
                <button type="submit" disabled={creating} style={{ flex: 1, padding: '11px', borderRadius: 10, background: '#7C3AED', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 20px rgba(124,58,237,0.3)', opacity: creating ? 0.6 : 1 }}>
                  {creating && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// MEMBERS SECTION
// ══════════════════════════════════════════════════
function MembersSection({ currentUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTop, setIsTop] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [friendIds, setFriendIds] = useState(new Set());
  const [pendingFriendId, setPendingFriendId] = useState(null);
  const debouncedQuery = useDebounce(query, 350);
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersApi.search(debouncedQuery);
      setResults(data.users || []);
      setIsTop(data.isTopContributors || false);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const fetchFriends = useCallback(async () => {
    try {
      const data = await friendsApi.list();
      if (data.ok) setFriendIds(new Set(data.friends.map(f => f.id)));
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const openProfile = async (user) => {
    if (currentUser && user.id === currentUser.id) return;
    setSelectedUserId(user.id);
    setProfileLoading(true);
    try {
      const data = await usersApi.profile(user.id);
      setProfile(data.user);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const dnaColors = { Anime: '#f472b6', Manga: '#60a5fa', Movie: '#fbbf24', TV: '#34d399' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Search bar */}
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
          {loading
            ? <Loader2 size={16} color="#7C3AED" style={{ animation: 'spin 0.8s linear infinite' }} />
            : <Search size={16} color="#6b7280" />
          }
        </div>
        <input
          type="text" placeholder="Search members by username..."
          value={query} onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '11px 14px 11px 42px',
            fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#fff', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={13} color="#6b7280" />
          </button>
        )}
      </div>

      {/* Top contributors label */}
      {isTop && !query && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Star size={14} color="#fbbf24" fill="#fbbf24" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Top Contributors
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
        </div>
      )}

      {/* Results */}
      {results.length === 0 && !loading ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 20 }}>
          <Users size={36} color="#374151" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>
            {query ? `No members found for "${query}"` : 'No members yet'}
          </p>
        </div>
      ) : (
        <div className="community-grid" style={{ gap: 10 }}>
          {results.map((user, i) => (
            <div
              key={user.id}
              onClick={() => openProfile(user)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                borderRadius: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
                cursor: currentUser && user.id === currentUser.id ? 'default' : 'pointer',
                transition: 'all 0.2s', animation: `fadeUp 0.4s ${i * 40}ms ease both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'; e.currentTarget.style.background = 'rgba(124,58,237,0.04)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.transform = 'none'; }}
            >
              <Avatar user={user} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.username}
                  </span>
                  {user.role?.toUpperCase() === 'ADMIN' && <ShieldCheck size={13} color="#7C3AED" />}
                </div>
                {user.bio && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#6b7280', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                    {user.bio}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  <span style={{ color: '#6b7280' }}><span style={{ color: '#fff', fontWeight: 700 }}>{user.stats.completed}</span> done</span>
                  {user.stats.current > 0 && <span style={{ color: '#6b7280' }}><span style={{ color: '#22d3ee', fontWeight: 700 }}>{user.stats.current}</span> watching</span>}
                </div>
              </div>
              <ChevronRight size={15} color="#374151" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      {/* Profile side panel */}
      {selectedUserId && (
        <>
          <div onClick={() => setSelectedUserId(null)} style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 160, width: '100%', maxWidth: 340,
            background: '#0e0e16', borderLeft: '1px solid rgba(255,255,255,0.07)',
            overflowY: 'auto', animation: 'slideInRight 0.25s ease',
          }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, #7C3AED, #22d3ee)' }} />
            <div style={{ padding: '20px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Member Profile</h3>
              <button onClick={() => setSelectedUserId(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>
                <X size={15} color="#9ca3af" />
              </button>
            </div>

            {profileLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <Loader2 size={28} color="#7C3AED" style={{ animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : !profile ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Profile not found
              </div>
            ) : (
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 22 }}>
                {/* Identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar user={profile} size={56} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{profile.username}</span>
                      {profile.role?.toUpperCase() === 'ADMIN' && <ShieldCheck size={14} color="#7C3AED" />}
                    </div>
                    {profile.bio && <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', lineHeight: 1.5 }}>{profile.bio}</p>}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Total', value: profile.stats.total, color: '#7C3AED' },
                    { label: 'Done', value: profile.stats.completed, color: '#34d399' },
                    { label: 'Active', value: profile.stats.current, color: '#22d3ee' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: s.color, marginBottom: 3 }}>{s.value}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Media DNA */}
                {profile.completed.length > 0 && (() => {
                  const counts = profile.completed.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {});
                  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
                  return (
                    <div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Media DNA</p>
                      <div style={{ display: 'flex', height: 7, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
                        {Object.entries(counts).map(([cat, count]) => (
                          <div key={cat} style={{ width: `${(count / total) * 100}%`, background: dnaColors[cat], borderRadius: 99, minWidth: count > 0 ? 5 : 0 }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(counts).map(([cat, count]) => (
                          <span key={cat} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: dnaColors[cat] }}>
                            {cat} <strong>{count}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Achievements */}
                {profile.achievements?.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                      <Award size={13} color="#fbbf24" fill="rgba(251,191,36,0.3)" />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Achievements — {profile.achievements.length}</p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {profile.achievements.map(ach => (
                        <div key={ach.id || ach.title} style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                          background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 8,
                        }}>
                          <Star size={10} color="#fbbf24" fill="rgba(251,191,36,0.4)" />
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.65rem', color: '#fbbf24' }}>{ach.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Favourites */}
                {profile.favourites?.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                      <Heart size={13} color="#f472b6" fill="rgba(244,114,182,0.3)" />
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Favourites</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {profile.favourites.slice(0, 8).map(c => (
                        <div key={c.id} style={{ aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(244,114,182,0.15)', position: 'relative' }}>
                          {c.coverImage ? <img src={c.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={c.title} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart size={10} color="#f472b6" /></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed covers */}
                {profile.completed.length > 0 && (
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>Completed</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {profile.completed.slice(0, 12).map(c => (
                        <div key={c.id} style={{ aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                          {c.coverImage ? <img src={c.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={c.title} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Database size={12} color="#374151" /></div>}
                        </div>
                      ))}
                      {profile.completed.length > 12 && (
                        <div style={{ aspectRatio: '3/4', borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#4b5563' }}>+{profile.completed.length - 12}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// DISCORD HUB SECTION
// ══════════════════════════════════════════════════
function SocialHubSection({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');

  const fetchSocial = useCallback(async () => {
    setLoading(true);
    try {
      const params = { hasSocial: 'true' };
      if (category !== 'All') params.category = category;
      const data = await contentApi.list(params);
      setItems(data.content || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchSocial(); }, [fetchSocial]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filter */}
      <div style={{ display: 'flex', gap: 3, padding: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, flexWrap: 'wrap', width: 'fit-content' }}>
        {['All', 'Anime', 'Manga', 'Movie', 'TV'].map(cat => {
          const cfg = CAT_CFG[cat];
          const active = category === cat;
          return (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700,
              background: active ? (cfg ? cfg.dim : 'rgba(88,101,242,0.15)') : 'transparent',
              color: active ? (cfg ? cfg.color : '#5865F2') : '#6b7280',
            }}>
              {cat}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="social-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '3/4', borderRadius: 16, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '64px 32px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 20 }}>
          <Radio size={40} color="#374151" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: 6 }}>Social Nexus Empty</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic', marginBottom: 16 }}>
            No Discord or Reddit communities have been linked yet.
          </p>
          {onNavigate && (
            <button onClick={() => onNavigate('discover')} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Browse content to recommend →
            </button>
          )}
        </div>
      ) : (
        <div className="social-grid">
          {items.map((item, i) => {
            const cfg = CAT_CFG[item.category] || { color: '#7C3AED', dim: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)' };
            return (
              <div key={item.id} style={{
                borderRadius: 14, overflow: 'hidden',
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', transition: 'all 0.3s',
                animation: `fadeUp 0.4s ${i * 30}ms ease both`,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden' }}>
                  {item.coverImage
                    ? <img src={item.coverImage} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Database size={32} color="#374151" /></div>
                  }
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,14,22,0.9) 0%, transparent 55%)' }} />
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 5, background: cfg.dim, border: `1px solid ${cfg.border}`, fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {item.category}
                    </span>
                  </div>
                  {item.rating && (
                    <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 20, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                      <Star size={9} color="#fbbf24" fill="#fbbf24" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#fbbf24', fontWeight: 700 }}>{item.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', color: '#fff', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: 34, lineHeight: 1.35 }}>
                    {item.title}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {item.discordLink && (
                      <a
                        href={item.discordLink} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '7px', borderRadius: 8, border: '1px solid rgba(88,101,242,0.25)',
                          background: 'rgba(88,101,242,0.08)', color: '#5865F2',
                          fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em', textDecoration: 'none',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#5865F2'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(88,101,242,0.08)'; e.currentTarget.style.color = '#5865F2'; }}
                      >
                        <MessageSquare size={11} /> Discord
                      </a>
                    )}
                    {item.redditLink && (
                      <a
                        href={item.redditLink} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '7px', borderRadius: 8, border: '1px solid rgba(255,69,0,0.25)',
                          background: 'rgba(255,69,0,0.08)', color: '#FF4500',
                          fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em', textDecoration: 'none',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FF4500'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,69,0,0.08)'; e.currentTarget.style.color = '#FF4500'; }}
                      >
                        <Radio size={11} /> Subreddit
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════
const TABS = [
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'social', label: 'Social Hub', icon: Radio },
];

export default function CommunityPage({ onNavigate }) {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.1 }}>
        <Radar
          speed={1}
          scale={0.5}
          ringCount={10}
          spokeCount={10}
          ringThickness={0.05}
          spokeThickness={0.01}
          sweepSpeed={1}
          sweepWidth={2}
          sweepLobes={1}
          color="#9f29ff"
          backgroundColor="#000000"
          falloff={2}
          brightness={1}
          enableMouseInteraction={false}
          mouseInfluence={0.1}
        />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 32 }} className="community-content">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }

        .community-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        
        .social-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
          gap: 14px;
        }

        @media (max-width: 768px) {
          .community-content { gap: 24px !important; }
          .community-grid { grid-template-columns: 1fr; gap: 12px; }
          .social-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
          .community-header h1 { font-size: 1.6rem !important; }
          .tab-container { overflow-x: auto; padding-bottom: 8px; }
        }
      `}</style>

      {/* Header */}
      <header style={{ animation: 'fadeUp 0.4s ease' }} className="community-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
            fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#7C3AED',
            textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
          }}>
            Community Nexus
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.2rem', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 8 }}>
          The <span style={{ color: '#7C3AED' }}>Community</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
          Connect, discover, and sync with your community.
        </p>
      </header>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 2 }} className="tab-container">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 20px', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                background: 'transparent', transition: 'all 0.2s',
                color: active ? '#fff' : '#6b7280',
                position: 'relative',
                borderBottom: active ? '2px solid #7C3AED' : '2px solid transparent',
                marginBottom: -1,
                flexShrink: 0
              }}
            >
              <tab.icon size={15} color={active ? '#7C3AED' : '#4b5563'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div key={activeTab} style={{ animation: 'fadeUp 0.3s ease' }}>
        {activeTab === 'events' && <EventsSection currentUser={user} isAdmin={isAdmin} />}
        {activeTab === 'members' && <MembersSection currentUser={user} />}
        {activeTab === 'social' && <SocialHubSection onNavigate={onNavigate} />}
      </div>
      </div>
    </div>
  );
}