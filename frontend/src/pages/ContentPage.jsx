import { useState, useEffect, useRef } from 'react';
import { content as contentApi, discord as discordApi, favourites as favouritesApi } from '../api/client';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import {
  Star, Database, ExternalLink, Loader2, Bookmark,
  Check, Play, ArrowLeft, Layers, Activity, X,
  MessageCircle, Zap, Hash, Clock, Eye, Heart
} from 'lucide-react';

const CAT_PALETTES = {
  Anime: {
    primary: '#f472b6',
    secondary: '#ec4899',
    glow: 'rgba(244, 114, 182, 0.35)',
    dim: 'rgba(244, 114, 182, 0.08)',
    border: 'rgba(244, 114, 182, 0.2)',
    gradient: 'linear-gradient(135deg, rgba(244,114,182,0.15) 0%, rgba(124,58,237,0.08) 100%)',
  },
  Manga: {
    primary: '#60a5fa',
    secondary: '#3b82f6',
    glow: 'rgba(96, 165, 250, 0.35)',
    dim: 'rgba(96, 165, 250, 0.08)',
    border: 'rgba(96, 165, 250, 0.2)',
    gradient: 'linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(124,58,237,0.08) 100%)',
  },
  Movie: {
    primary: '#fbbf24',
    secondary: '#f59e0b',
    glow: 'rgba(251, 191, 36, 0.35)',
    dim: 'rgba(251, 191, 36, 0.08)',
    border: 'rgba(251, 191, 36, 0.2)',
    gradient: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(124,58,237,0.08) 100%)',
  },
  TV: {
    primary: '#34d399',
    secondary: '#10b981',
    glow: 'rgba(52, 211, 153, 0.35)',
    dim: 'rgba(52, 211, 153, 0.08)',
    border: 'rgba(52, 211, 153, 0.2)',
    gradient: 'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(124,58,237,0.08) 100%)',
  },
};

const fallbackPalette = {
  primary: '#7C3AED',
  secondary: '#6D28D9',
  glow: 'rgba(124, 58, 237, 0.35)',
  dim: 'rgba(124, 58, 237, 0.08)',
  border: 'rgba(124, 58, 237, 0.2)',
  gradient: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(34,211,238,0.08) 100%)',
};

function StarRating({ value, max = 10, interactive = false, onRate }) {
  const [hovered, setHovered] = useState(null);
  const stars = 5;

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: stars }).map((_, i) => {
        const starVal = (i + 1) * 2;
        const display = hovered !== null ? hovered : value;
        const filled = display >= starVal - 1;
        return (
          <button
            key={i}
            onClick={() => interactive && onRate?.(starVal)}
            onMouseEnter={() => interactive && setHovered(starVal)}
            onMouseLeave={() => interactive && setHovered(null)}
            style={{
              background: 'none', border: 'none',
              cursor: interactive ? 'pointer' : 'default',
              padding: 0, transition: 'transform 0.15s',
              transform: interactive && hovered !== null && hovered >= starVal - 1 ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            <Star
              size={interactive ? 22 : 14}
              color="#fbbf24"
              fill={filled ? '#fbbf24' : 'transparent'}
              style={{ filter: filled ? 'drop-shadow(0 0 6px rgba(251,191,36,0.6))' : 'none', transition: 'all 0.15s' }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ParallaxCover({ src, palette }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleScroll = () => {
      const scrolled = window.scrollY;
      el.style.transform = `translateY(${scrolled * 0.3}px)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      borderRadius: 'inherit',
    }}>
      {src ? (
        <img
          ref={ref}
          src={src}
          alt=""
          style={{
            position: 'absolute', inset: '-20%',
            width: '140%', height: '140%',
            objectFit: 'cover',
            filter: 'blur(60px) brightness(0.15) saturate(200%)',
          }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 20%, ${palette.glow} 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(124,58,237,0.1) 0%, transparent 60%)` }} />
      )}
      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(9,9,11,0.7) 0%, rgba(9,9,11,0.95) 100%)' }} />
      {/* Colored tint from palette */}
      <div style={{ position: 'absolute', inset: 0, background: palette.gradient, opacity: 0.6 }} />
    </div>
  );
}

function TagPill({ tag, palette }) {
  const [hovered, setHovered] = useState(false);
  const typeColors = {
    Genre: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.25)' },
    Mood: { color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.25)' },
    Theme: { color: palette.primary, bg: palette.dim, border: palette.border },
  };
  const tc = typeColors[tag.type] || typeColors.Genre;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 13px', borderRadius: 99,
        background: hovered ? tc.bg : 'rgba(255,255,255,0.04)',
        border: hovered ? `1px solid ${tc.border}` : '1px solid rgba(255,255,255,0.08)',
        transition: 'all 0.2s', cursor: 'default',
      }}
    >
      <Hash size={9} color={tc.color} />
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
        color: hovered ? tc.color : '#9ca3af',
        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
        transition: 'color 0.2s',
      }}>
        {tag.name}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {tag.type}
      </span>
    </div>
  );
}

function LibraryButton({ status, label, icon: Icon, activeColor, currentStatus, onClick }) {
  const isActive = currentStatus === status;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '11px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        transition: 'all 0.2s',
        background: isActive
          ? `${activeColor}20`
          : hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        color: isActive ? activeColor : hovered ? '#fff' : '#9ca3af',
        border: isActive ? `1px solid ${activeColor}40` : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isActive ? `0 0 20px ${activeColor}20, inset 0 0 20px ${activeColor}05` : 'none',
        transform: hovered && !isActive ? 'translateY(-1px)' : 'none',
      }}
    >
      <Icon
        size={15}
        fill={isActive ? activeColor : 'none'}
        color={isActive ? activeColor : 'currentColor'}
      />
      {label}
      {isActive && (
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: activeColor, boxShadow: `0 0 6px ${activeColor}`, marginLeft: 2, animation: 'pulse 2s infinite' }} />
      )}
    </button>
  );
}

export default function ContentPage({ id, goBack }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDiscordForm, setShowDiscordForm] = useState(false);
  const [discordInvite, setDiscordInvite] = useState('');
  const [isSubmittingDiscord, setIsSubmittingDiscord] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const { updateItem, removeItem, isInLibrary } = useLibrary();
  const toast = useToast();
  const heroRef = useRef(null);

  useEffect(() => {
    contentApi.get(id)
      .then(res => {
        setItem(res.content);
        setIsFavourite(res.content.isFavourite || false);
      })
      .catch(() => toast('Content unavailable.', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <Loader2 size={40} color="#7C3AED" style={{ animation: 'spin 0.8s linear infinite' }} />
          <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '1px solid rgba(124,58,237,0.2)', animation: 'ping 1.5s ease-out infinite' }} />
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.25em' }}>
          Retrieving transmission...
        </p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes ping { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } }
        `}</style>
      </div>
    );
  }

  if (!item) return null;

  const palette = CAT_PALETTES[item.category] || fallbackPalette;
  const entry = isInLibrary(item.id);

  const handleAction = async (status) => {
    if (entry?.status === status) await removeItem(item.id);
    else await updateItem(item.id, status, entry?.rating || null);
  };

  const handleToggleFavourite = async () => {
    try {
      if (isFavourite) {
        await favouritesApi.remove(item.id);
        setIsFavourite(false);
        toast('Removed from favourites', 'info');
      } else {
        await favouritesApi.add(item.id);
        setIsFavourite(true);
        toast('Added to favourites!', 'success');
      }
    } catch (err) {
      toast('Failed to update favourites', 'error');
    }
  };

  const handleRate = async (newRating) => {
    const status = entry?.status || 'COMPLETED';
    await updateItem(item.id, status, newRating);
  };

  const handleDiscordSubmit = async (e) => {
    e.preventDefault();
    if (!discordInvite) return;
    try {
      setIsSubmittingDiscord(true);
      await discordApi.recommend({ contentId: item.id, inviteLink: discordInvite });
      toast('Recommendation submitted for review!', 'success');
      setShowDiscordForm(false);
      setDiscordInvite('');
    } catch (err) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setIsSubmittingDiscord(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
        @keyframes ping { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes coverReveal { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .back-btn:hover { background: rgba(255,255,255,0.08) !important; color: #fff !important; transform: translateX(-2px); }
        .back-btn:hover .back-arrow { transform: translateX(-3px); }
        .back-arrow { transition: transform 0.2s; }
        .section-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent); margin: 32px 0; }
      `}</style>

      {/* ── FULL-PAGE ATMOSPHERIC BACKGROUND ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {item.coverImage && (
          <img
            src={item.coverImage}
            alt=""
            style={{
              position: 'absolute', inset: '-15%',
              width: '130%', height: '130%',
              objectFit: 'cover',
              filter: 'blur(80px) brightness(0.1) saturate(180%)',
            }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(9,9,11,0.6) 0%, #09090b 60%)' }} />
        {/* Colored atmospheric glow */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: '50%',
          background: `radial-gradient(ellipse at 50% 0%, ${palette.glow} 0%, transparent 70%)`,
          opacity: 0.5,
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1300, margin: '0 auto', padding: '32px 40px 80px' }}>

        {/* ── BACK BUTTON ── */}
        <button
          onClick={goBack}
          className="back-btn"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginBottom: 40,
            padding: '9px 16px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: '#6b7280', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.72rem',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            transition: 'all 0.2s',
            animation: 'fadeIn 0.4s ease',
          }}
        >
          <ArrowLeft size={14} className="back-arrow" />
          Back
        </button>

        {/* ── MAIN LAYOUT ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 60, alignItems: 'start' }}>

          {/* ════════════════════════════════
              LEFT COLUMN — COVER + ACTIONS
              ════════════════════════════════ */}
          <div style={{ position: 'sticky', top: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Cover Art */}
            <div
              style={{
                position: 'relative', borderRadius: 20, overflow: 'hidden',
                aspectRatio: '2/3',
                boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08), 0 0 60px ${palette.glow}`,
                animation: 'coverReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
              }}
            >
              {item.coverImage ? (
                <img
                  src={item.coverImage}
                  alt={item.title}
                  onLoad={() => setImageLoaded(true)}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    display: 'block',
                    opacity: imageLoaded ? 1 : 0,
                    transition: 'opacity 0.4s',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: `linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                }}>
                  <Database size={48} color="#2d2d3d" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#2d2d3d', textTransform: 'uppercase', letterSpacing: '0.15em' }}>No Cover</span>
                </div>
              )}

              {/* Category badge on cover */}
              <div style={{ position: 'absolute', top: 12, left: 12 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 99,
                  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
                  border: `1px solid ${palette.border}`,
                  fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700,
                  color: palette.primary, textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: palette.primary, boxShadow: `0 0 6px ${palette.primary}` }} />
                  {item.category}
                </span>
              </div>

              {/* Status badge if in library */}
              {entry && (
                <div style={{
                  position: 'absolute', bottom: 12, right: 12,
                  padding: '5px 12px', borderRadius: 99,
                  background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                  border: `1px solid rgba(255,255,255,0.1)`,
                  fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700,
                  color: entry.status === 'COMPLETED' ? '#34d399' : entry.status === 'CURRENT' ? '#22d3ee' : '#7C3AED',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', animation: 'pulse 2s infinite' }} />
                  {entry.status === 'COMPLETED' ? 'Completed' : entry.status === 'CURRENT' ? 'Watching' : 'Planned'}
                </div>
              )}
            </div>

            {/* Quick meta info */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: '16px 18px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              animation: 'fadeUp 0.5s 0.25s ease both',
            }}>
              {item.rating && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Global Score</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <StarRating value={item.rating} max={10} />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.95rem', color: '#fbbf24' }}>
                      {Number(item.rating).toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
              {item.source && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Source</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.source}</span>
                </div>
              )}
              {item.status && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: palette.primary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.status}</span>
                </div>
              )}
              {item.tags?.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0, paddingTop: 2 }}>Tags</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#6b7280', textAlign: 'right', lineHeight: 1.6 }}>
                    {item.tags.map(t => t.name).join(' · ')}
                  </span>
                </div>
              )}
            </div>

            {/* Discord section */}
            <div style={{ animation: 'fadeUp 0.5s 0.35s ease both' }}>
              {item.discordLink ? (
                <a
                  href={item.discordLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    padding: '13px', borderRadius: 12,
                    background: 'rgba(88,101,242,0.1)',
                    border: '1px solid rgba(88,101,242,0.25)',
                    color: '#5865F2', textDecoration: 'none',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#5865F2'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(88,101,242,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(88,101,242,0.1)'; e.currentTarget.style.color = '#5865F2'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <ExternalLink size={15} /> Join Community Server
                </a>
              ) : showDiscordForm ? (
                <form
                  onSubmit={handleDiscordSubmit}
                  style={{
                    padding: '16px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Submit Discord Invite</span>
                    <button type="button" onClick={() => setShowDiscordForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="url" placeholder="https://discord.gg/..."
                    value={discordInvite}
                    onChange={e => setDiscordInvite(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '9px 12px',
                      fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#fff', outline: 'none',
                    }}
                    required
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="submit" disabled={isSubmittingDiscord}
                      style={{
                        flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                        background: '#5865F2', color: '#fff', cursor: 'pointer',
                        fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        opacity: isSubmittingDiscord ? 0.6 : 1,
                      }}
                    >
                      {isSubmittingDiscord ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                      Submit
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowDiscordForm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                    padding: '12px', borderRadius: 12, width: '100%', border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(88,101,242,0.2)',
                    color: '#4b5563',
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.75rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(88,101,242,0.4)'; e.currentTarget.style.color = '#5865F2'; e.currentTarget.style.background = 'rgba(88,101,242,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(88,101,242,0.2)'; e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <MessageCircle size={14} /> Recommend Discord Server
                </button>
              )}
            </div>
          </div>

          {/* ════════════════════════════════
              RIGHT COLUMN — CONTENT INFO
              ════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 8 }}>

            {/* Category label + title */}
            <div style={{ marginBottom: 24, animation: 'slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 4,
                  background: palette.dim,
                  fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700,
                  color: palette.primary, textTransform: 'uppercase', letterSpacing: '0.15em',
                }}>
                  {item.category}
                </span>
                {item.status && (
                  <span style={{
                    padding: '4px 12px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.04)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                    color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em',
                  }}>
                    {item.status}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <h1 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 900,
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  color: '#fff', lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  marginBottom: 0,
                }}>
                  {item.title}
                </h1>

                {/* Prominent Favourite Toggle */}
                <button
                  onClick={handleToggleFavourite}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: isFavourite ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                    color: isFavourite ? '#ef4444' : '#4b5563',
                    border: isFavourite ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    marginTop: 8,
                    boxShadow: isFavourite ? '0 0 20px rgba(239,68,68,0.2)' : 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'; if (!isFavourite) e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; if (!isFavourite) e.currentTarget.style.color = '#4b5563'; }}
                >
                  <Heart size={24} fill={isFavourite ? '#ef4444' : 'none'} />
                </button>
              </div>

              {/* Decorative line */}
              <div style={{
                marginTop: 20, height: 3, width: 80, borderRadius: 99,
                background: `linear-gradient(90deg, ${palette.primary}, transparent)`,
                boxShadow: `0 0 16px ${palette.glow}`,
              }} />
            </div>

            {/* Rating display */}
            {item.rating && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 14,
                padding: '12px 20px', borderRadius: 12, marginBottom: 28,
                background: 'rgba(251,191,36,0.05)',
                border: '1px solid rgba(251,191,36,0.15)',
                width: 'fit-content',
                animation: 'fadeUp 0.5s 0.2s ease both',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                    Global Score
                  </span>
                  <StarRating value={item.rating} max={10} />
                </div>
                <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />
                <div>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontWeight: 900,
                    fontSize: '2rem', color: '#fbbf24', lineHeight: 1,
                    filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.4))',
                  }}>
                    {Number(item.rating).toFixed(1)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#4b5563', marginLeft: 4 }}>/10</span>
                </div>
              </div>
            )}

            {/* Tags */}
            {item.tags?.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32,
                animation: 'fadeUp 0.5s 0.25s ease both',
              }}>
                {item.tags.map(tag => <TagPill key={tag.id} tag={tag} palette={palette} />)}
              </div>
            )}

            <div className="section-divider" />

            {/* Synopsis */}
            <div style={{ marginBottom: 32, animation: 'fadeUp 0.5s 0.3s ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Eye size={13} color="#4b5563" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  Synopsis
                </span>
              </div>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '1rem',
                color: '#9ca3af', lineHeight: 1.9,
                maxWidth: 680,
                fontStyle: 'italic',
              }}>
                {item.description}
              </p>
            </div>

            <div className="section-divider" />

            {/* ── LIBRARY CONTROLS ── */}
            <div style={{
              padding: '28px 32px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20,
              position: 'relative', overflow: 'hidden',
              animation: 'fadeUp 0.5s 0.35s ease both',
            }}>
              {/* Ambient corner glow */}
              <div style={{
                position: 'absolute', top: -40, right: -40, width: 200, height: 200,
                background: `radial-gradient(circle, ${palette.glow} 0%, transparent 70%)`,
                opacity: 0.3, pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Activity size={14} color={palette.primary} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    Library Status
                  </span>
                  {entry && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 20,
                      background: palette.dim,
                      fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700,
                      color: palette.primary, textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      In Library
                    </span>
                  )}
                </div>

                {/* Status buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                  <LibraryButton
                    status="PLANNING" label="Watchlist" icon={Bookmark}
                    activeColor="#7C3AED" currentStatus={entry?.status}
                    onClick={() => handleAction('PLANNING')}
                  />
                  <LibraryButton
                    status="CURRENT" label="Watching" icon={Play}
                    activeColor="#22d3ee" currentStatus={entry?.status}
                    onClick={() => handleAction('CURRENT')}
                  />
                  <LibraryButton
                    status="COMPLETED" label="Completed" icon={Check}
                    activeColor="#34d399" currentStatus={entry?.status}
                    onClick={() => handleAction('COMPLETED')}
                  />
                </div>

                {/* Personal Rating */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Zap size={12} color="#4b5563" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                      Your Rating
                    </span>
                    {entry?.rating && (
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.9rem', color: '#fbbf24' }}>
                        {entry.rating}/10
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StarRating value={entry?.rating || 0} max={10} interactive onRate={handleRate} />
                    {entry?.rating && (
                      <button
                        onClick={() => handleRate(null)}
                        style={{
                          marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#374151',
                          textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = '#374151'}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Source info */}
            {(item.source || item.externalId) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16, marginTop: 20,
                padding: '12px 18px', borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                animation: 'fadeUp 0.5s 0.4s ease both',
              }}>
                <Layers size={13} color="#374151" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Data sourced from <span style={{ color: '#4b5563' }}>{item.source}</span>
                  {item.externalId && <span style={{ color: '#2d2d3d' }}> · ID {item.externalId}</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}