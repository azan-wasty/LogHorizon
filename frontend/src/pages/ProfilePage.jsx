import { useState, useEffect, useRef } from 'react';
import { me as meApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import {
  Edit3, Bookmark, PlayCircle, CheckCircle2,
  Star, Zap, Loader2, Camera, X, Check,
  Award, Film, BookOpen, Monitor, LayoutGrid,
  List, Compass, Settings
} from 'lucide-react';

// ── Category config ──────────────────────────────────────────
const CAT = {
  Anime: { color: '#f472b6', dim: 'rgba(244,114,182,0.12)', label: 'Anime', icon: Zap },
  Manga: { color: '#60a5fa', dim: 'rgba(96,165,250,0.12)', label: 'Manga', icon: BookOpen },
  Movie: { color: '#fbbf24', dim: 'rgba(251,191,36,0.12)', label: 'Movie', icon: Film },
  TV: { color: '#34d399', dim: 'rgba(52,211,153,0.12)', label: 'TV', icon: Monitor },
};

const STATUS_CFG = {
  COMPLETED: { label: 'Completed', color: '#34d399', accent: 'rgba(52,211,153,0.15)', icon: CheckCircle2 },
  CURRENT: { label: 'Watching', color: '#22d3ee', accent: 'rgba(34,211,238,0.15)', icon: PlayCircle },
  PLANNING: { label: 'Watchlist', color: '#7C3AED', accent: 'rgba(124,58,237,0.15)', icon: Bookmark },
};

// ── Animated number ──────────────────────────────────────────
function AnimNum({ target, color }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let frame;
    const start = performance.now();
    const dur = 800;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return <span style={{ color }}>{val}</span>;
}

// ── Media DNA bar ────────────────────────────────────────────
function DNABar({ library }) {
  const counts = { Anime: 0, Manga: 0, Movie: 0, TV: 0 };
  library.forEach(e => { if (counts[e.content?.category] !== undefined) counts[e.content.category]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
        Media DNA
      </p>
      {/* Segmented bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', gap: 3, marginBottom: 14 }}>
        {Object.entries(counts).map(([cat, count]) => {
          const pct = (count / total) * 100;
          if (pct < 1) return null;
          return (
            <div
              key={cat}
              title={`${cat}: ${count}`}
              style={{
                width: `${pct}%`, height: '100%',
                background: CAT[cat].color,
                borderRadius: 99,
                boxShadow: `0 0 12px ${CAT[cat].color}80`,
                transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                minWidth: count > 0 ? 6 : 0,
              }}
            />
          );
        })}
      </div>
      {/* Legend pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(counts).map(([cat, count]) => {
          const cfg = CAT[cat];
          const Icon = cfg.icon;
          return (
            <div key={cat} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px',
              background: cfg.dim,
              border: `1px solid ${cfg.color}30`,
              borderRadius: 99,
            }}>
              <Icon size={10} color={cfg.color} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: cfg.color, fontWeight: 700 }}>
                {cat}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Cover Grid Card ──────────────────────────────────────────
function GridCard({ entry, onNavigate, onRemove }) {
  const item = entry.content;
  const [hovered, setHovered] = useState(false);
  const cfg = CAT[item?.category] || { color: '#7C3AED', dim: 'rgba(124,58,237,0.12)' };
  const sc = STATUS_CFG[entry.status] || STATUS_CFG.COMPLETED;
  const StatusIcon = sc.icon;

  return (
    <div
      style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.25s, box-shadow 0.25s', transform: hovered ? 'translateY(-4px)' : 'none', boxShadow: hovered ? `0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}30` : '0 4px 16px rgba(0,0,0,0.3)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate(`content/${item.id}`)}
    >
      {/* Cover */}
      <div style={{ aspectRatio: '3/4', background: '#1e1e1e', overflow: 'hidden' }}>
        {item?.coverImage
          ? <img src={item.coverImage} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s', transform: hovered ? 'scale(1.08)' : 'scale(1)' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Film size={28} color="#374151" /></div>
        }
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />

        {/* Category badge */}
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <span style={{ padding: '2px 7px', borderRadius: 6, background: cfg.dim, border: `1px solid ${cfg.color}40`, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: cfg.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {item?.category}
          </span>
        </div>

        {/* Rating */}
        {item?.rating && (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 6, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <Star size={9} color="#fbbf24" fill="#fbbf24" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#fbbf24', fontWeight: 700 }}>{Number(item.rating).toFixed(1)}</span>
          </div>
        )}

        {/* Status icon */}
        <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: sc.accent, border: `1px solid ${sc.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StatusIcon size={12} color={sc.color} />
          </div>
        </div>

        {/* Title */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 10px 10px' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem', color: '#fff', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {item?.title}
          </p>
        </div>

        {/* Hover: remove button */}
        {hovered && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(item.id); }}
            style={{ position: 'absolute', top: 8, right: item?.rating ? 44 : 8, width: 24, height: 24, borderRadius: '50%', background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={11} color="#f87171" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── List Row ─────────────────────────────────────────────────
function ListRow({ entry, index, onNavigate, onRemove }) {
  const item = entry.content;
  const [hovered, setHovered] = useState(false);
  const cfg = CAT[item?.category] || { color: '#7C3AED', dim: 'rgba(124,58,237,0.12)' };

  return (
    <div
      onClick={() => onNavigate(`content/${item.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 52px 1fr auto auto',
        alignItems: 'center',
        gap: 14,
        padding: '10px 16px',
        borderRadius: 12,
        cursor: 'pointer',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {/* Rank */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Cover */}
      <div style={{ width: 40, height: 56, borderRadius: 8, overflow: 'hidden', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {item?.coverImage
          ? <img src={item.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Film size={14} color="#374151" /></div>
        }
      </div>

      {/* Info */}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: hovered ? cfg.color : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.15s', marginBottom: 4 }}>
          {item?.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: cfg.color, background: cfg.dim, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {item?.category}
          </span>
          {item?.rating && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Star size={9} fill="currentColor" /> {item.rating}
            </span>
          )}
        </div>
      </div>

      {/* Personal stars */}
      {entry.rating ? (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={11} color="#fbbf24" fill={entry.rating >= i * 2 ? '#fbbf24' : 'transparent'} />
          ))}
        </div>
      ) : <div />}

      {/* Remove */}
      {hovered ? (
        <button
          onClick={e => { e.stopPropagation(); onRemove(item.id); }}
          style={{ padding: '4px 7px', background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 7, cursor: 'pointer', flexShrink: 0 }}
        >
          <X size={12} color="#f87171" />
        </button>
      ) : <div style={{ width: 32 }} />}
    </div>
  );
}

// ── Achievement Badge ────────────────────────────────────────
function AchBadge({ ach, i }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        background: 'rgba(251,191,36,0.04)',
        border: '1px solid rgba(251,191,36,0.12)',
        borderRadius: 16,
        animation: `fadeUp 0.4s ${i * 60}ms ease both`,
        transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.08)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.04)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.12)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px rgba(251,191,36,0.15)' }}>
        <Award size={20} color="#fbbf24" fill="rgba(251,191,36,0.3)" />
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#fbbf24', marginBottom: 2 }}>{ach.title}</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{ach.description}</p>
      </div>
      {ach.unlockedAt && (
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {new Date(ach.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────
function EditModal({ user, onSave, onClose }) {
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast('File is too large (max 5MB)', 'error');
      return;
    }

    try {
      setUploading(true);
      const res = await meApi.uploadAvatar(file);
      if (res.ok) {
        setAvatar(res.url);
        toast('Image uploaded successfully', 'success');
      }
    } catch (err) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try { await onSave({ bio, avatarUrl: avatar }); }
    finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-midnight border border-white/10 rounded-[2rem] overflow-hidden shadow-3xl animate-fade-up" style={{ backgroundColor: 'var(--midnight)' }}>
        <div className="h-1.5 bg-gradient-to-r from-electric-purple via-accent-violet to-cyan-400" style={{ background: 'linear-gradient(90deg, var(--electric-purple), var(--accent-violet), var(--cyan))' }} />
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-display font-black text-xl text-white uppercase tracking-tighter italic">Update Profile</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="flex flex-col gap-8">
            {/* Avatar Upload Area */}
            <div className="flex flex-col items-center gap-4">
              <div 
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-24 h-24 rounded-full p-1 shadow-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--electric-purple), var(--accent-violet))' }}>
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--dark)' }}>
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-electric-purple animate-spin" style={{ color: 'var(--electric-purple)' }} />
                    ) : avatar ? (
                      <img src={avatar} className="w-full h-full object-cover" alt="preview" />
                    ) : (
                      <Camera className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Click to upload from device</span>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 block">Avatar Source (URL)</label>
                <input 
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-purple/50 transition-colors" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
                  value={avatar} 
                  onChange={e => setAvatar(e.target.value)} 
                  placeholder="https://..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 block">Personal Transmission (Bio)</label>
                <textarea 
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-purple/50 transition-colors resize-none" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
                  value={bio} 
                  onChange={e => setBio(e.target.value)} 
                  placeholder="What defines your taste?" 
                  rows={3} 
                />
              </div>
            </div>

            <button 
              onClick={save} 
              disabled={saving || uploading} 
              className="w-full py-4 bg-white text-black rounded-2xl font-display font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Synchronizing...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ProfilePage ──────────────────────────────────────────
export default function ProfilePage({ onNavigate }) {
  const { user, achievements, refetch } = useAuth();
  const { library, loading: libLoading, removeItem } = useLibrary();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('COMPLETED');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const handleSave = async (data) => {
    try {
      await meApi.update(data);
      await refetch();
      toast('Profile updated', 'success');
      setIsEditing(false);
    } catch (err) {
      toast(err.message || 'Failed to update', 'error');
    }
  };

  if (libLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={36} color="#7C3AED" className="animate-spin" />
      </div>
    );
  }

  const completed = library.filter(e => e.status === 'COMPLETED');
  const current = library.filter(e => e.status === 'CURRENT');
  const planning = library.filter(e => e.status === 'PLANNING');
  const totalRated = library.filter(e => e.rating).length;
  const avgRating = totalRated
    ? (library.filter(e => e.rating).reduce((s, e) => s + e.rating, 0) / totalRated).toFixed(1)
    : null;

  const TABS = [
    { id: 'COMPLETED', label: 'Completed', count: completed.length, color: '#34d399' },
    { id: 'CURRENT', label: 'Watching', count: current.length, color: '#22d3ee' },
    { id: 'PLANNING', label: 'Watchlist', count: planning.length, color: '#7C3AED' },
  ];

  const tabItems = activeTab === 'COMPLETED' ? completed : activeTab === 'CURRENT' ? current : planning;
  const tabColor = TABS.find(t => t.id === activeTab)?.color || '#7C3AED';

  // Pick a background cover from current/completed for the hero
  const heroCover = (current[0] || completed[0])?.content?.coverImage;

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .profile-page { display:flex; flex-direction:column; gap:24px; animation:fadeUp 0.5s ease; }
        .avatar-wrap:hover .avatar-overlay { opacity:1; }
        .avatar-overlay { opacity:0; transition:opacity 0.2s; }
      `}</style>

      <div className="profile-page">

        {/* ── HERO CARD ──────────────────────────────────────── */}
        <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Cinematic background */}
          {heroCover ? (
            <>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroCover})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(40px) brightness(0.18) saturate(180%)', transform: 'scale(1.1)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(18,18,36,0.92) 0%, rgba(18,18,28,0.85) 100%)' }} />
            </>
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(18,18,30,0.95)' }} />
          )}

          {/* Ambient glow blobs */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Top accent line */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #7C3AED 0%, #22d3ee 50%, #f472b6 100%)' }} />

          <div style={{ position: 'relative', zIndex: 1, padding: '28px 32px 32px' }}>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>

              {/* Avatar */}
              <div
                className="avatar-wrap"
                style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                onClick={() => setIsEditing(true)}
              >
                <div style={{ width: 100, height: 100, borderRadius: '50%', padding: 3, background: 'linear-gradient(135deg, #7C3AED, #22d3ee)', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#121212' }}>
                    {user.avatarUrl
                      ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, color: '#7C3AED' }}>
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                    }
                  </div>
                </div>
                <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={22} color="#fff" />
                </div>
              </div>

              {/* Identity + DNA */}
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.8rem', color: '#fff', lineHeight: 1 }}>
                    {user.username}
                  </h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer' }}
                  >
                    <Edit3 size={12} color="#6b7280" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Edit</span>
                  </button>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>
                  @{user.email?.split('@')[0]}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6, maxWidth: 420, marginBottom: 24 }}>
                  {user.bio || 'A wanderer across the media horizon.'}
                </p>

                {library.length > 0 && <DNABar library={library} />}
              </div>

              {/* Stats cluster */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flexShrink: 0 }}>
                {[
                  { label: 'Total', value: library.length, color: '#8B5CF6' },
                  { label: 'Completed', value: completed.length, color: '#34d399' },
                  { label: 'Watching', value: current.length, color: '#22d3ee' },
                  { label: 'Avg Rating', value: avgRating || '—', color: '#fbbf24', raw: true },
                ].map(s => (
                  <div key={s.label} style={{
                    padding: '14px 18px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14,
                    textAlign: 'center',
                    minWidth: 90,
                  }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', lineHeight: 1, marginBottom: 4, color: s.color }}>
                      {s.raw ? s.value : <AnimNum target={s.value} color={s.color} />}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Currently watching strip */}
            {current.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Now Watching</span>
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {current.slice(0, 8).map(e => (
                    <div
                      key={e.id}
                      title={e.content?.title}
                      onClick={() => onNavigate(`content/${e.content?.id}`)}
                      style={{ width: 48, height: 68, borderRadius: 8, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', border: '1px solid rgba(34,211,238,0.2)', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                      onMouseEnter={el => el.currentTarget.style.transform = 'scale(1.08)'}
                      onMouseLeave={el => el.currentTarget.style.transform = 'none'}
                    >
                      {e.content?.coverImage
                        ? <img src={e.content.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        : <div style={{ width: '100%', height: '100%', background: '#1e1e1e' }} />
                      }
                    </div>
                  ))}
                  {current.length > 8 && (
                    <div style={{ width: 48, height: 68, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{current.length - 8}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ACHIEVEMENTS ───────────────────────────────────── */}
        {achievements?.length > 0 && (
          <div style={{ animation: 'fadeUp 0.5s 0.08s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Award size={16} color="#fbbf24" fill="rgba(251,191,36,0.3)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
                Achievements — {achievements.length} unlocked
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {achievements.map((ach, i) => <AchBadge key={ach.title} ach={ach} i={i} />)}
            </div>
          </div>
        )}

        {/* ── LIBRARY SECTION ────────────────────────────────── */}
        <div style={{ animation: 'fadeUp 0.5s 0.14s ease both' }}>

          {/* Tab row + view toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 18px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: activeTab === tab.id ? `${tab.color}18` : 'transparent',
                    color: activeTab === tab.id ? tab.color : 'var(--text-muted)',
                    borderBottom: activeTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                    padding: '1px 7px', borderRadius: 99,
                    background: activeTab === tab.id ? `${tab.color}20` : 'rgba(255,255,255,0.06)',
                    color: activeTab === tab.id ? tab.color : 'var(--text-muted)',
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Grid / List toggle */}
            <div style={{ display: 'flex', gap: 2, padding: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
              {[['grid', LayoutGrid], ['list', List]].map(([mode, Icon]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: viewMode === mode ? 'rgba(124,58,237,0.2)' : 'transparent',
                    color: viewMode === mode ? '#7C3AED' : '#4b5563',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {tabItems.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 20 }}>
              <Compass size={36} color="#374151" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 14 }}>
                Nothing here yet
              </p>
              <button
                onClick={() => onNavigate('discover')}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.12em', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Browse the index →
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
              {tabItems.map((entry, i) => (
                <div key={entry.id} style={{ animation: `fadeUp 0.35s ${i * 30}ms ease both` }}>
                  <GridCard entry={entry} onNavigate={onNavigate} onRemove={removeItem} />
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW */
            <div style={{ background: 'rgba(18,18,30,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 52px 1fr auto auto', gap: 14, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                {['#', '', 'Title', 'Rating', ''].map((h, i) => (
                  <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
                ))}
              </div>
              {tabItems.map((entry, i) => (
                <div key={entry.id} style={{ animation: `fadeUp 0.35s ${i * 25}ms ease both` }}>
                  <ListRow entry={entry} index={i} onNavigate={onNavigate} onRemove={removeItem} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isEditing && <EditModal user={user} onSave={handleSave} onClose={() => setIsEditing(false)} />}
    </>
  );
}