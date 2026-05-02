import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, Users, MessageSquare, Trophy, Plus, RefreshCw,
  Search, ExternalLink, X, ChevronRight, Loader2, Star,
  Database, UserCircle, ShieldCheck, Clock, Radio, CheckCircle
} from 'lucide-react';
import { events as eventsApi, users as usersApi, content as contentApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

// ── Constants ──────────────────────────────────────────────────
const EVENT_TYPES = ['WATCH_PARTY', 'DISCUSSION', 'TOURNAMENT', 'COMMUNITY'];
const EVENT_TYPE_LABELS = {
  WATCH_PARTY: 'Watch Party',
  DISCUSSION: 'Discussion',
  TOURNAMENT: 'Tournament',
  COMMUNITY: 'Community',
};
const EVENT_TYPE_COLORS = {
  WATCH_PARTY: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  DISCUSSION: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  TOURNAMENT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  COMMUNITY: 'text-electric-purple bg-electric-purple/10 border-electric-purple/20',
};
const DISCORD_CATEGORIES = ['All', 'Anime', 'Manga', 'Movie', 'TV'];
const CAT_STYLES = {
  Anime: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Manga: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Movie: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  TV: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

// ── Debounce hook ──────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Status Pill ────────────────────────────────────────────────
function StatusPill({ status }) {
  if (status === 'LIVE') {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </span>
    );
  }
  if (status === 'UPCOMING') {
    return (
      <span className="px-2.5 py-1 rounded-full bg-electric-purple/10 border border-electric-purple/20 text-accent-violet text-[10px] font-mono font-bold uppercase tracking-widest">
        Upcoming
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-500 text-[10px] font-mono font-bold uppercase tracking-widest">
      Ended
    </span>
  );
}

// ── User Avatar ────────────────────────────────────────────────
function Avatar({ user, size = 36 }) {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.username}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(124,58,237,0.2)',
      border: '1px solid rgba(124,58,237,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700,
      fontSize: size * 0.38,
      color: 'var(--violet-bright)',
      flexShrink: 0,
    }}>
      {user?.username?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION 1: EVENTS
// ══════════════════════════════════════════════════════════════

function EventsSection({ currentUser, isAdmin }) {
  const toast = useToast();
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'WATCH_PARTY', startDate: '' });

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
    if (!form.title.trim() || !form.startDate) return;
    setCreating(true);
    try {
      await eventsApi.create(form);
      toast('Event created!', 'success');
      setShowCreate(false);
      setForm({ title: '', description: '', type: 'WATCH_PARTY', startDate: '' });
      fetchEvents();
    } catch (err) {
      toast(err.message || 'Failed to create event', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await eventsApi.delete(id);
      toast('Event deleted', 'success');
      fetchEvents();
    } catch (err) {
      toast(err.message || 'Failed to delete event', 'error');
    }
  };

  const canDelete = (event) => isAdmin || event.createdBy === currentUser?.id;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Type filters */}
        <div className="flex gap-1 p-1 bg-white/5 border border-white/5 rounded-xl flex-wrap">
          {['All', ...EVENT_TYPES].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-2 rounded-lg font-display text-xs font-bold uppercase tracking-widest transition-all ${filter === t ? 'bg-electric-purple text-white shadow-lg' : 'text-gray-500 hover:text-white'
                }`}
            >
              {t === 'All' ? 'All' : EVENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchEvents}
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {currentUser && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-electric-purple hover:bg-accent-violet text-white px-5 py-2.5 rounded-xl font-display font-semibold text-sm shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5"
            >
              <Plus size={16} /> Create Event
            </button>
          )}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : eventsList.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-white/5 rounded-3xl">
          <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-white font-display font-bold text-lg mb-2">No Events Scheduled</h3>
          <p className="text-gray-500 text-sm italic font-body mb-6">
            Be the first to create a community event.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {eventsList.map((event, i) => (
            <div
              key={event.id}
              className="premium-card p-5 space-y-4 hover:-translate-y-0.5 transition-transform animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${EVENT_TYPE_COLORS[event.type] || 'bg-white/5 text-gray-400 border-white/10'}`}>
                  {EVENT_TYPE_LABELS[event.type] || event.type}
                </span>
                <StatusPill status={event.status} />
              </div>

              {/* Title + desc */}
              <div>
                <h3 className="font-display font-bold text-white text-base leading-tight mb-1.5">
                  {event.title}
                </h3>
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 font-body italic">
                  {event.description}
                </p>
              </div>

              {/* Host + date */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Avatar user={event.host} size={28} />
                  <span className="text-xs font-display font-semibold text-gray-400">
                    {event.host?.username}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-600">
                  <Clock size={11} />
                  {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Delete */}
              {canDelete(event) && (
                <button
                  onClick={() => handleDelete(event.id)}
                  className="w-full text-[10px] font-mono uppercase tracking-widest text-red-400/50 hover:text-red-400 transition-colors py-1"
                >
                  Delete Event
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/60"
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div className="w-full max-w-md bg-charcoal border border-white/10 rounded-2xl shadow-2xl animate-fade-up overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-electric-purple to-cyan-400" />
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-lg font-display font-bold text-white">Create Event</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="label">Event Title</label>
                <input
                  className="input"
                  placeholder="Attack on Titan Watch Party"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="What's this event about?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'none' }}
                />
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t} className="bg-charcoal">{EVENT_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Start Date & Time</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 text-sm font-display font-semibold text-gray-500 hover:text-white bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 bg-electric-purple hover:bg-accent-violet text-white py-2.5 rounded-xl font-display font-semibold text-sm shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all disabled:opacity-50"
                >
                  {creating && <Loader2 size={15} className="animate-spin" />}
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

// ══════════════════════════════════════════════════════════════
// SECTION 2: MEMBERS / USER DISCOVERY
// ══════════════════════════════════════════════════════════════

function UserCard({ user, onClick }) {
  return (
    <div
      onClick={() => onClick(user)}
      className="premium-card p-4 flex items-center gap-4 cursor-pointer hover:-translate-y-0.5 transition-transform group"
    >
      <Avatar user={user} size={48} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-display font-bold text-sm text-white group-hover:text-electric-purple transition-colors truncate">
            {user.username}
          </span>
          {user.role?.toUpperCase() === 'ADMIN' && (
            <ShieldCheck size={13} className="text-electric-purple flex-shrink-0" />
          )}
        </div>
        {user.bio && (
          <p className="text-xs text-gray-500 italic line-clamp-1 mb-1">{user.bio}</p>
        )}
        <div className="flex items-center gap-3 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
          <span><span className="text-white font-bold">{user.stats.completed}</span> completed</span>
          {user.stats.current > 0 && (
            <span><span className="text-cyan-400 font-bold">{user.stats.current}</span> watching</span>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-700 group-hover:text-electric-purple transition-colors flex-shrink-0" />
    </div>
  );
}

function UserSidePanel({ userId, currentUserId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.profile(userId)
      .then(d => setProfile(d.user))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [userId]);

  // DNA bar
  const dnaColors = { Anime: '#f472b6', Manga: '#60a5fa', Movie: '#fbbf24', TV: '#34d399' };

  const counts = profile?.completed?.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {}) || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-[160] w-full max-w-sm bg-charcoal border-l border-white/10 overflow-y-auto"
        style={{ animation: 'slideInRight 0.25s ease' }}
      >
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-electric-purple to-cyan-400" />

        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-base">Member Profile</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="text-electric-purple animate-spin" size={32} />
          </div>
        ) : !profile ? (
          <div className="py-20 text-center text-gray-500 font-mono text-xs uppercase tracking-widest">
            Profile not found
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <Avatar user={profile} size={60} />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-display font-bold text-white text-lg">{profile.username}</span>
                  {profile.role?.toUpperCase() === 'ADMIN' && (
                    <ShieldCheck size={15} className="text-electric-purple" />
                  )}
                </div>
                {profile.bio && (
                  <p className="text-xs text-gray-400 italic leading-relaxed max-w-[200px]">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: profile.stats.total, color: '#7C3AED' },
                { label: 'Done', value: profile.stats.completed, color: '#34d399' },
                { label: 'Active', value: profile.stats.current, color: '#22d3ee' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="font-display font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Media DNA */}
            {profile.completed.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">Media DNA</p>
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  {Object.entries(counts).map(([cat, count]) => (
                    <div
                      key={cat}
                      style={{ width: `${(count / total) * 100}%`, background: dnaColors[cat], borderRadius: 99 }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {Object.entries(counts).map(([cat, count]) => (
                    <span key={cat} className="text-[10px] font-mono" style={{ color: dnaColors[cat] }}>
                      {cat} <span className="font-bold">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Completed covers */}
            {profile.completed.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Completed</p>
                <div className="grid grid-cols-4 gap-2">
                  {profile.completed.slice(0, 12).map(c => (
                    <div key={c.id} className="aspect-[3/4] rounded-lg overflow-hidden bg-white/5">
                      {c.coverImage
                        ? <img src={c.coverImage} className="w-full h-full object-cover" alt={c.title} />
                        : <div className="w-full h-full flex items-center justify-center"><Database size={14} className="text-gray-700" /></div>
                      }
                    </div>
                  ))}
                  {profile.completed.length > 12 && (
                    <div className="aspect-[3/4] rounded-lg bg-white/5 flex items-center justify-center">
                      <span className="text-[10px] font-mono text-gray-500">+{profile.completed.length - 12}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Currently watching */}
            {profile.current.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">Watching Now</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {profile.current.map(c => (
                    <div key={c.id} className="flex-shrink-0 w-16">
                      <div className="w-16 h-24 rounded-lg overflow-hidden bg-white/5 mb-1">
                        {c.coverImage
                          ? <img src={c.coverImage} className="w-full h-full object-cover" alt={c.title} />
                          : <div className="w-full h-full flex items-center justify-center"><Database size={14} className="text-gray-700" /></div>
                        }
                      </div>
                      <p className="text-[9px] font-mono text-gray-600 line-clamp-2 leading-tight">{c.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function MembersSection({ currentUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTop, setIsTop] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const debouncedQuery = useDebounce(query, 350);

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

  const handleUserClick = (user) => {
    // Redirect to own profile page instead
    if (currentUser && user.id === currentUser.id) return;
    setSelectedUserId(user.id);
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative max-w-lg">
        {loading ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-electric-purple animate-spin" size={18} />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        )}
        <input
          type="text"
          placeholder="Search members by username..."
          className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-10 text-sm font-body focus:bg-white/[0.08] focus:border-electric-purple/40 transition-all outline-none text-white"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Section label */}
      {isTop && !query && (
        <div className="flex items-center gap-3">
          <Star size={16} className="text-amber-400" fill="currentColor" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-600">Top Contributors</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
      )}

      {/* Results */}
      {results.length === 0 && !loading ? (
        <div className="py-16 text-center border border-dashed border-white/5 rounded-3xl">
          <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm italic">
            {query ? `No members found for "${query}"` : 'No members yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((user, i) => (
            <div key={user.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <UserCard
                user={user}
                onClick={handleUserClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* Side panel */}
      {selectedUserId && (
        <UserSidePanel
          userId={selectedUserId}
          currentUserId={currentUser?.id}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION 3: DISCORD HUB
// ══════════════════════════════════════════════════════════════

function DiscordHubSection({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');

  const fetchDiscord = useCallback(async () => {
    setLoading(true);
    try {
      const params = { hasDiscord: 'true' };
      if (category !== 'All') params.category = category;
      const data = await contentApi.list(params);
      setItems(data.content || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchDiscord(); }, [fetchDiscord]);

  return (
    <div className="space-y-6">
      {/* Category filter */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/5 rounded-xl flex-wrap">
        {DISCORD_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-lg font-display text-xs font-bold uppercase tracking-widest transition-all ${category === cat ? 'bg-discord-blue text-white shadow-lg' : 'text-gray-500 hover:text-white'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-white/5 rounded-3xl">
          <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-white font-display font-bold text-lg mb-2">No Discord Servers Yet</h3>
          <p className="text-gray-500 text-sm italic font-body mb-6">
            Recommend a Discord server for your favourite series.
          </p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('discover')}
              className="text-discord-blue font-mono text-xs uppercase tracking-widest hover:underline"
            >
              Browse content to recommend →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {items.map((item, i) => {
            const style = CAT_STYLES[item.category] || 'bg-white/5 text-gray-400 border-white/10';
            return (
              <div
                key={item.id}
                className="premium-card overflow-hidden group animate-fade-up flex flex-col"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Cover */}
                <div className="relative aspect-[3/4] overflow-hidden flex-shrink-0">
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <Database className="text-gray-800" size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent opacity-80" />
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${style}`}>
                      {item.category}
                    </span>
                  </div>
                  {item.rating && (
                    <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-dark/80 backdrop-blur-md border border-white/10 flex items-center gap-1">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-mono font-bold text-amber-400">{item.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Info + CTA */}
                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  <h3 className="font-display font-bold text-sm text-white line-clamp-2 min-h-[40px] group-hover:text-discord-blue transition-colors">
                    {item.title}
                  </h3>
                  <a
                    href={item.discordLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="mt-auto flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-discord-blue/10 hover:bg-discord-blue text-discord-blue hover:text-white border border-discord-blue/20 text-xs font-display font-bold uppercase tracking-widest transition-all"
                  >
                    <ExternalLink size={13} /> Join Server
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE SHELL
// ══════════════════════════════════════════════════════════════

const TABS = [
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'discord', label: 'Discord Hub', icon: MessageSquare },
];

export default function CommunityPage({ onNavigate }) {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Page Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-electric-purple/10 border border-electric-purple/20 text-[10px] font-mono font-bold uppercase tracking-widest text-electric-purple">
            Community Nexus
          </span>
        </div>
        <h1 className="text-4xl font-display font-bold text-white tracking-tight">
          Community
        </h1>
        <p className="text-gray-500 italic font-body text-sm">
          Connect, discover, and sync with your community.
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 font-display text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-electric-purple' : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-electric-purple shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-up" key={activeTab}>
        {activeTab === 'events' && (
          <EventsSection currentUser={user} isAdmin={isAdmin} />
        )}
        {activeTab === 'members' && (
          <MembersSection currentUser={user} />
        )}
        {activeTab === 'discord' && (
          <DiscordHubSection onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}