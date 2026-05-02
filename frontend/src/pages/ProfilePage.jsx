import { useState, useEffect, useRef } from 'react';
import { me as meApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import {
  Edit3, Bookmark, PlayCircle, CheckCircle2,
  Star, Zap, Loader2, Camera, X, Check,
  TrendingUp, Award, Film, BookOpen, Tv, Monitor
} from 'lucide-react';

// ── Category config ─────────────────────────────────────────────
const CAT = {
  Anime: { color: '#f472b6', bg: 'rgba(244,114,182,0.12)', label: 'Anime', Icon: Zap },
  Manga: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: 'Manga', Icon: BookOpen },
  Movie: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: 'Movie', Icon: Film },
  TV: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: 'TV', Icon: Monitor },
};

const STATUS_CONFIG = {
  COMPLETED: { label: 'Completed', color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: CheckCircle2 },
  CURRENT: { label: 'In Progress', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', icon: PlayCircle },
  PLANNING: { label: 'Watchlist', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', icon: Bookmark },
};

// ── Genre DNA Bar ────────────────────────────────────────────────
function GenreDNA({ library }) {
  const counts = { Anime: 0, Manga: 0, Movie: 0, TV: 0 };
  library.forEach(e => { if (counts[e.content?.category] !== undefined) counts[e.content.category]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
        Media DNA
      </p>
      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
        {Object.entries(counts).map(([cat, count]) => {
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={cat}
              style={{
                width: `${pct}%`, height: '100%',
                background: CAT[cat].color,
                borderRadius: 99,
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `0 0 8px ${CAT[cat].color}80`,
              }}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([cat, count]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT[cat].color, boxShadow: `0 0 6px ${CAT[cat].color}` }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {cat} <span style={{ color: CAT[cat].color, fontWeight: 700 }}>{count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat Hexagon ─────────────────────────────────────────────────
function StatHex({ value, label, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: `${color}15`, border: `1px solid ${color}30`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 20px ${color}20`,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color }}>{value}</span>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
    </div>
  );
}

// ── Cover Stack Card (for "currently watching") ──────────────────
function CoverStack({ items, onNavigate }) {
  if (!items.length) return null;
  const shown = items.slice(0, 3);
  return (
    <div
      style={{ position: 'relative', width: 80, height: 110, cursor: 'pointer', flexShrink: 0 }}
      onClick={() => onNavigate && onNavigate(`content/${items[0].content?.id}`)}
    >
      {shown.reverse().map((entry, i) => (
        <div key={entry.id} style={{
          position: 'absolute',
          bottom: 0,
          left: `${i * 8}px`,
          width: 70, height: 100,
          borderRadius: 8,
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          zIndex: i,
        }}>
          {entry.content?.coverImage
            ? <img src={entry.content.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            : <div style={{ width: '100%', height: '100%', background: '#1e1e1e' }} />
          }
        </div>
      ))}
    </div>
  );
}

// ── Library Row Item ─────────────────────────────────────────────
function LibraryItem({ entry, index, onNavigate, onRemove }) {
  const item = entry.content;
  const catCfg = CAT[item?.category] || { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' };
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onNavigate(`content/${item.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 14px',
        borderRadius: 12,
        cursor: 'pointer',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 0.15s',
        position: 'relative',
        animation: `fadeUp 0.4s ${index * 30}ms ease both`,
      }}
    >
      {/* Rank */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', width: 20, textAlign: 'right', flexShrink: 0 }}>
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Cover */}
      <div style={{ width: 38, height: 54, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.06)' }}>
        {item?.coverImage
          ? <img src={item.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={14} color="#374151" />
          </div>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: hovered ? catCfg.color : 'var(--text-primary)', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
            {item?.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em',
            color: catCfg.color, background: catCfg.bg, padding: '2px 6px', borderRadius: 4,
          }}>
            {item?.category}
          </span>
          {item?.rating && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Star size={9} fill="currentColor" /> {item.rating}
            </span>
          )}
        </div>
      </div>

      {/* Personal rating */}
      {entry.rating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={10} color="#fbbf24" fill={entry.rating >= i * 2 ? '#fbbf24' : 'transparent'} />
          ))}
        </div>
      )}

      {/* Remove on hover */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
          style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', flexShrink: 0 }}
        >
          <X size={12} color="#f87171" />
        </button>
      )}
    </div>
  );
}

// ── Achievement Badge ────────────────────────────────────────────
function AchievementBadge({ ach }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '14px 10px',
      background: 'rgba(251,191,36,0.05)',
      border: '1px solid rgba(251,191,36,0.15)',
      borderRadius: 14,
      textAlign: 'center',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(251,191,36,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 15px rgba(251,191,36,0.15)',
      }}>
        <Award size={20} color="#fbbf24" fill="rgba(251,191,36,0.3)" />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24' }}>{ach.title}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}>{ach.description}</span>
    </div>
  );
}

// ── Edit Overlay ─────────────────────────────────────────────────
function EditOverlay({ user, onSave, onClose }) {
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async () => {
    setSaving(true);
    try { await onSave({ bio, avatarUrl: avatar }); }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#1a1a2a', border: '1px solid rgba(124,58,237,0.25)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(124,58,237,0.1)',
        animation: 'fadeUp 0.3s ease',
      }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, #7C3AED, #22d3ee)' }} />
        <div style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Edit Identity</h3>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>
              <X size={16} color="#9ca3af" />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8 }}>Avatar URL</label>
              <input
                className="input"
                value={avatar}
                onChange={e => setAvatar(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8 }}>Short Bio</label>
              <textarea
                className="input"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="What defines your taste?"
                rows={3}
                style={{ resize: 'none' }}
              />
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {saving ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={16} />}
              {saving ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ProfilePage ─────────────────────────────────────────────
export default function ProfilePage({ onNavigate }) {
  const { user, achievements, refetch } = useAuth();
  const { library, loading: libLoading, removeItem } = useLibrary();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('COMPLETED');

  const handleSave = async (data) => {
    try {
      await meApi.update(data);
      await refetch();
      toast('Profile synced', 'success');
      setIsEditing(false);
    } catch (err) {
      toast(err.message || 'Failed to update', 'error');
    }
  };

  if (libLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={36} color="#7C3AED" style={{ animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const completed = library.filter(e => e.status === 'COMPLETED');
  const current = library.filter(e => e.status === 'CURRENT');
  const planning = library.filter(e => e.status === 'PLANNING');
  const totalRated = library.filter(e => e.rating).length;
  const avgRating = totalRated
    ? (library.filter(e => e.rating).reduce((s, e) => s + e.rating, 0) / totalRated).toFixed(1)
    : '—';

  const tabItems = activeTab === 'COMPLETED' ? completed : activeTab === 'CURRENT' ? current : planning;

  const TABS = [
    { id: 'COMPLETED', label: 'Completed', count: completed.length, color: '#34d399' },
    { id: 'CURRENT', label: 'Watching', count: current.length, color: '#22d3ee' },
    { id: 'PLANNING', label: 'Watchlist', count: planning.length, color: '#7C3AED' },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glow { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
        .profile-avatar-wrap:hover .avatar-edit-overlay { opacity: 1; }
        .avatar-edit-overlay { opacity: 0; transition: opacity 0.2s; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, animation: 'fadeUp 0.5s ease' }}>

        {/* ── HERO CARD ───────────────────────────────────── */}
        <div style={{
          background: 'rgba(18,18,30,0.9)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Top accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #7C3AED 0%, #22d3ee 50%, #f472b6 100%)' }} />

          {/* Ambient glow */}
          <div style={{
            position: 'absolute', top: -80, right: -80,
            width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ padding: '28px 28px 24px', display: 'flex', gap: 24, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            {/* Avatar */}
            <div
              className="profile-avatar-wrap"
              style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
              onClick={() => setIsEditing(true)}
            >
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                padding: 3,
                background: 'linear-gradient(135deg, #7C3AED, #22d3ee)',
                boxShadow: '0 0 30px rgba(124,58,237,0.35)',
              }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#121212' }}>
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#7C3AED' }}>
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                  }
                </div>
              </div>
              <div className="avatar-edit-overlay" style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Camera size={20} color="#fff" />
              </div>
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                  {user.username}
                </h1>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Edit3 size={12} color="#6b7280" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Edit</span>
                </button>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
                @{user.email?.split('@')[0]}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5, maxWidth: 400 }}>
                {user.bio || 'A wanderer across the media horizon.'}
              </p>
            </div>

            {/* Stats cluster */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <StatHex value={library.length} label="Total" color="#7C3AED" />
              <StatHex value={completed.length} label="Done" color="#34d399" />
              <StatHex value={current.length} label="Active" color="#22d3ee" />
              <StatHex value={avgRating} label="Avg ★" color="#fbbf24" />
            </div>
          </div>

          {/* Genre DNA */}
          {library.length > 0 && (
            <div style={{ padding: '0 28px 24px' }}>
              <GenreDNA library={library} />
            </div>
          )}

          {/* Currently Watching strip */}
          {current.length > 0 && (
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              padding: '16px 28px',
              background: 'rgba(34,211,238,0.03)',
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
                  ▶ Now Watching
                </p>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {current[0]?.content?.title}
                  {current.length > 1 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 8 }}>+{current.length - 1} more</span>}
                </p>
              </div>
              <CoverStack items={current} onNavigate={onNavigate} />
            </div>
          )}
        </div>

        {/* ── ACHIEVEMENTS ─────────────────────────────────── */}
        {achievements?.length > 0 && (
          <div style={{ animation: 'fadeUp 0.5s 0.1s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Award size={16} color="#fbbf24" fill="rgba(251,191,36,0.3)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
                Unlocked Achievements ({achievements.length})
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {achievements.map(ach => <AchievementBadge key={ach.title} ach={ach} />)}
            </div>
          </div>
        )}

        {/* ── LIBRARY TABS ─────────────────────────────────── */}
        <div style={{ animation: 'fadeUp 0.5s 0.15s ease both' }}>
          {/* Tab row */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: activeTab === tab.id ? `${tab.color}18` : 'transparent',
                  color: activeTab === tab.id ? tab.color : 'var(--text-muted)',
                  borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {tab.label}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                  background: activeTab === tab.id ? `${tab.color}25` : 'rgba(255,255,255,0.05)',
                  color: activeTab === tab.id ? tab.color : 'var(--text-muted)',
                  padding: '1px 6px', borderRadius: 99,
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          {tabItems.length === 0 ? (
            <div style={{
              padding: '48px 24px', textAlign: 'center',
              border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 16,
              background: 'rgba(255,255,255,0.01)',
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
                Nothing here yet
              </p>
              <button
                onClick={() => onNavigate('discover')}
                style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Browse the index →
              </button>
            </div>
          ) : (
            <div style={{
              background: 'rgba(18,18,30,0.8)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              {/* Header row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '28px 46px 1fr auto',
                gap: 14, padding: '10px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>#</span>
                <span />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Title</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Rating</span>
              </div>

              {/* Items */}
              {tabItems.map((entry, i) => (
                <LibraryItem
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onNavigate={onNavigate}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <EditOverlay user={user} onSave={handleSave} onClose={() => setIsEditing(false)} />
      )}
    </>
  );
}