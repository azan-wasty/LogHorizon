import { useState, useEffect, useRef, useCallback } from 'react';
import { preferences as prefApi, favourites as favouritesApi, library as libraryApi, recommendations as recsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import {
  Sword, Compass, Smiley, MaskHappy, Sparkle, RocketLaunch, TreePalm, Lightning, Moon, Drop,
  UsersThree, Plant, Skull, MagnifyingGlass, Check, CaretRight, CaretLeft, CircleNotch, Stack, Tag,
  Heart, Star, FilmStrip, BookmarkSimple, ArrowsClockwise, IconContext
} from '@phosphor-icons/react';

const STEPS = ['Genres', 'Moods', 'Themes', 'Titles'];
const TITLES_STEP = STEPS.length - 1;
const TYPE_ORDER = ['Genre', 'Mood', 'Theme'];
const PAGE_SIZE = 12;

const ICONS = {
  Action: Sword, Adventure: Compass, Comedy: Smiley, Drama: MaskHappy, Fantasy: Sparkle, 'Sci-Fi': RocketLaunch,
  Chill: TreePalm, Hype: Lightning, Dark: Moon, Emotional: Drop,
  Friendship: UsersThree, 'Coming of Age': Plant, Revenge: Skull, Mystery: MagnifyingGlass,
};

const CAT_PALETTES = {
  Anime: { primary: '#f472b6', glow: 'rgba(244, 114, 182, 0.35)' },
  Manga: { primary: '#60a5fa', glow: 'rgba(96, 165, 250, 0.35)' },
  Movie: { primary: '#fbbf24', glow: 'rgba(251, 191, 36, 0.35)' },
  TV: { primary: '#34d399', glow: 'rgba(52, 211, 153, 0.35)' },
};
const fallbackPalette = { primary: '#9333EA', glow: 'rgba(147, 51, 234, 0.35)' };

const WATCHED_COLOR = '#34d399';
const FAV_COLOR = '#ef4444';
const WATCHLIST_COLOR = '#60a5fa';
const STAR_COLOR = '#fbbf24';

function ActionPill({ active, color, icon: Icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 700, fontSize: '0.7rem',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        transition: 'all 0.2s ease', whiteSpace: 'nowrap', width: '100%',
        background: active ? `${color}20` : hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        color: active ? color : hovered ? '#fff' : '#d1d5db',
        border: active ? `1px solid ${color}60` : '1px solid rgba(255,255,255,0.08)',
        boxShadow: active ? `0 0 14px ${color}30` : 'none',
      }}
    >
      <Icon size={13} weight={active ? 'fill' : 'regular'} color={active ? color : 'currentColor'} />
      <span>{label}</span>
    </button>
  );
}

function GlowStars({ value, onRate }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered !== null ? hovered : value;
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = display >= n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onRate(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              transition: 'transform 0.15s ease', transform: filled ? 'scale(1.15)' : 'scale(1)'
            }}
          >
            <Star
              size={20}
              color={STAR_COLOR}
              weight={filled ? 'fill' : 'regular'}
              style={{ filter: filled ? `drop-shadow(0 0 6px ${STAR_COLOR}99)` : 'none' }}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function PreferenceWizard({ onComplete }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState({});
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [titleOptions, setTitleOptions] = useState([]);
  const [titleLoading, setTitleLoading] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);
  const [titleActions, setTitleActions] = useState({});
  const [feedExhausted, setFeedExhausted] = useState(false);

  const forYouOffsetRef = useRef(0);
  const fetchingRef = useRef(false);
  const seenIdsRef = useRef(new Set());

  useEffect(() => {
    prefApi.getOptions()
      .then(d => {
        if (Object.keys(d?.options || {}).length === 0) {
          return prefApi.seed().then(() => prefApi.getOptions()).then(d2 => setOptions(d2?.options || {}));
        }
        setOptions(d?.options || {});
      })
      .catch(() => toast('Could not load preferences', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const appendUnique = (items) => {
    const fresh = items.filter(it => it && it.id != null && !seenIdsRef.current.has(it.id));
    fresh.forEach(it => seenIdsRef.current.add(it.id));
    if (fresh.length) setTitleOptions(prev => [...prev, ...fresh]);
    return fresh.length;
  };

  const fetchMoreTitles = useCallback(async () => {
    if (fetchingRef.current || feedExhausted) return;
    fetchingRef.current = true;
    setTitleLoading(true);

    try {
      const res = await recsApi.get({ limit: PAGE_SIZE, offset: forYouOffsetRef.current });
      const rawItems = Array.isArray(res) ? res : (res?.recommendations || res?.data || res?.items || []);

      const recs = rawItems.map((item, idx) => ({
        id: item.id ?? item.contentId ?? item._id ?? `title-${forYouOffsetRef.current + idx}`,
        title: item.title || item.name || 'Untitled',
        category: item.category || item.type || item.mediaType || 'Manga',
        coverImage: item.coverImage || item.poster || item.posterUrl || item.image || '',
        ...item
      }));

      forYouOffsetRef.current += recs.length;
      const added = appendUnique(recs);

      if (added === 0) setFeedExhausted(true);
    } catch (err) {
      toast('Failed to load titles', 'error');
      setFeedExhausted(true);
    } finally {
      fetchingRef.current = false;
      setTitleLoading(false);
    }
  }, [feedExhausted, toast]);

  useEffect(() => {
    if (step !== TITLES_STEP) return;
    prefApi.set(selected).catch(() => { });
    if (titleOptions.length === 0 && !fetchingRef.current) {
      fetchMoreTitles();
    }
  }, [step]);

  useEffect(() => {
    if (step !== TITLES_STEP || feedExhausted) return;
    if (titleIndex >= titleOptions.length - 2) fetchMoreTitles();
  }, [step, titleIndex, titleOptions.length, feedExhausted, fetchMoreTitles]);

  const currentType = TYPE_ORDER[step];
  const currentOptions = options[currentType] || [];
  const isTitlesStep = step === TITLES_STEP;

  const currentTitle = titleOptions[titleIndex];
  const currentAction = (currentTitle && titleActions[currentTitle.id]) || {};
  const palette = (currentTitle && CAT_PALETTES[currentTitle.category]) || fallbackPalette;

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const goPrevTitle = () => setTitleIndex(i => Math.max(0, i - 1));
  const goNextTitle = () => setTitleIndex(i => Math.min(titleOptions.length - 1, i + 1));

  const toggleWatched = (contentId) => {
    setTitleActions(prev => {
      const current = prev[contentId] || {};
      const nextWatched = !current.watched;
      return {
        ...prev,
        [contentId]: {
          ...current,
          watched: nextWatched,
          rating: nextWatched ? current.rating : undefined,
          watchlist: nextWatched ? false : current.watchlist,
        },
      };
    });
  };

  const toggleFavourite = (contentId) => {
    setTitleActions(prev => {
      const current = prev[contentId] || {};
      return { ...prev, [contentId]: { ...current, favourite: !current.favourite } };
    });
  };

  const toggleWatchlist = (contentId) => {
    setTitleActions(prev => {
      const current = prev[contentId] || {};
      const nextWatchlist = !current.watchlist;
      return {
        ...prev,
        [contentId]: {
          ...current,
          watchlist: nextWatchlist,
          watched: nextWatchlist ? false : current.watched,
        },
      };
    });
  };

  const rateTitle = (contentId, value) => {
    setTitleActions(prev => {
      const current = prev[contentId] || {};
      const nextRating = current.rating === value ? undefined : value;
      return { ...prev, [contentId]: { ...current, rating: nextRating, watched: nextRating ? true : current.watched } };
    });
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleFinish();
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep(s => s - 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await prefApi.set(selected);
      const entries = Object.entries(titleActions).filter(([, a]) => a.watched || a.favourite || a.watchlist);
      if (entries.length > 0) {
        await Promise.allSettled(entries.map(([contentId, a]) => {
          const tasks = [];
          if (a.watched) tasks.push(libraryApi.update({ contentId: Number(contentId), status: 'COMPLETED', rating: a.rating || null }));
          else if (a.watchlist) tasks.push(libraryApi.update({ contentId: Number(contentId), status: 'PLANNING' }));
          if (a.favourite) tasks.push(favouritesApi.add(Number(contentId)));
          return Promise.all(tasks);
        }));
      }
      toast('Your taste profile is set!', 'success');
      onComplete();
    } catch {
      toast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <IconContext.Provider value={{ weight: 'duotone' }}>
        <div style={{ minHeight: '100vh', width: '100%', background: '#09090b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '16px' }}>
          <CircleNotch style={{ width: 32, height: 32, color: '#a855f7' }} weight="bold" className="animate-spin" />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#666' }}>Initializing Codex...</p>
        </div>
      </IconContext.Provider>
    );
  }

  return (
    <IconContext.Provider value={{ weight: 'duotone' }}>
      <div style={{ minHeight: '100vh', width: '100%', background: '#09090b', color: '#fff', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowX: 'hidden' }}>
        {/* Background Glow */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div
            style={{
              position: 'absolute', inset: '-15%',
              background: isTitlesStep
                ? `radial-gradient(ellipse at 50% 0%, ${palette.glow} 0%, transparent 60%)`
                : 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.2) 0%, transparent 60%)',
              filter: 'blur(20px)',
              opacity: 0.75,
              transition: 'background 0.4s ease',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(9,9,11,0.7), #09090b)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '800px', margin: '0 auto', padding: '24px', boxSizing: 'border-box' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #9333EA, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(147,51,234,0.4)' }}>
                <Stack size={16} color="#fff" weight="duotone" />
              </div>
              <span style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.5px' }}>
                Log<span style={{ color: '#a855f7' }}>Horizon</span>
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#666' }}>Taste Profile</span>
          </div>

          {/* Step Info */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', marginBottom: '8px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888' }}>
                Step {step + 1} of {STEPS.length}
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px', margin: '4px 0' }}>
              {isTitlesStep ? 'Build your watch history.' : 'Refine your signature.'}
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#888', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              {isTitlesStep
                ? 'Tell us what you have already seen to sharpen your recommendations.'
                : 'Pick the genres, moods, and themes that match your taste.'}
            </p>
          </div>

          {/* Progress Rail */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
            {STEPS.map((label, i) => (
              <div key={label} style={{ width: '100%' }}>
                <div style={{ height: 4, borderRadius: '999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '999px',
                      transition: 'all 0.3s ease',
                      width: i <= step ? '100%' : '0%',
                      background: i <= step ? 'linear-gradient(90deg, #9333EA, #f59e0b)' : 'transparent',
                    }}
                  />
                </div>
                <div style={{
                  marginTop: '4px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  fontWeight: i === step ? 'bold' : 'normal',
                  color: i === step ? '#fff' : '#555',
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Main Card Surface */}
          <div style={{
            width: '100%',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '520px',
          }}>
            {/* STEPS 1-3 */}
            {!isTitlesStep && (
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#a855f7', margin: '0 0 2px 0' }}>{currentType}</p>
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>What fits your taste?</h2>
                  </div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#666' }}>
                    {selected.filter(id => currentOptions.some(opt => opt.id === id)).length} selected
                  </span>
                </div>

                {currentOptions.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    <MagnifyingGlass size={20} color="#555" weight="duotone" style={{ marginBottom: '8px' }} />
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', margin: 0 }}>No options available</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {currentOptions.map(opt => {
                      const Icon = ICONS[opt.value] || Tag;
                      const isSelected = selected.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggle(opt.id)}
                          style={{
                            padding: '12px',
                            borderRadius: '12px',
                            border: isSelected ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            background: isSelected ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                            color: isSelected ? '#fff' : '#888',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            minWidth: 0,
                            boxShadow: isSelected ? '0 0 15px rgba(147,51,234,0.18)' : 'none',
                          }}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            background: isSelected ? '#9333EA' : 'rgba(255,255,255,0.05)',
                            color: isSelected ? '#fff' : '#888'
                          }}>
                            <Icon size={16} weight="duotone" />
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{opt.value}</span>
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%', border: isSelected ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.15)',
                            background: isSelected ? '#a855f7' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {isSelected && <Check size={10} weight="bold" color="#fff" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4 */}
            {isTitlesStep && (
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {titleLoading && titleOptions.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <CircleNotch size={28} color="#a855f7" weight="bold" className="animate-spin" />
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', margin: 0 }}>Fetching titles...</p>
                  </div>
                ) : !currentTitle ? (
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <FilmStrip size={28} color="#555" weight="duotone" />
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', margin: 0 }}>No titles found</p>
                    <button
                      type="button"
                      onClick={fetchMoreTitles}
                      style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer' }}
                    >
                      <ArrowsClockwise size={13} weight="bold" /> Retry
                    </button>
                  </div>
                ) : (
                  <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Poster Carousel Row */}
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <button
                        type="button"
                        onClick={goPrevTitle}
                        disabled={titleIndex === 0}
                        style={{
                          width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.04)', color: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: titleIndex === 0 ? 'default' : 'pointer', transition: 'all 0.2s ease', flexShrink: 0,
                          opacity: titleIndex === 0 ? 0.3 : 1,
                        }}
                      >
                        <CaretLeft size={18} weight="bold" />
                      </button>

                      <div
                        style={{
                          position: 'relative', height: '280px', aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
                          boxShadow: `0 12px 30px rgba(0,0,0,0.8), 0 0 25px ${palette.glow}`,
                        }}
                      >
                        {currentTitle.coverImage ? (
                          <img src={currentTitle.coverImage} alt={currentTitle.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#555', gap: '6px' }}>
                            <FilmStrip size={28} weight="duotone" />
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '8px', textTransform: 'uppercase' }}>No Poster</span>
                          </div>
                        )}

                        <div style={{ position: 'absolute', top: '8px', left: '8px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: palette.primary }} />
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: palette.primary }}>
                            {currentTitle.category}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={goNextTitle}
                        disabled={titleIndex >= titleOptions.length - 1 && titleLoading}
                        style={{
                          width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.04)', color: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: (titleIndex >= titleOptions.length - 1 && titleLoading) ? 'default' : 'pointer', transition: 'all 0.2s ease', flexShrink: 0,
                          opacity: (titleIndex >= titleOptions.length - 1 && titleLoading) ? 0.3 : 1,
                        }}
                      >
                        {titleLoading ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <CaretRight size={18} weight="bold" />}
                      </button>
                    </div>

                    {/* Title Name */}
                    <h2 style={{ fontSize: '18px', fontWeight: 900, textAlign: 'center', color: '#fff', margin: '0 0 16px 0', padding: '0 8px' }}>
                      {currentTitle.title}
                    </h2>

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '100%', marginBottom: '12px' }}>
                      <ActionPill
                        active={!!currentAction.watched}
                        color={WATCHED_COLOR}
                        icon={Check}
                        label="Watched"
                        onClick={() => toggleWatched(currentTitle.id)}
                      />
                      <ActionPill
                        active={!!currentAction.watchlist}
                        color={WATCHLIST_COLOR}
                        icon={BookmarkSimple}
                        label="Later"
                        onClick={() => toggleWatchlist(currentTitle.id)}
                      />
                      <ActionPill
                        active={!!currentAction.favourite}
                        color={FAV_COLOR}
                        icon={Heart}
                        label="Favourite"
                        onClick={() => toggleFavourite(currentTitle.id)}
                      />
                    </div>

                    {/* Rating */}
                    <div style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#666' }}>
                        Rating {currentAction.rating ? `(${currentAction.rating}/5)` : ''}
                      </span>
                      <GlowStars
                        value={currentAction.rating || 0}
                        onRate={(n) => rateTitle(currentTitle.id, n)}
                      />
                    </div>

                    {/* Counter */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', padding: '0 4px', fontFamily: 'var(--font-body)', fontSize: '9px', textTransform: 'uppercase', color: '#555' }}>
                      <span>{titleIndex + 1} of {titleOptions.length}</span>
                      <span>{Object.values(titleActions).filter(a => a.watched || a.favourite || a.watchlist).length} logged</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Navigation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.01)',
            }}>
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0 || saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none',
                  color: step === 0 ? '#444' : '#888', cursor: step === 0 ? 'default' : 'pointer',
                  fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                  transition: 'color 0.2s ease',
                }}
              >
                <CaretLeft size={15} weight="bold" /> Back
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {!isTitlesStep && (
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={saving}
                    style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none', background: 'none', color: '#666', cursor: 'pointer', transition: 'color 0.2s ease' }}
                  >
                    Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={isTitlesStep ? handleFinish : handleNext}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
                    background: '#9333EA', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 'bold',
                    textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.2s ease',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? <CircleNotch size={13} weight="bold" className="animate-spin" /> : isTitlesStep ? <Check size={13} weight="bold" /> : null}
                  {isTitlesStep ? 'Finish' : 'Next'}
                  {!isTitlesStep && <CaretRight size={13} weight="bold" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </IconContext.Provider>
  );
}