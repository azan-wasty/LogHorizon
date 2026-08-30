import { useState, useEffect, useRef, useCallback } from 'react';
import { preferences as prefApi, tags as tagsApi, favourites as favouritesApi, library as libraryApi, recommendations as recsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import {
  Swords, Compass, Laugh, Drama, Sparkles, Rocket, Palmtree, Zap, Moon, Droplet,
  Users, Sprout, Skull, Search, Check, ChevronRight, ChevronLeft, Loader2, Hexagon,
  Heart, Star, Film, Database, Bookmark, LogOut
} from 'lucide-react';

const STEPS = ['Genres', 'Moods', 'Themes', 'Titles'];
const TITLES_STEP = STEPS.length - 1; // 3
const TYPE_ORDER = ['Genre', 'Mood', 'Theme'];
const PAGE_SIZE = 12;

const ICONS = {
  Action: Swords, Adventure: Compass, Comedy: Laugh, Drama: Drama, Fantasy: Sparkles, 'Sci-Fi': Rocket,
  Chill: Palmtree, Hype: Zap, Dark: Moon, Emotional: Droplet,
  Friendship: Users, 'Coming of Age': Sprout, Revenge: Skull, Mystery: Search,
};

const CAT_PALETTES = {
  Anime: { primary: '#f472b6', glow: 'rgba(244, 114, 182, 0.35)', border: 'rgba(244, 114, 182, 0.2)' },
  Manga: { primary: '#60a5fa', glow: 'rgba(96, 165, 250, 0.35)', border: 'rgba(96, 165, 250, 0.2)' },
  Movie: { primary: '#fbbf24', glow: 'rgba(251, 191, 36, 0.35)', border: 'rgba(251, 191, 36, 0.2)' },
  TV: { primary: '#34d399', glow: 'rgba(52, 211, 153, 0.35)', border: 'rgba(52, 211, 153, 0.2)' },
};
const fallbackPalette = { primary: '#7C3AED', glow: 'rgba(124, 58, 237, 0.35)', border: 'rgba(124, 58, 237, 0.2)' };

const WATCHED_COLOR = '#34d399';
const FAV_COLOR = '#ef4444';
const WATCHLIST_COLOR = '#60a5fa';
const STAR_COLOR = '#fbbf24';

function ActionPill({ active, color, icon: Icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.72rem',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        transition: 'all 0.2s', whiteSpace: 'nowrap', width: '100%',
        background: active ? `${color}20` : hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        color: active ? color : hovered ? '#fff' : '#e5e7eb',
        border: active ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.08)',
        boxShadow: active ? `0 0 20px ${color}25, inset 0 0 20px ${color}08` : 'none',
        transform: hovered && !active ? 'translateY(-1px)' : 'none',
      }}
    >
      <Icon size={15} fill={active ? color : 'none'} color={active ? color : 'currentColor'} />
      {label}
      {active && (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, animation: 'pulse 2s infinite' }} />
      )}
    </button>
  );
}

function GlowStars({ value, onRate }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered !== null ? hovered : value;
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = display >= n;
        return (
          <button
            key={n}
            onClick={() => onRate(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform 0.15s', transform: filled ? 'scale(1.08)' : 'scale(1)' }}
          >
            <Star
              size={20}
              color={STAR_COLOR}
              fill={filled ? STAR_COLOR : 'transparent'}
              style={{ filter: filled ? `drop-shadow(0 0 6px ${STAR_COLOR}99)` : 'none', transition: 'all 0.15s' }}
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

  // ── Titles feed ──
  const [titleOptions, setTitleOptions] = useState([]);
  const [titleLoading, setTitleLoading] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);
  const [titleActions, setTitleActions] = useState({});
  const [feedExhausted, setFeedExhausted] = useState(false);

  // Pagination bookkeeping
  const forYouOffsetRef = useRef(0);
  const forYouTotalRef = useRef(null);
  const explorePoolRef = useRef([]);
  const exploreIndexRef = useRef(0);
  const fetchingRef = useRef(false);
  const seenIdsRef = useRef(new Set());

  useEffect(() => {
    prefApi.getOptions()
      .then(d => {
        if (Object.keys(d.options || {}).length === 0) {
          return prefApi.seed().then(() => prefApi.getOptions()).then(d2 => setOptions(d2.options || {}));
        }
        setOptions(d.options || {});
      })
      .catch(() => toast('Could not load preferences', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const resetTitleFeed = () => {
    setTitleOptions([]);
    setTitleIndex(0);
    setFeedExhausted(false);
    forYouOffsetRef.current = 0;
    forYouTotalRef.current = null;
    explorePoolRef.current = [];
    exploreIndexRef.current = 0;
    seenIdsRef.current = new Set();
  };

  const appendUnique = (items) => {
    const fresh = items.filter(it => it && !seenIdsRef.current.has(it.id));
    fresh.forEach(it => seenIdsRef.current.add(it.id));
    if (fresh.length) setTitleOptions(prev => [...prev, ...fresh]);
    return fresh.length;
  };

  const fetchMoreTitles = useCallback(async () => {
    if (fetchingRef.current || feedExhausted) return;
    fetchingRef.current = true;
    setTitleLoading(prev => (titleOptions.length === 0 ? true : prev));
    try {
      const total = forYouTotalRef.current;
      const stillHasForYou = total === null || forYouOffsetRef.current < total;

      if (stillHasForYou) {
        const res = await recsApi.get({ limit: PAGE_SIZE, offset: forYouOffsetRef.current });
        const recs = res.recommendations || [];
        forYouOffsetRef.current += recs.length;
        forYouTotalRef.current = res.total ?? 0;
        if (res.explore?.length) explorePoolRef.current = res.explore;
        const added = appendUnique(recs);
        if (added === 0) {
          const remaining = explorePoolRef.current.slice(exploreIndexRef.current);
          exploreIndexRef.current += remaining.length;
          const addedExplore = appendUnique(remaining);
          if (addedExplore === 0) setFeedExhausted(true);
        }
      } else {
        const remaining = explorePoolRef.current.slice(exploreIndexRef.current);
        exploreIndexRef.current += remaining.length;
        const addedExplore = appendUnique(remaining);
        if (addedExplore === 0) setFeedExhausted(true);
      }
    } catch {
      toast('Could not load more titles', 'error');
      setFeedExhausted(true);
    } finally {
      fetchingRef.current = false;
      setTitleLoading(false);
    }
  }, [feedExhausted, titleOptions.length, toast]);

  useEffect(() => {
    if (step !== TITLES_STEP || titleOptions.length > 0 || fetchingRef.current) return;
    (async () => {
      try {
        await prefApi.set(selected);
      } catch { /* non-fatal */ }
      fetchMoreTitles();
    })();
  }, [step]);

  useEffect(() => {
    if (step !== TITLES_STEP || feedExhausted) return;
    if (titleIndex >= titleOptions.length - 3) fetchMoreTitles();
  }, [step, titleIndex, titleOptions.length, feedExhausted, fetchMoreTitles]);

  const currentType = TYPE_ORDER[step];
  const currentOptions = options[currentType] || [];
  const isTitlesStep = step === TITLES_STEP;

  const loggedTitleCount = Object.values(titleActions).filter(a => a.watched || a.favourite || a.watchlist).length;
  const currentTitle = titleOptions[titleIndex];
  const currentAction = (currentTitle && titleActions[currentTitle.id]) || {};
  const palette = (currentTitle && CAT_PALETTES[currentTitle.category]) || fallbackPalette;
  const atEnd = titleIndex >= titleOptions.length - 1;

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
    if (step === TITLES_STEP) resetTitleFeed();
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
      <div className="min-h-screen w-full bg-dark flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="w-8 h-8 text-electric-purple animate-spin" />
        <p className="font-mono text-xs uppercase tracking-widest text-gray-500">Initializing Codex...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-dark text-white relative overflow-x-hidden flex flex-col items-center justify-start">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-[-15%]"
          style={{
            background: isTitlesStep
              ? `radial-gradient(ellipse at 50% 0%, ${palette.glow} 0%, transparent 58%)`
              : 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.28) 0%, transparent 58%)',
            filter: 'blur(18px)',
            opacity: 0.7,
            transition: 'background 0.45s ease',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,9,11,0.55)_0%,#09090b_42%,#09090b_100%)]" />
      </div>

      {/* Main Container - Centered Flex Column */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 flex flex-col items-center">

        {/* Top Header Bar */}
        <header className="w-full flex items-center justify-between gap-4 mb-10 sm:mb-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-purple to-accent-violet flex items-center justify-center shadow-[0_0_24px_rgba(124,58,237,0.25)]">
              <Hexagon className="w-4.5 h-4.5 text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-base sm:text-lg tracking-tight">
              Log<span className="text-electric-purple">Horizon</span>
            </span>
          </div>

          <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-gray-600">
            Taste profile
          </div>
        </header>

        {/* Title / Intro Header */}
        <div className="w-full text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.025] mb-5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-electric-purple"
              style={{ boxShadow: '0 0 9px rgba(124,58,237,0.8)' }}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-[-0.035em] leading-[1.05]">
            {isTitlesStep ? 'Build your watch history.' : 'Refine your signature.'}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-500 font-body max-w-xl mx-auto leading-relaxed">
            {isTitlesStep
              ? 'Tell us what you have already seen. A few signals are enough to sharpen your recommendations.'
              : 'Pick the genres, moods, and themes that feel like you.'}
          </p>
        </div>

        {/* Progress Step Rail */}
        <div className="w-full mb-9 sm:mb-12">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {STEPS.map((label, i) => (
              <div key={label} className="w-full min-w-0">
                <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.07] w-full">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: i <= step ? '100%' : '0%',
                      background: i <= step
                        ? 'linear-gradient(90deg,#7C3AED,#22d3ee)'
                        : 'transparent',
                      boxShadow: i <= step ? '0 0 10px rgba(124,58,237,0.45)' : 'none',
                    }}
                  />
                </div>
                <div className={`mt-2.5 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-center truncate ${i === step ? 'text-gray-200 font-bold' : i < step ? 'text-gray-500' : 'text-gray-700'
                  }`}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Content Surface */}
        <main
          className="relative w-full rounded-2xl sm:rounded-[24px] border border-white/[0.07] bg-white/[0.018] overflow-hidden"
          style={{
            boxShadow: isTitlesStep
              ? `0 24px 80px rgba(0,0,0,0.38), 0 0 70px ${palette.glow}12`
              : '0 24px 80px rgba(0,0,0,0.35)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {!isTitlesStep && (
            <section className="p-6 sm:p-8 lg:p-10 w-full">
              <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-electric-purple mb-2">
                    {currentType}
                  </p>
                  <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                    What fits your taste?
                  </h2>
                </div>
                <span className="hidden sm:block font-mono text-[9px] uppercase tracking-[0.12em] text-gray-600">
                  {selected.filter(id => currentOptions.some(opt => opt.id === id)).length} selected
                </span>
              </div>

              {currentOptions.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-black/10 w-full">
                  <Search className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-600 font-mono text-xs uppercase tracking-widest">No options yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  {currentOptions.map(opt => {
                    const Icon = ICONS[opt.value] || Hexagon;
                    const isSelected = selected.includes(opt.id);

                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggle(opt.id)}
                        className={`group relative w-full min-h-[90px] p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 ${isSelected
                          ? 'bg-electric-purple/[0.10] border-electric-purple/40'
                          : 'bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.045] hover:border-white/[0.14] hover:-translate-y-0.5'
                          }`}
                        style={{
                          boxShadow: isSelected
                            ? '0 10px 30px rgba(124,58,237,0.16), inset 0 0 25px rgba(124,58,237,0.045)'
                            : 'none',
                        }}
                      >
                        <div className="flex items-center gap-4 h-full w-full">
                          <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all ${isSelected
                            ? 'bg-electric-purple text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                            : 'bg-white/[0.05] text-gray-500 group-hover:text-gray-300'
                            }`}>
                            <Icon size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className={`block font-display text-sm sm:text-base font-bold truncate ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                              }`}>
                              {opt.value}
                            </span>
                            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-gray-700">
                              {currentType}
                            </span>
                          </div>

                          <div className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center transition-all ${isSelected
                            ? 'border-electric-purple bg-electric-purple text-white'
                            : 'border-white/10 text-transparent group-hover:border-white/20'
                            }`}>
                            <Check size={11} strokeWidth={3} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {isTitlesStep && (
            <section className="p-6 sm:p-8 lg:p-10 w-full">
              {titleLoading && titleOptions.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4 w-full">
                  <div className="relative">
                    <Loader2 className="w-8 h-8 text-electric-purple animate-spin" />
                    <div className="absolute inset-[-8px] rounded-full border border-electric-purple/10 animate-ping" />
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500">
                    Scoring titles for you...
                  </p>
                </div>
              ) : !currentTitle ? (
                <div className="py-20 text-center rounded-2xl border border-dashed border-white/10 bg-black/10 w-full">
                  <Film className="w-7 h-7 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-600 font-mono text-xs uppercase tracking-widest">No titles available.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-12 items-center w-full">
                  {/* Poster Column */}
                  <div className="flex justify-center w-full">
                    <div
                      className="relative w-[220px] sm:w-[260px] lg:w-[280px] aspect-[2/3] rounded-2xl overflow-hidden shrink-0"
                      style={{
                        boxShadow: `0 28px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.08), 0 0 55px ${palette.glow}`,
                      }}
                    >
                      {currentTitle.coverImage ? (
                        <img
                          src={currentTitle.coverImage}
                          alt={currentTitle.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white/[0.03]">
                          <Database size={36} color="#2d2d3d" />
                        </div>
                      )}

                      <div
                        className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-full"
                        style={{
                          background: 'rgba(0,0,0,0.72)',
                          backdropFilter: 'blur(12px)',
                          border: `1px solid ${palette.border}`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: palette.primary, boxShadow: `0 0 7px ${palette.primary}` }}
                        />
                        <span
                          className="font-mono text-[8px] font-bold uppercase tracking-[0.14em]"
                          style={{ color: palette.primary }}
                        >
                          {currentTitle.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Title Details Column */}
                  <div className="w-full flex flex-col justify-center">
                    <p
                      className="font-mono text-[9px] uppercase tracking-[0.16em] mb-2"
                      style={{ color: palette.primary }}
                    >
                      Recommended for you
                    </p>

                    <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                      {currentTitle.title}
                    </h2>

                    <div className="h-px bg-white/[0.06] my-6 w-full" />

                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600 mb-3">
                      Add to your profile
                    </p>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
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
                        icon={Bookmark}
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

                    <div className="mt-7 p-4 rounded-2xl bg-white/[0.025] border border-white/[0.06] w-full">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-500">
                          Your rating
                        </p>
                        {currentAction.rating && (
                          <span className="font-display font-black text-sm text-yellow-400">
                            {currentAction.rating}/5
                          </span>
                        )}
                      </div>
                      <GlowStars
                        value={currentAction.rating || 0}
                        onRate={(n) => rateTitle(currentTitle.id, n)}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-5 text-[9px] font-mono uppercase tracking-[0.12em] w-full">
                      <span className="text-gray-600">
                        {titleIndex + 1} of {titleOptions.length}+
                      </span>
                      <span className="text-gray-500">
                        {loggedTitleCount} logged
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {currentTitle && (
                <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/[0.06] w-full">
                  <button
                    onClick={goPrevTitle}
                    disabled={titleIndex === 0}
                    className="w-11 h-11 rounded-full border border-white/[0.08] bg-white/[0.025] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-20 disabled:pointer-events-none"
                    aria-label="Previous title"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-gray-700">
                    Browse recommendations
                  </span>

                  <button
                    onClick={goNextTitle}
                    disabled={atEnd && !titleLoading}
                    className="w-11 h-11 rounded-full border border-white/[0.08] bg-white/[0.025] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-20 disabled:pointer-events-none"
                    aria-label="Next title"
                  >
                    {titleLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={18} />}
                  </button>
                </div>
              )}
            </section>
          )}
        </main>

        {/* Footer Navigation Bar */}
        <footer className="w-full mt-5 sm:mt-6">
          {isTitlesStep ? (
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 p-4 sm:px-5 rounded-2xl border border-white/[0.06] bg-white/[0.018] w-full">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 py-2 px-2 text-sm font-display font-semibold text-gray-500 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} />
                Back to themes
              </button>

              <div className="flex items-center gap-3">
                <span className="hidden sm:block font-mono text-[8px] uppercase tracking-[0.12em] text-gray-700">
                  You can finish anytime
                </span>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-xl bg-electric-purple hover:bg-accent-violet text-white font-display text-sm font-bold uppercase tracking-[0.04em] transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ boxShadow: '0 10px 30px rgba(124,58,237,0.3)' }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} />}
                  Finish profile
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 p-3 sm:p-4 rounded-2xl border border-white/[0.06] bg-white/[0.018] w-full">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className={`inline-flex items-center gap-1.5 px-2 py-2 text-sm font-display font-semibold transition-colors ${step === 0
                  ? 'opacity-0 pointer-events-none'
                  : 'text-gray-500 hover:text-white'
                  }`}
              >
                <ChevronLeft size={16} />
                Back
              </button>

              <div className="flex items-center gap-3 sm:gap-5">
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="px-2 py-2 text-sm font-display font-semibold text-gray-600 hover:text-gray-300 transition-colors"
                >
                  Skip
                </button>

                <button
                  onClick={handleNext}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-xl bg-electric-purple hover:bg-accent-violet text-white font-display text-sm font-bold uppercase tracking-[0.04em] transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ boxShadow: '0 10px 30px rgba(124,58,237,0.3)' }}
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}
        </footer>

      </div>
    </div>
  );
}