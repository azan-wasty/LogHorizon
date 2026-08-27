import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Hyperspeed from '../components/Hyperspeed';
import { recommendations as recsApi, preferences as prefApi, content as contentApi, activity as activityApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import {
    Sparkles, Star, ExternalLink, Zap, Compass,
    ChevronRight, Loader2, TrendingUp, Database,
    Hash, Settings2, BarChart3, Award, Activity,
    Play, Bookmark, Check, ArrowUpRight, Heart,
    MessageSquare, Users, ChevronDown,
} from 'lucide-react';

// ── Category styles ────────────────────────────────
const CAT = {
    Anime: { color: '#f472b6', dim: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)', label: 'Anime' },
    Manga: { color: '#60a5fa', dim: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', label: 'Manga' },
    Movie: { color: '#fbbf24', dim: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', label: 'Movie' },
    TV: { color: '#34d399', dim: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', label: 'TV' },
};
const fallbackCat = { color: '#7C3AED', dim: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', label: '—' };

// ── Activity feed ───────────────────────────────────
const ACTIVITY_CFG = {
    WATCHING: { verb: 'started watching', icon: Play, color: '#22d3ee' },
    COMPLETED: { verb: 'completed', icon: Check, color: '#34d399' },
    PLANNING: { verb: 'added to their watchlist', icon: Bookmark, color: '#f472b6' },
    FAVOURITED: { verb: 'favourited', icon: Heart, color: '#ef4444' },
    RATED: { verb: 'rated', icon: Star, color: '#fbbf24' },
    REVIEWED: { verb: 'reviewed', icon: MessageSquare, color: '#7C3AED' },
    DROPPED: { verb: 'dropped', icon: ChevronRight, color: '#6b7280' },
};

function timeAgo(dateStr) {
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

function ActivityRow({ item, onNavigate, i }) {
    const cfg = ACTIVITY_CFG[item.type] || { verb: item.type?.toLowerCase(), icon: Activity, color: '#7C3AED' };
    const Icon = cfg.icon;
    return (
        <div
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                animation: `fadeUp 0.35s ${i * 40}ms ease both`,
            }}
        >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {item.user?.avatarUrl
                    ? <img src={item.user.avatarUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.7rem', color: '#9ca3af' }}>{item.user?.username?.[0]?.toUpperCase() || '?'}</span>}
            </div>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={12} color={cfg.color} />
            </div>
            <p style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>@{item.user?.username}</span>{' '}
                <span style={{ color: '#6b7280' }}>{cfg.verb}</span>{' '}
                {item.content ? (
                    <span
                        onClick={() => onNavigate(`content/${item.content.id}`)}
                        style={{ color: cfg.color, cursor: 'pointer', fontWeight: 600 }}
                    >
                        {item.content.title}
                    </span>
                ) : null}
                {item.type === 'RATED' && item.rating ? <span style={{ color: '#fbbf24' }}> · {item.rating}/10</span> : null}
            </p>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#4b5563', flexShrink: 0 }}>{timeAgo(item.createdAt)}</span>
        </div>
    );
}

function ActivityFeedSection({ onNavigate }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const PAGE_SIZE = 10;

    const load = async (offset = 0) => {
        try {
            const res = await activityApi.feed({ limit: PAGE_SIZE, offset });
            if (res.ok) {
                setActivities(prev => offset === 0 ? res.activities : [...prev, ...res.activities]);
                setHasMore(res.hasMore);
            }
        } catch (err) {
            // Feed is a nice-to-have on the dashboard — fail quietly.
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => { load(0); }, []);

    const handleLoadMore = () => {
        setLoadingMore(true);
        load(activities.length);
    };

    return (
        <section style={{ animation: 'fadeUp 0.4s 0.05s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ padding: '6px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                        <Activity size={15} color="#7C3AED" />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.02em' }}>
                        Activity Feed
                    </h2>
                </div>
                <button
                    onClick={() => onNavigate('community')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#7C3AED',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}
                >
                    <Users size={13} /> Find friends
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                    <Loader2 size={22} color="#7C3AED" className="animate-spin" />
                </div>
            ) : activities.length === 0 ? (
                <div style={{
                    padding: '32px 24px', textAlign: 'center',
                    background: 'rgba(124,58,237,0.03)', border: '1px dashed rgba(124,58,237,0.15)', borderRadius: 16,
                }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Nothing here yet — watch something or add friends to see activity
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activities.map((item, i) => <ActivityRow key={item.id} item={item} onNavigate={onNavigate} i={i} />)}
                </div>
            )}

            {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7C3AED',
                            background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)',
                            borderRadius: 20, padding: '9px 20px', cursor: loadingMore ? 'default' : 'pointer',
                            opacity: loadingMore ? 0.6 : 1,
                        }}
                    >
                        {loadingMore ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
                        Load more
                    </button>
                </div>
            )}
        </section>
    );
}

// Score badge
function scoreBadge(score) {
    if (score >= 9) return { bg: '#7C3AED', color: '#fff', shadow: '0 0 12px rgba(124,58,237,0.5)' };
    if (score >= 6) return { bg: 'rgba(124,58,237,0.2)', color: '#a78bfa', shadow: 'none' };
    return { bg: 'rgba(255,255,255,0.08)', color: '#6b7280', shadow: 'none' };
}

// ── Animated counter ───────────────────────────────
function AnimNum({ target, decimals = 0 }) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (!target) return;
        let frame;
        const start = performance.now();
        const dur = 900;
        const tick = (now) => {
            const t = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            setVal(parseFloat((ease * target).toFixed(decimals)));
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target]);
    return <>{val}</>;
}

// ── Recommendation card ────────────────────────────
function RecCard({ item, index, onNavigate }) {
    const [hovered, setHovered] = useState(false);
    const cat = CAT[item.category] || fallbackCat;
    const sb = item._score > 0 ? scoreBadge(item._score) : null;

    return (
        <div
            onClick={() => onNavigate(`content/${item.id}`)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderRadius: 16,
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                border: hovered ? `1px solid ${cat.color}30` : '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.3s',
                transform: hovered ? 'translateY(-5px)' : 'none',
                boxShadow: hovered ? `0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px ${cat.color}20` : 'none',
                animation: `fadeUp 0.4s ${index * 35}ms ease both`,
            }}
        >
            {/* Cover */}
            <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden' }}>
                {item.isSuggested && (
                    <div style={{
                        position: 'absolute', top: 8, left: 8, zIndex: 20,
                        padding: '3px 8px', borderRadius: 6,
                        background: '#f59e0b', color: '#000',
                        fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        display: 'flex', alignItems: 'center', gap: 4,
                        animation: 'pulse 2s infinite',
                    }}>
                        <Star size={8} fill="currentColor" /> Suggested
                    </div>
                )}

                {item.coverImage ? (
                    <img
                        src={item.coverImage}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            transition: 'transform 0.6s',
                            transform: hovered ? 'scale(1.08)' : 'scale(1)',
                        }}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Database size={36} color="#374151" />
                    </div>
                )}

                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,14,22,0.9) 0%, transparent 50%)' }} />

                {/* Category badge */}
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <span style={{
                        padding: '2px 8px', borderRadius: 5,
                        background: cat.dim, border: `1px solid ${cat.border}`,
                        fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700,
                        color: cat.color, textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>
                        {item.category}
                    </span>
                </div>

                {/* Rating */}
                {item.rating && (
                    <div style={{
                        position: 'absolute', bottom: 8, left: 8,
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 20,
                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <Star size={9} color="#fbbf24" fill="#fbbf24" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, color: '#fbbf24' }}>
                            {item.rating.toFixed(1)}
                        </span>
                    </div>
                )}

                {/* Match score */}
                {sb && (
                    <div style={{
                        position: 'absolute', bottom: 8, right: 8,
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '3px 8px', borderRadius: 20,
                        background: sb.bg, color: sb.color, boxShadow: sb.shadow,
                        fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700,
                    }}>
                        <Zap size={9} fill="currentColor" />
                        {item._score.toFixed(3)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3 style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem',
                    color: hovered ? cat.color : '#fff',
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', minHeight: 36, lineHeight: 1.35,
                    transition: 'color 0.2s',
                }}>
                    {item.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            {item._matchedTags?.[0]?.name || item.tags?.[0]?.name || 'Untagged'}
                        </span>
                    </div>
                    {item.discordLink && (
                        <a
                            href={item.discordLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#5865F2', fontSize: '0.58rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em' }}
                        >
                            <ExternalLink size={9} /> Portal
                        </a>
                    )}
                </div>

                {/* Matched tags */}
                {item._matchedTags?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {item._matchedTags.slice(0, 3).map(t => (
                            <span key={t.id} style={{
                                padding: '2px 7px', borderRadius: 20,
                                background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                                fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#a78bfa',
                                textTransform: 'uppercase', letterSpacing: '0.07em',
                            }}>
                                {t.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Explore card ───────────────────────────────────
function ExploreCard({ item, index, onNavigate }) {
    const [hovered, setHovered] = useState(false);
    const cat = CAT[item.category] || fallbackCat;

    return (
        <div
            onClick={() => onNavigate(`content/${item.id}`)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', gap: 14, padding: 14,
                borderRadius: 14,
                background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                border: hovered ? `1px solid ${cat.color}20` : '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer', transition: 'all 0.2s',
                transform: hovered ? 'translateY(-2px)' : 'none',
                animation: `fadeUp 0.4s ${index * 50}ms ease both`,
            }}
        >
            <div style={{ width: 50, height: 70, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative', background: 'rgba(255,255,255,0.05)' }}>
                {item.isSuggested && (
                    <div style={{ position: 'absolute', top: 0, right: 0, padding: 3, background: '#f59e0b', borderRadius: '0 0 0 5px', zIndex: 10 }}>
                        <Star size={7} color="#000" fill="#000" />
                    </div>
                )}
                {item.coverImage
                    ? <img src={item.coverImage} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hovered ? 'scale(1.08)' : 'scale(1)' }} alt="" />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Database size={18} color="#374151" /></div>
                }
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
                <span style={{
                    padding: '2px 7px', borderRadius: 4, display: 'inline-block', width: 'fit-content',
                    background: cat.dim, border: `1px solid ${cat.border}`,
                    fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: cat.color, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                    {item.category}
                </span>
                <p style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem',
                    color: hovered ? cat.color : '#fff',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    transition: 'color 0.2s',
                }}>
                    {item.title}
                </p>
                {item.rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={9} color="#fbbf24" fill="#fbbf24" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#fbbf24', fontWeight: 700 }}>{item.rating.toFixed(1)}</span>
                    </div>
                )}
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#4b5563', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.description}
                </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <ArrowUpRight size={16} color={hovered ? cat.color : '#374151'} style={{ transition: 'color 0.2s' }} />
            </div>
        </div>
    );
}

// ── Stat card ──────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, dim }) {
    return (
        <div style={{
            padding: '20px 22px',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            animation: 'fadeUp 0.4s ease both',
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: dim,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                border: `1px solid ${color}20`,
            }}>
                <Icon size={20} color={color} />
            </div>
            <div>
                <p style={{
                    fontFamily: 'var(--font-display)', fontWeight: 800,
                    fontSize: '1.5rem', color: '#fff', lineHeight: 1, marginBottom: 4,
                }}>
                    {value}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    {label}
                </p>
                {sub && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#374151', marginTop: 2 }}>{sub}</p>}
            </div>
        </div>
    );
}

// ── Main Dashboard ─────────────────────────────────
export default function DashboardPage({ onNavigate }) {
    const { user, achievements } = useAuth();
    const { library, updateItem } = useLibrary();
    const toast = useToast();
    const queryClient = useQueryClient();

    const [hasPrefs, setHasPrefs] = useState(true);

    const {
        data: recsData,
        isLoading: loadingRecs,
        isError: recsError,
    } = useQuery({
        queryKey: ['dashboard', 'recommendations'],
        queryFn: () => recsApi.get({ limit: 12, offset: 0 }),
        staleTime: 60_000,
    });

    const {
        data: stats,
        isLoading: loadingStats,
        isError: statsError,
    } = useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: () => recsApi.stats(),
        staleTime: 45_000,
    });

    const {
        data: prefsData,
        isLoading: loadingPrefs,
        isError: prefsError,
    } = useQuery({
        queryKey: ['dashboard', 'preferences'],
        queryFn: () => prefApi.getMine(),
        staleTime: 120_000,
    });

    useEffect(() => {
        if (recsError) toast('Failed to load recommendations', 'error');
    }, [recsError, toast]);

    useEffect(() => {
        if (statsError) toast('Failed to load dashboard stats', 'error');
    }, [statsError, toast]);

    useEffect(() => {
        if (prefsError) toast('Failed to load preferences', 'error');
    }, [prefsError, toast]);

    useEffect(() => {
        if (recsData) setHasPrefs(recsData.hasPreferences ?? true);
    }, [recsData]);

    useEffect(() => {
        queryClient.prefetchQuery({
            queryKey: ['discover', { category: 'All', tagIds: '', q: '', sort: 'newest', limit: 24, offset: 0 }],
            queryFn: () => contentApi.list({ limit: 24, offset: 0, sort: 'newest' }),
            staleTime: 30_000,
        });
    }, [queryClient]);

    const recs = recsData?.recommendations || [];
    const explore = recsData?.explore || [];
    const prefs = prefsData?.preferences || {};

    const handle = user?.username || 'User';
    const totalRecs = recs.length;
    const matchRate = stats?.matchRate ?? 0;
    const topGenre = stats?.topGenres?.[0] || '—';

    if (loadingRecs) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
                <Loader2 size={36} color="#7C3AED" style={{ animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#374151' }}>
                    Calibrating neural feed...
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.2 }}>
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
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 40 }} className="dashboard-content">
                <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 14px;
        }
        
        .rec-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
          gap: 16px;
        }

        .explore-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 10px;
        }

        @media (max-width: 768px) {
          .dashboard-content { gap: 32px !important; }
          .dashboard-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
          .rec-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
          .explore-grid { grid-template-columns: 1fr; }
          .dashboard-header h1 { font-size: 1.6rem !important; }
          .dashboard-header p { font-size: 0.8rem !important; }
        }
      `}</style>

                {/* ── Header ─────────────────────────────────── */}
                <header className="dashboard-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', animation: 'fadeUp 0.4s ease' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                Live Feed
                            </span>
                        </div>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.2rem', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 8 }}>
                            Welcome back, <span style={{ color: '#7C3AED' }}>@{handle}</span>
                        </h1>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
                            {hasPrefs
                                ? `Your neural profile matched ${totalRecs} titles from the global index.`
                                : 'Configure your taste profile to unlock personalised picks.'}
                        </p>
                    </div>

                    <button
                        onClick={() => onNavigate('onboarding')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 18px', borderRadius: 12,
                            background: 'rgba(124,58,237,0.08)',
                            border: '1px solid rgba(124,58,237,0.2)',
                            cursor: 'pointer', transition: 'all 0.2s',
                            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', color: '#9ca3af',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.15)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.08)'; e.currentTarget.style.color = '#9ca3af'; }}
                    >
                        <Settings2 size={15} />
                        Tune Profile
                        <ChevronRight size={13} color="rgba(124,58,237,0.5)" />
                    </button>
                </header>

                {/* ── Library quick stats ─────────────────────── */}
                {stats?.libraryStats && (
                    <div className="dashboard-grid">
                        <StatCard label="Archive Total" value={<AnimNum target={stats.libraryStats.total} />} icon={Database} color="#8B5CF6" dim="rgba(139,92,246,0.12)" />
                        <StatCard label="Completed" value={<AnimNum target={stats.libraryStats.completed} />} icon={Check} color="#34d399" dim="rgba(52,211,153,0.12)" />
                        <StatCard label="Active Watch" value={<AnimNum target={stats.libraryStats.current} />} icon={Play} color="#22d3ee" dim="rgba(34,211,238,0.12)" />
                        <StatCard label="Watchlist" value={<AnimNum target={stats.libraryStats.planning || 0} />} icon={Bookmark} color="#f472b6" dim="rgba(244,114,182,0.12)" />
                    </div>
                )}

                {/* ── Activity Feed (you + friends) ─────────────── */}
                <ActivityFeedSection onNavigate={onNavigate} />

                {/* ── Continue Watching & Reading ──────────────── */}
                {library.filter(i => i.status === 'CURRENT' && i.content).length > 0 && (
                    <section style={{ animation: 'fadeUp 0.4s 0.08s ease both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ padding: '6px 8px', borderRadius: 10, background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.2)' }}>
                                    <Play size={15} color="#22d3ee" fill="#22d3ee" />
                                </div>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.02em' }}>
                                    Continue Watching & Reading
                                </h2>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#22d3ee', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', padding: '2px 8px', borderRadius: 20 }}>
                                    {library.filter(i => i.status === 'CURRENT' && i.content).length} active
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                            {library.filter(i => i.status === 'CURRENT' && i.content).map(entry => {
                                const it = entry.content;
                                const cat = CAT[it?.category] || fallbackCat;
                                const isManga = it?.category === 'Manga';
                                const total = it?.totalEpisodes || (isManga ? it?.totalChapters : null) || 0;
                                const progress = entry.progress || 0;
                                const percent = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0;

                                return (
                                    <div
                                        key={entry.id}
                                        onClick={() => onNavigate(`content/${it.id}`)}
                                        style={{
                                            display: 'flex', gap: 14, padding: 12, borderRadius: 16,
                                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                            cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                                    >
                                        <div style={{ width: 64, height: 86, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative', background: '#1e1e1e' }}>
                                            {it?.coverImage ? (
                                                <img src={it.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Database size={18} color="#374151" /></div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0, flex: 1 }}>
                                            <div>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: cat.color, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                                                    {it?.category}
                                                </span>
                                                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                                                    {it?.title}
                                                </h4>
                                            </div>

                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#9ca3af' }}>
                                                        {isManga ? 'Ch' : 'Ep'} <strong style={{ color: '#fff' }}>{progress}</strong>{total > 0 ? ` / ${total}` : ''}
                                                    </span>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const nextProg = total > 0 ? Math.min(total, progress + 1) : progress + 1;
                                                            const nextStatus = total > 0 && nextProg >= total ? 'COMPLETED' : 'CURRENT';
                                                            updateItem(it.id, nextStatus, entry.rating, nextProg);
                                                        }}
                                                        title={`Mark ${isManga ? 'Chapter' : 'Episode'} ${progress + 1}`}
                                                        style={{
                                                            padding: '3px 8px', borderRadius: 6,
                                                            background: `${cat.color}20`, border: `1px solid ${cat.color}40`,
                                                            color: cat.color, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 800,
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                                                        }}
                                                    >
                                                        +1
                                                    </button>
                                                </div>

                                                <div style={{ width: '100%', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${percent}%`, background: cat.color, borderRadius: 99 }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ── Achievements ────────────────────────────── */}
                {achievements?.length > 0 && (
                    <section style={{ animation: 'fadeUp 0.4s 0.1s ease both' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{ padding: '5px 7px', borderRadius: 9, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                                <Award size={15} color="#fbbf24" fill="rgba(251,191,36,0.3)" />
                            </div>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff', letterSpacing: '-0.02em' }}>
                                Unlocked Badges
                            </h2>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', padding: '2px 8px', borderRadius: 20 }}>
                                {achievements.length}
                            </span>
                        </div>
                        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                            {achievements.map((ach, i) => (
                                <div key={ach.title} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 16px', borderRadius: 12,
                                    background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)',
                                    animation: `fadeUp 0.4s ${i * 60}ms ease both`,
                                }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Star size={16} color="#fbbf24" fill="rgba(251,191,36,0.4)" />
                                    </div>
                                    <div>
                                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem', color: '#fbbf24', marginBottom: 2 }}>{ach.title}</p>
                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{ach.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Stats row ───────────────────────────────── */}
                <div className="dashboard-grid">
                    <StatCard label="Matched Titles" value={<AnimNum target={totalRecs} />} icon={Sparkles} color="#7C3AED" dim="rgba(124,58,237,0.12)" />
                    <StatCard label="Index Match Rate" value={loadingStats ? '...' : <><AnimNum target={matchRate} />%</>} sub="of total library" icon={BarChart3} color="#22d3ee" dim="rgba(34,211,238,0.12)" />
                    <StatCard label="Top Genre" value={topGenre} icon={TrendingUp} color="#f59e0b" dim="rgba(245,158,11,0.12)" />
                    <StatCard label="Preference Nodes" value={loadingPrefs ? '...' : <AnimNum target={Object.values(prefs).flat().length} />} icon={Hash} color="#f472b6" dim="rgba(244,114,182,0.12)" />
                </div>

                {/* ── No Preferences ──────────────────────────── */}
                {!hasPrefs && (
                    <div style={{
                        padding: '56px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20,
                        background: 'rgba(124,58,237,0.04)', border: '1px dashed rgba(124,58,237,0.2)', borderRadius: 20,
                        animation: 'fadeUp 0.4s ease',
                    }}>
                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(124,58,237,0.15)' }}>
                            <Activity size={28} color="#7C3AED" />
                        </div>
                        <div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: '#fff', marginBottom: 8 }}>Neural Profile Empty</h3>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#6b7280', maxWidth: 360, margin: '0 auto', fontStyle: 'italic' }}>
                                Select your genres, moods and themes to unlock the full recommendation engine.
                            </p>
                        </div>
                        <button
                            onClick={() => onNavigate('onboarding')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '12px 28px', borderRadius: 12,
                                background: '#7C3AED', color: '#fff',
                                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem',
                                border: 'none', cursor: 'pointer',
                                boxShadow: '0 0 25px rgba(124,58,237,0.4)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#8B5CF6'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#7C3AED'; e.currentTarget.style.transform = 'none'; }}
                        >
                            Initialize Profile <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                {/* ── For You ─────────────────────────────────── */}
                {recs.length > 0 && (
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ padding: '6px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                                    <Zap size={15} color="#7C3AED" fill="#7C3AED" />
                                </div>
                                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.02em' }}>
                                    For You
                                </h2>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#7C3AED', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', padding: '2px 8px', borderRadius: 20 }}>
                                    {recs.length} matches
                                </span>
                            </div>
                            <button
                                onClick={() => onNavigate('discover')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#4b5563',
                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#7C3AED'}
                                onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                            >
                                Browse All <ChevronRight size={13} />
                            </button>
                        </div>

                        <div className="rec-grid">
                            {recs.map((item, i) => (
                                <RecCard key={item.id} item={item} index={i} onNavigate={onNavigate} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Explore Beyond ──────────────────────────── */}
                {explore.length > 0 && (
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ padding: '6px 8px', borderRadius: 10, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
                                <Compass size={15} color="#22d3ee" />
                            </div>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.02em' }}>
                                Explore Beyond
                            </h2>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Outside your current profile
                            </span>
                        </div>

                        <div className="explore-grid">
                            {explore.map((item, i) => (
                                <ExploreCard key={item.id} item={item} index={i} onNavigate={onNavigate} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Category Breakdown ──────────────────────── */}
                {stats?.hasPreferences && Object.keys(stats.stats || {}).length > 0 && (
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ padding: '6px 8px', borderRadius: 10, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                <BarChart3 size={15} color="#8B5CF6" />
                            </div>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.02em' }}>
                                Match Breakdown
                            </h2>
                        </div>

                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 14,
                            padding: '24px 28px',
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18,
                        }} className="breakdown-grid">
                            {Object.entries(stats.stats).map(([cat, count]) => {
                                const cfg = CAT[cat] || fallbackCat;
                                return (
                                    <div key={cat} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 56, height: 56, borderRadius: 16,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: cfg.dim, border: `1px solid ${cfg.border}`,
                                            boxShadow: `0 0 20px ${cfg.color}20`,
                                        }}>
                                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', color: cfg.color }}>
                                                {count}
                                            </span>
                                        </div>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            {cat}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}