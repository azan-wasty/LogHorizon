import { useState, useEffect } from 'react';
import { recommendations as recsApi, preferences as prefApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  Sparkles,
  Star,
  ExternalLink,
  Zap,
  Compass,
  ChevronRight,
  Loader2,
  TrendingUp,
  Hexagon,
  Database,
  Hash,
  Settings2,
  BarChart3,
} from 'lucide-react';

// ── Category accent colours ───────────────────────
const CAT_STYLE = {
  Anime:  { pill: 'bg-pink-500/10 text-pink-400 border-pink-500/20',    dot: 'bg-pink-400' },
  Manga:  { pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    dot: 'bg-blue-400' },
  Movie:  { pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  TV:     { pill: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',    dot: 'bg-cyan-400' },
  Book:   { pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
};
const fallbackStyle = { pill: 'bg-white/5 text-gray-400 border-white/10', dot: 'bg-gray-500' };

// ── Score badge colour ────────────────────────────
function scoreBadge(score) {
  if (score >= 9) return 'bg-electric-purple text-white shadow-[0_0_12px_rgba(124,58,237,0.5)]';
  if (score >= 6) return 'bg-electric-purple/20 text-accent-violet border border-electric-purple/30';
  if (score >= 3) return 'bg-white/10 text-gray-300 border border-white/10';
  return 'bg-white/5 text-gray-500 border border-white/5';
}

// ── Single recommendation card ────────────────────
function RecCard({ item, index }) {
  const style = CAT_STYLE[item.category] || fallbackStyle;
  return (
    <div
      className="premium-card overflow-hidden group animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {item.coverImage ? (
          <img
            src={item.coverImage}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-700">
            <Database size={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Category badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${style.pill}`}>
            {item.category}
          </span>
        </div>

        {/* Rating */}
        {item.rating ? (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-dark/80 backdrop-blur-md border border-white/10 flex items-center gap-1">
            <Star size={10} className="text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-mono font-bold text-amber-400">{item.rating.toFixed(1)}</span>
          </div>
        ) : null}

        {/* Match score */}
        {item._score > 0 && (
          <div className={`absolute bottom-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${scoreBadge(item._score)}`}>
            <Zap size={9} fill="currentColor" />
            {item._score}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-display font-bold text-sm text-white line-clamp-2 min-h-[40px] group-hover:text-electric-purple transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {item._matchedTags?.[0]?.name || item.tags?.[0]?.name || 'Untagged'}
          </div>
          {item.discordLink && (
            <a
              href={item.discordLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-discord-blue hover:text-white transition-colors flex items-center gap-1"
            >
              <ExternalLink size={10} /> Portal
            </a>
          )}
        </div>

        {/* Matched tags */}
        {item._matchedTags?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item._matchedTags.slice(0, 3).map(t => (
              <span
                key={t.id}
                className="px-2 py-0.5 rounded-full bg-electric-purple/10 border border-electric-purple/20 text-[9px] font-mono text-accent-violet uppercase tracking-wider"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Explore card (no match) ───────────────────────
function ExploreCard({ item, index }) {
  const style = CAT_STYLE[item.category] || fallbackStyle;
  return (
    <div
      className="premium-card p-4 flex gap-4 group animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="w-14 h-20 bg-white/5 rounded-lg overflow-hidden flex-shrink-0">
        {item.coverImage ? (
          <img src={item.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">
            <Database size={20} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${style.pill}`}>
          {item.category}
        </span>
        <p className="text-sm font-display font-bold text-white truncate group-hover:text-electric-purple transition-colors">
          {item.title}
        </p>
        {item.rating && (
          <div className="flex items-center gap-1 text-amber-500">
            <Star size={10} fill="currentColor" />
            <span className="text-[10px] font-mono font-bold">{item.rating.toFixed(1)}</span>
          </div>
        )}
        <p className="text-[10px] text-gray-600 line-clamp-2 leading-relaxed">{item.description}</p>
      </div>
    </div>
  );
}

// ── Stat widget ───────────────────────────────────
function StatWidget({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className={`premium-card p-6 flex items-center gap-4`}>
      <div className={`p-3 rounded-xl ${accent}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-white">{value}</p>
        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{label}</p>
        {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────
export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const toast = useToast();

  const [recs, setRecs]       = useState([]);
  const [explore, setExplore] = useState([]);
  const [stats, setStats]     = useState(null);
  const [prefs, setPrefs]     = useState({});
  const [loading, setLoading] = useState(true);
  const [hasPrefs, setHasPrefs] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [recsData, statsData, prefsData] = await Promise.all([
          recsApi.get({ limit: 20 }),
          recsApi.stats(),
          prefApi.getMine(),
        ]);
        setRecs(recsData.recommendations || []);
        setExplore(recsData.explore || []);
        setHasPrefs(recsData.hasPreferences ?? true);
        setStats(statsData);
        setPrefs(prefsData.preferences || {});
      } catch {
        toast('Failed to load your dashboard', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handle = user?.email?.split('@')[0] || 'User';
  const totalRecs = recs.length;
  const matchRate = stats?.matchRate ?? 0;
  const topGenre  = stats?.topGenres?.[0] || '—';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-10 h-10 text-electric-purple animate-spin" />
        <p className="font-mono text-xs uppercase tracking-widest text-gray-600">Calibrating neural feed...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">

      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-electric-purple/10 border border-electric-purple/20 text-[10px] font-mono font-bold uppercase tracking-widest text-electric-purple">
              Dashboard
            </span>
          </div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">
            Welcome back, <span className="text-electric-purple">@{handle}</span>
          </h1>
          <p className="text-gray-500 text-sm italic font-body">
            {hasPrefs
              ? `Your neural profile found ${totalRecs} matched titles.`
              : 'Set your preferences to unlock personalised recommendations.'}
          </p>
        </div>
        <button
          onClick={() => onNavigate('onboarding')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-sm font-display font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-all group"
        >
          <Settings2 size={16} />
          Tune Profile
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </header>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatWidget
          label="Matched Titles"
          value={totalRecs}
          icon={Sparkles}
          accent="bg-electric-purple/10 text-electric-purple"
        />
        <StatWidget
          label="Index Match Rate"
          value={`${matchRate}%`}
          sub="of total library"
          icon={BarChart3}
          accent="bg-cyan-400/10 text-cyan-400"
        />
        <StatWidget
          label="Top Genre"
          value={topGenre}
          icon={TrendingUp}
          accent="bg-amber-500/10 text-amber-500"
        />
        <StatWidget
          label="Preference Nodes"
          value={Object.values(prefs).flat().length}
          icon={Hash}
          accent="bg-pink-500/10 text-pink-400"
        />
      </div>

      {/* ── No Preferences State ── */}
      {!hasPrefs && (
        <div className="glass-panel p-12 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-electric-purple/10 flex items-center justify-center text-electric-purple border border-electric-purple/20">
            <Hexagon size={32} />
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-white mb-2">Neural Profile Empty</h3>
            <p className="text-gray-400 font-body text-sm max-w-sm mx-auto">
              Select your genres, moods and themes to unlock personalised recommendations.
            </p>
          </div>
          <button
            onClick={() => onNavigate('onboarding')}
            className="bg-electric-purple text-white px-8 py-3 rounded-xl font-display font-bold shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:bg-accent-violet hover:-translate-y-0.5 transition-all"
          >
            Initialize Profile
          </button>
        </div>
      )}

      {/* ── For You Grid ── */}
      {recs.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="text-electric-purple" size={22} fill="currentColor" />
              <h2 className="text-xl font-display font-bold text-white tracking-tight">For You</h2>
              <span className="px-2 py-0.5 rounded-full bg-electric-purple/10 border border-electric-purple/20 text-[10px] font-mono text-electric-purple">
                {recs.length} matches
              </span>
            </div>
            <button
              onClick={() => onNavigate('discover')}
              className="text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-electric-purple transition-colors flex items-center gap-1.5"
            >
              Browse All <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {recs.map((item, i) => (
              <RecCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Explore Beyond ── */}
      {explore.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Compass className="text-cyan-400" size={22} />
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Explore Beyond</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-600">
              Outside your current profile
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {explore.map((item, i) => (
              <ExploreCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Category Breakdown ── */}
      {stats?.hasPreferences && Object.keys(stats.stats || {}).length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-accent-violet" size={22} />
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Match Breakdown</h2>
          </div>

          <div className="glass-panel p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {Object.entries(stats.stats).map(([cat, count]) => {
              const style = CAT_STYLE[cat] || fallbackStyle;
              return (
                <div key={cat} className="flex flex-col items-center gap-3 group">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${style.pill} transition-transform group-hover:scale-110`}>
                    <span className="text-xl font-display font-bold">{count}</span>
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{cat}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
