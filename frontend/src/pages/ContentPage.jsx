import { useState, useEffect, useRef } from 'react';
import { content as contentApi, discord as discordApi, subreddit as subredditApi, favourites as favouritesApi, reviews as reviewsApi, library as libraryApi } from '../api/client';
import { useLibrary } from '../hooks/useLibrary';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  Star, Database, ExternalLink, Loader2, Bookmark,
  Check, Play, ArrowLeft, Layers, Activity, X,
  MessageCircle, Zap, Hash, Clock, Eye, Heart, Search,
  BookOpen, Tv, Film, Plus, Minus, CheckCircle2, ListFilter,
  Sparkles, CheckCheck
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

function EpisodeTracker({ item, entry, palette, onUpdateProgress }) {
  const [episodesData, setEpisodesData] = useState(null);
  const [loadingEps, setLoadingEps] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [hoveredEp, setHoveredEp] = useState(null);

  const isManga = item.category === 'Manga';
  const isMovie = item.category === 'Movie';
  const unitName = isManga ? 'Chapter' : 'Episode';
  const unitPlural = isManga ? 'Chapters' : 'Episodes';

  useEffect(() => {
    if (isMovie) return;
    setLoadingEps(true);
    contentApi.getEpisodes(item.id)
      .then(res => {
        if (res.ok) setEpisodesData(res);
      })
      .catch(console.error)
      .finally(() => setLoadingEps(false));
  }, [item.id, isMovie]);

  if (isMovie) return null;

  const total = episodesData?.totalEpisodes || item.totalEpisodes || (isManga ? item.totalChapters : null) || (episodesData?.episodes?.length) || 0;
  const currentProgress = entry?.progress || 0;
  const percent = total > 0 ? Math.min(100, Math.round((currentProgress / total) * 100)) : 0;
  const episodesList = episodesData?.episodes || [];

  const chunkSize = 50;
  const totalItems = Math.max(total, episodesList.length, 1);
  const totalChunks = Math.ceil(totalItems / chunkSize);
  const startIdx = activeTab * chunkSize;
  const endIdx = Math.min(totalItems, (activeTab + 1) * chunkSize);

  // Generate slice of episodes for active chunk
  const displayEpisodes = [];
  for (let i = startIdx + 1; i <= endIdx; i++) {
    const existingMeta = episodesList[i - 1];
    displayEpisodes.push(existingMeta || {
      episodeNumber: i,
      title: `${unitName} ${i}`,
      thumbnail: null,
    });
  }

  return (
    <div style={{
      padding: '28px 32px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 20,
      position: 'relative', overflow: 'hidden',
      marginBottom: 32,
      animation: 'fadeUp 0.5s 0.38s ease both',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -30, left: -30, width: 220, height: 220,
        background: `radial-gradient(circle, ${palette.glow} 0%, transparent 70%)`,
        opacity: 0.25, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header with Title & Stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tv size={16} color={palette.primary} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', letterSpacing: '-0.01em' }}>
              {isManga ? 'Chapter Tracker' : 'Episode Tracker'}
            </span>
            {total > 0 && (
              <span style={{
                padding: '3px 10px', borderRadius: 99,
                background: palette.dim, border: `1px solid ${palette.border}`,
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 700,
                color: palette.primary, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {total} {total === 1 ? unitName : unitPlural}
              </span>
            )}
          </div>

          {/* Quick Step Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onUpdateProgress(Math.max(0, currentProgress - 1))}
              disabled={currentProgress <= 0}
              title="Decrease 1"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '8px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: currentProgress <= 0 ? '#374151' : '#d1d5db',
                cursor: currentProgress <= 0 ? 'default' : 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (currentProgress > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <Minus size={13} /> 1
            </button>

            <button
              onClick={() => onUpdateProgress(total > 0 ? Math.min(total, currentProgress + 1) : currentProgress + 1)}
              title="Increase 1"
              disabled={total <= 0}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: palette.primary, border: 'none',
                color: '#000', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                boxShadow: `0 4px 16px ${palette.glow}`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Plus size={14} /> +1 {unitName}
            </button>

            {total > 0 && currentProgress < total && (
              <button
                onClick={() => onUpdateProgress(total, 'COMPLETED')}
                title="Mark All Completed"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '8px 14px', borderRadius: 10,
                  background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.25)',
                  color: '#34d399', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52, 211, 153, 0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52, 211, 153, 0.1)'; }}
              >
                <CheckCheck size={14} /> All
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar & Status Text */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#9ca3af' }}>
              Progress: <strong style={{ color: '#fff', fontWeight: 800 }}>{currentProgress}</strong> {total > 0 ? `/ ${total} ${unitPlural.toLowerCase()}` : `${unitPlural.toLowerCase()}`}
            </span>
            {total > 0 && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 900, color: palette.primary }}>
                {percent}%
              </span>
            )}
          </div>

          <div style={{
            width: '100%', height: 8, borderRadius: 99,
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              height: '100%', width: `${percent}%`,
              background: `linear-gradient(90deg, ${palette.secondary}, ${palette.primary})`,
              borderRadius: 99,
              boxShadow: `0 0 12px ${palette.glow}`,
              transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }} />
          </div>
        </div>

        {/* Tab pagination if > 50 episodes */}
        {totalChunks > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {Array.from({ length: totalChunks }).map((_, idx) => {
              const start = idx * chunkSize + 1;
              const end = Math.min(totalItems, (idx + 1) * chunkSize);
              const isTabActive = activeTab === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  style={{
                    padding: '5px 12px', borderRadius: 8,
                    background: isTabActive ? palette.primary : 'rgba(255,255,255,0.04)',
                    color: isTabActive ? '#000' : '#9ca3af',
                    border: isTabActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {start} - {end}
                </button>
              );
            })}
          </div>
        )}

        {/* Interactive Episode Grid */}
        {loadingEps ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '24px 0', justifyContent: 'center' }}>
            <Loader2 size={18} color={palette.primary} className="animate-spin" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#6b7280' }}>Loading episode details...</span>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
            gap: 8,
            maxHeight: 320,
            overflowY: 'auto',
            paddingRight: 4,
          }}>
            {displayEpisodes.map((ep) => {
              const epNum = ep.episodeNumber;
              const isWatched = currentProgress >= epNum;
              const isNext = currentProgress + 1 === epNum;

              return (
                <button
                  key={epNum}
                  onClick={() => onUpdateProgress(epNum)}
                  onMouseEnter={() => setHoveredEp(ep)}
                  onMouseLeave={() => setHoveredEp(null)}
                  title={ep.title || `${unitName} ${epNum}`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '10px 4px', borderRadius: 10,
                    cursor: 'pointer', transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: isWatched
                      ? `${palette.primary}25`
                      : isNext
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(255,255,255,0.02)',
                    border: isWatched
                      ? `1px solid ${palette.primary}60`
                      : isNext
                      ? `1px solid ${palette.primary}`
                      : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: isNext ? `0 0 14px ${palette.glow}` : isWatched ? `0 2px 8px ${palette.glow}` : 'none',
                    transform: isNext ? 'scale(1.04)' : 'scale(1)',
                    position: 'relative',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                    color: isWatched ? palette.primary : '#6b7280',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {isManga ? 'CH' : 'EP'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontWeight: 900,
                    fontSize: '1rem',
                    color: isWatched ? '#fff' : isNext ? palette.primary : '#9ca3af',
                    lineHeight: 1.1,
                  }}>
                    {epNum}
                  </span>

                  {isWatched && (
                    <div style={{ marginTop: 2 }}>
                      <CheckCircle2 size={10} color={palette.primary} />
                    </div>
                  )}
                  {isNext && (
                    <div style={{
                      position: 'absolute', top: -3, right: -3,
                      width: 7, height: 7, borderRadius: '50%',
                      background: palette.primary, boxShadow: `0 0 8px ${palette.primary}`,
                      animation: 'pulse 1.5s infinite',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected / Hovered Episode Preview Bar */}
        {hoveredEp && (hoveredEp.title || hoveredEp.thumbnail) && (
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', gap: 12,
            animation: 'fadeIn 0.2s ease',
          }}>
            {hoveredEp.thumbnail && (
              <img src={hoveredEp.thumbnail} alt="" style={{ width: 48, height: 32, borderRadius: 6, objectFit: 'cover' }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: palette.primary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {unitName} {hoveredEp.episodeNumber}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                {hoveredEp.title || `${unitName} ${hoveredEp.episodeNumber}`}
              </span>
            </div>
            {hoveredEp.url && (
              <a
                href={hoveredEp.url}
                target="_blank"
                rel="noreferrer"
                style={{ marginLeft: 'auto', color: palette.primary, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
              >
                Watch <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}
      </div>
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
        padding: '11px 20px', borderRadius: 12, cursor: 'pointer',
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
  const [showSubredditForm, setShowSubredditForm] = useState(false);
  const [subredditName, setSubredditName] = useState('');
  const [isSubmittingSubreddit, setIsSubmittingSubreddit] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [platformReviews, setPlatformReviews] = useState([]);
  const [platformStats, setPlatformStats] = useState({ average: 0, count: 0 });
  const [watchSource, setWatchSource] = useState(null);
  const [newReview, setNewReview] = useState({ rating: 10, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  const { user, favourites, refetch } = useAuth();
  const { updateItem, removeItem, isInLibrary } = useLibrary();
  const toast = useToast();
  const heroRef = useRef(null);

  useEffect(() => {
    contentApi.get(id)
      .then(res => {
        setItem(res.content);
        setPlatformStats({
          average: res.content.platformAverage || 0,
          count: res.content.platformReviewCount || 0
        });
        // Check if item is in global favourites list
        const fav = favourites.some(f => f.contentId === Number(id));
        setIsFavourite(fav);
      })
      .catch(() => toast('Content unavailable.', 'error'))
      .finally(() => setLoading(false));

    // Fetch reviews
    reviewsApi.get(id)
      .then(res => {
        if (res.ok) {
          setPlatformReviews(res.reviews);
          setPlatformStats({
            average: res.averageRating || 0,
            count: res.reviewCount || 0
          });
        }
      })
      .catch(console.error);

    // Fetch sources
    setIsLoadingSources(true);
    contentApi.getSources(id)
      .then(res => {
        if (res.ok) setWatchSource(res.sources);
      })
      .catch(console.error)
      .finally(() => setIsLoadingSources(false));
  }, [id, favourites]);

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
    else await updateItem(item.id, status, entry?.rating || null, entry?.progress || 0);
  };

  const handleProgressUpdate = async (newProgress, forcedStatus = null) => {
    if (!user) return toast('Please sign in to track progress.', 'info');
    const total = item.totalEpisodes || (item.category === 'Manga' ? item.totalChapters : null) || 0;
    let status = entry?.status || 'CURRENT';
    if (forcedStatus) {
      status = forcedStatus;
    } else if (total > 0 && newProgress >= total) {
      status = 'COMPLETED';
    } else if (!entry || status === 'PLANNING') {
      status = 'CURRENT';
    }
    await updateItem(item.id, status, entry?.rating || null, newProgress);
  };

  const handleToggleFavourite = async () => {
    if (!user) return toast('Please sign in to save favourites.', 'info');
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
      // Refresh global state so other pages reflect change
      refetch();
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

  const handleSubredditSubmit = async (e) => {
    e.preventDefault();
    if (!subredditName) return;
    try {
      setIsSubmittingSubreddit(true);
      await subredditApi.recommend({ contentId: item.id, subreddit: subredditName });
      toast('Subreddit recommendation submitted!', 'success');
      setShowSubredditForm(false);
      setSubredditName('');
    } catch (err) {
      toast(err.message || 'Failed to submit', 'error');
    } finally {
      setIsSubmittingSubreddit(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast('Sign in to leave a review.', 'info');
    if (!newReview.comment.trim()) return toast('Please enter a comment.', 'info');

    try {
      setIsSubmittingReview(true);
      await reviewsApi.add({
        contentId: item.id,
        rating: newReview.rating,
        comment: newReview.comment
      });
      toast('Review posted!', 'success');
      setNewReview({ rating: 10, comment: '' });
      // Refresh reviews
      const res = await reviewsApi.get(item.id);
      if (res.ok) {
        setPlatformReviews(res.reviews);
        setPlatformStats({ average: res.averageRating, count: res.reviewCount });
      }
    } catch (err) {
      toast('Failed to post review', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleMarkAllCompleted = async () => {
    if (!user) return toast('Sign in to use this feature.', 'info');
    try {
      setLoading(true);
      const res = await libraryApi.markAllCompleted(item.id);
      toast(res.message, 'success');
      // Refresh library state
      refetch();
      // Reload item to see updated status if needed (though local library state handles most of it)
      const contentRes = await contentApi.get(id);
      setItem(contentRes.content);
    } catch (err) {
      toast('Failed to mark all completed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getWatchUrl = () => {
    if (watchSource) return watchSource;
    if (item.category === 'Anime') return `https://www.crunchyroll.com/search?q=${encodeURIComponent(item.title)}`;
    if (item.category === 'Manga') return `https://www.viz.com/search?query=${encodeURIComponent(item.title)}`;
    return null;
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

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1300, margin: '0 auto', padding: '32px 40px 80px' }} className="content-page-wrapper">

        {/* ── TOP NAVIGATION ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, animation: 'fadeIn 0.4s ease' }} className="content-top-nav">
          <button
            onClick={goBack}
            className="back-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#6b7280', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.72rem',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              transition: 'all 0.2s',
            }}
          >
            <ArrowLeft size={14} className="back-arrow" /> Back
          </button>

          {/* TOP BAR FAVOURITE TOGGLE */}
          <button
            onClick={handleToggleFavourite}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: isFavourite ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
              border: isFavourite ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '9px 20px',
              color: isFavourite ? '#ef4444' : '#6b7280',
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isFavourite ? '0 0 20px rgba(239,68,68,0.25)' : 'none',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => { if (!isFavourite) e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { if (!isFavourite) e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.transform = 'none'; }}
          >
            <Heart size={15} fill={isFavourite ? '#ef4444' : 'none'} />
            <span className="fav-text">{isFavourite ? 'Favourited' : 'Add Favourite'}</span>
          </button>
        </div>

        {/* ── MAIN LAYOUT ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 60, alignItems: 'start' }} className="content-main-grid">
          <style>{`
            @media (max-width: 1024px) {
              .content-page-wrapper { padding: 24px 20px 80px !important; }
              .content-main-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
              .content-left-col { position: relative !important; top: 0 !important; width: 100% !important; max-width: 320px !important; margin: 0 auto !important; }
              .content-top-nav { margin-bottom: 24px !important; }
              .fav-text { display: none; }
            }
          `}</style>

          {/* ════════════════════════════════
              LEFT COLUMN — COVER + ACTIONS
              ════════════════════════════════ */}
          <div style={{ position: 'sticky', top: 32, display: 'flex', flexDirection: 'column', gap: 16 }} className="content-left-col">

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

            {/* Watch / Read Now Button */}
            <div style={{ animation: 'fadeUp 0.5s 0.2s ease both' }}>
              <a
                href={getWatchUrl()}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  width: '100%', padding: '16px', borderRadius: 14,
                  background: palette.primary, color: '#000',
                  textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 900,
                  fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                  boxShadow: `0 12px 32px ${palette.glow}`,
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${palette.glow}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; e.currentTarget.style.boxShadow = `0 12px 32px ${palette.glow}`; }}
              >
                {item.category === 'Manga' ? <BookOpen size={18} /> : item.category === 'Movie' ? <Film size={18} /> : <Play size={18} fill="currentColor" />}
                {item.category === 'Manga' ? 'Read Now' : 'Watch Now'}
              </a>
            </div>

            {/* Mark All Completed (if series/seasons exist) */}
            {(item.category === 'Anime' || item.category === 'TV' || item.category === 'Manga' || item.children?.length > 0 || item.parentId) && (
              <button
                onClick={handleMarkAllCompleted}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  width: '100%', padding: '13px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#9ca3af', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                  animation: 'fadeUp 0.5s 0.22s ease both',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#9ca3af'; }}
              >
                <Check size={14} /> Mark All Completed
              </button>
            )}

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

            {/* Social Links / Recommendations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.5s 0.35s ease both' }}>
              {/* Discord */}
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
                  <ExternalLink size={15} /> Join Community Discord
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
                  <button
                    type="submit" disabled={isSubmittingDiscord}
                    style={{
                      padding: '9px', borderRadius: 8, border: 'none',
                      background: '#5865F2', color: '#fff', cursor: 'pointer',
                      fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: isSubmittingDiscord ? 0.6 : 1,
                    }}
                  >
                    {isSubmittingDiscord ? <Loader2 size={12} className="animate-spin" /> : null}
                    Submit Invite
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowDiscordForm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                    padding: '12px', borderRadius: 12, width: '100%', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(88,101,242,0.2)',
                    color: '#4b5563',
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.75rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(88,101,242,0.4)'; e.currentTarget.style.color = '#5865F2'; e.currentTarget.style.background = 'rgba(88,101,242,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(88,101,242,0.2)'; e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <MessageCircle size={14} /> Recommend Discord
                </button>
              )}

              {/* Reddit */}
              {item.redditLink ? (
                <a
                  href={item.redditLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    padding: '13px', borderRadius: 12,
                    background: 'rgba(255,69,0,0.1)',
                    border: '1px solid rgba(255,69,0,0.25)',
                    color: '#FF4500', textDecoration: 'none',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FF4500'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,69,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,69,0,0.1)'; e.currentTarget.style.color = '#FF4500'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <Zap size={15} /> Visit Subreddit
                </a>
              ) : showSubredditForm ? (
                <form
                  onSubmit={handleSubredditSubmit}
                  style={{
                    padding: '16px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Submit Subreddit</span>
                    <button type="button" onClick={() => setShowSubredditForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="text" placeholder="e.g. evangelion"
                    value={subredditName}
                    onChange={e => setSubredditName(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8, padding: '9px 12px',
                      fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#fff', outline: 'none',
                    }}
                    required
                  />
                  <button
                    type="submit" disabled={isSubmittingSubreddit}
                    style={{
                      padding: '9px', borderRadius: 8, border: 'none',
                      background: '#FF4500', color: '#fff', cursor: 'pointer',
                      fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: isSubmittingSubreddit ? 0.6 : 1,
                    }}
                  >
                    {isSubmittingSubreddit ? <Loader2 size={12} className="animate-spin" /> : null}
                    Submit Reddit
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowSubredditForm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                    padding: '12px', borderRadius: 12, width: '100%', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(255,69,0,0.2)',
                    color: '#4b5563',
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.75rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,69,0,0.4)'; e.currentTarget.style.color = '#FF4500'; e.currentTarget.style.background = 'rgba(255,69,0,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,69,0,0.2)'; e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <Search size={14} /> Recommend Subreddit
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

              <h1 style={{
                fontFamily: 'var(--font-display)', fontWeight: 900,
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                color: '#fff', lineHeight: 1.05,
                letterSpacing: '-0.03em',
                marginBottom: 0,
              }}>
                {item.title}
              </h1>

              {/* Decorative line */}
              <div style={{
                marginTop: 20, height: 3, width: 80, borderRadius: 99,
                background: `linear-gradient(90deg, ${palette.primary}, transparent)`,
                boxShadow: `0 0 16px ${palette.glow}`,
              }} />
            </div>

            {/* Rating display */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
              {item.rating && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 14,
                  padding: '12px 20px', borderRadius: 12,
                  background: 'rgba(251,191,36,0.05)',
                  border: '1px solid rgba(251,191,36,0.15)',
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

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 14,
                padding: '12px 20px', borderRadius: 12,
                background: 'rgba(124,58,237,0.05)',
                border: '1px solid rgba(124,58,237,0.15)',
                animation: 'fadeUp 0.5s 0.22s ease both',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                    Platform Avg
                  </span>
                  <StarRating value={platformStats.average} max={10} />
                </div>
                <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />
                <div>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontWeight: 900,
                    fontSize: '2rem', color: '#7C3AED', lineHeight: 1,
                    filter: 'drop-shadow(0 0 12px rgba(124,58,237,0.4))',
                  }}>
                    {Number(platformStats.average).toFixed(1)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#4b5563', marginLeft: 4 }}>/10</span>
                </div>
              </div>
            </div>

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

            {/* ── EPISODE & PROGRESS TRACKER ── */}
            <EpisodeTracker
              item={item}
              entry={entry}
              palette={palette}
              onUpdateProgress={handleProgressUpdate}
            />

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

            <div className="section-divider" />

            {/* Platform Reviews Section */}
            <div style={{ marginBottom: 80, animation: 'fadeUp 0.5s 0.45s ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MessageCircle size={16} color={palette.primary} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>
                    Platform Reviews ({platformStats.count})
                  </span>
                </div>
              </div>

              {/* Review Form */}
              {user ? (
                <div style={{
                  padding: '24px', borderRadius: 24,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: 40,
                  backdropFilter: 'blur(10px)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {user.avatarUrl ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : null}
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>Share your perspective</span>
                  </div>
                  
                  <form onSubmit={handleReviewSubmit}>
                    <div style={{ marginBottom: 18 }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Rating</span>
                      <StarRating value={newReview.rating} interactive onRate={(r) => setNewReview(prev => ({ ...prev, rating: r }))} />
                    </div>
                    
                    <textarea
                      placeholder="What did you think of this title? (Writing a review is highly encouraged!)"
                      value={newReview.comment}
                      onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                      style={{
                        width: '100%', minHeight: 120, padding: '16px', borderRadius: 14,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#fff', fontFamily: 'inherit', fontSize: '0.92rem', outline: 'none',
                        resize: 'vertical', marginBottom: 18, transition: 'all 0.2s',
                        lineHeight: 1.6,
                      }}
                      onFocus={e => { e.target.style.borderColor = palette.primary; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.03)'; }}
                    />
                    
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      style={{
                        padding: '12px 28px', borderRadius: 12, border: 'none',
                        background: palette.primary, color: '#000', cursor: 'pointer',
                        fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.75rem',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'all 0.3s',
                        opacity: isSubmittingReview ? 0.7 : 1,
                        boxShadow: `0 8px 24px ${palette.glow}`,
                      }}
                      onMouseEnter={e => { if (!isSubmittingReview) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${palette.glow}`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 8px 24px ${palette.glow}`; }}
                    >
                      {isSubmittingReview ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                      Publish Review
                    </button>
                  </form>
                </div>
              ) : (
                <div style={{
                  padding: '40px', borderRadius: 24, textAlign: 'center',
                  background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.08)',
                  marginBottom: 40,
                }}>
                  <p style={{ color: '#4b5563', fontSize: '0.88rem', margin: 0 }}>Sign in to leave a review and contribute to the platform score.</p>
                </div>
              )}

              {/* Reviews List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {platformReviews.length > 0 ? platformReviews.map((rev, idx) => (
                  <div key={rev.id} style={{
                    padding: '28px', borderRadius: 24,
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    animation: `fadeUp 0.6s ${0.5 + idx * 0.05}s ease both`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {rev.user.avatarUrl ? <img src={rev.user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : null}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, color: '#fff', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{rev.user.username}</h4>
                          <span style={{ color: '#4b5563', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', 
                        background: 'rgba(124,58,237,0.08)', borderRadius: 10, 
                        border: '1px solid rgba(124,58,237,0.25)',
                        boxShadow: '0 4px 12px rgba(124,58,237,0.1)',
                      }}>
                        <Star size={13} fill="#7C3AED" color="#7C3AED" />
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: '#a78bfa', fontSize: '1rem' }}>{rev.rating}</span>
                        <span style={{ color: '#4c1d95', fontSize: '0.65rem', fontWeight: 800, marginLeft: -2 }}>/10</span>
                      </div>
                    </div>
                    <p style={{ color: '#d1d5db', lineHeight: 1.8, fontSize: '1rem', margin: 0, fontWeight: 400 }}>
                      {rev.comment}
                    </p>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <MessageCircle size={32} color="#1f1f2e" />
                    <p style={{ color: '#374151', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>No reviews yet. Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}