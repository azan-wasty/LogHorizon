import { useState, useEffect, useCallback, useRef } from 'react';
import { content as contentApi, tags as tagsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import {
  Search,
  Star,
  ExternalLink,
  Database,
  Hash,
  Loader2,
  Rocket,
  SlidersHorizontal,
  X,
  ChevronDown,
} from 'lucide-react';

const CATEGORIES = ['All', 'Anime', 'Manga', 'Movie', 'TV', 'Book'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'title', label: 'A → Z' },
];

const CAT_STYLES = {
  Anime: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Manga: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Movie: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  TV: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Book: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

// ── debounce hook ──────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Content card ───────────────────────────────────
function ContentCard({ item, index }) {
  const style = CAT_STYLES[item.category] || 'bg-white/5 text-gray-400 border-white/10';
  return (
    <div
      className="premium-card overflow-hidden group animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
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

        <div className="absolute top-3 right-3">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${style}`}>
            {item.category}
          </span>
        </div>

        {item.rating && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-dark/80 backdrop-blur-md border border-white/10 flex items-center gap-1">
            <Star size={10} className="text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-mono font-bold text-amber-400">{item.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-display font-bold text-sm text-white line-clamp-2 min-h-[40px] group-hover:text-electric-purple transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
          <div className="flex items-center gap-2 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-electric-purple/40" />
            {item.tags?.[0]?.name || 'Untagged'}
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
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────
export default function DiscoverPage() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Filters
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search, 350);
  const firstLoad = useRef(true);

  // Load tags once
  useEffect(() => {
    tagsApi.list()
      .then(d => setAllTags(Object.values(d.tags || {}).flat()))
      .catch(() => { });
  }, []);

  // Fetch content whenever filters change
  const fetchContent = useCallback(async () => {
    if (firstLoad.current) {
      setLoading(true);
      firstLoad.current = false;
    } else {
      setSearching(true);
    }

    try {
      const params = {};
      if (category !== 'All') params.category = category;
      // Pass only first selected tag (backend supports single tagId)
      if (selectedTags.length > 0) params.tagId = selectedTags[0];

      const data = await contentApi.list(params);
      let results = data.content || [];

      // Client-side: text search filter
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        results = results.filter(
          item =>
            item.title.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q)
        );
      }

      // Client-side: multi-tag filter (for additional selected tags beyond first)
      if (selectedTags.length > 1) {
        results = results.filter(item =>
          selectedTags.every(tid =>
            item.tags?.some(t => t.id === tid)
          )
        );
      }

      // Sort
      results = [...results].sort((a, b) => {
        if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
        if (sort === 'title') return a.title.localeCompare(b.title);
        return new Date(b.createdAt) - new Date(a.createdAt); // newest
      });

      setItems(results);
    } catch {
      toast('Failed to load content index', 'error');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [category, selectedTags, debouncedSearch, sort]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const toggleTag = (id) => {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setCategory('All');
    setSearch('');
    setSelectedTags([]);
    setSort('newest');
  };

  const hasActiveFilters =
    category !== 'All' || selectedTags.length > 0 || search.trim() || sort !== 'newest';

  return (
    <div className="space-y-8 lg:space-y-10">

      {/* ── Header ── */}
      <header>
        <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">Transmission Feed</h1>
        <p className="text-gray-500 italic font-body">Explore the global synchronized library across all media sectors.</p>
      </header>

      {/* ── Search + Controls ── */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
          {/* Search bar */}
          <div className="relative flex-1 max-w-lg">
            {searching ? (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-electric-purple animate-spin" size={18} />
            ) : (
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            )}
            <input
              type="text"
              placeholder="Search titles and descriptions..."
              className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-10 text-sm font-body focus:bg-white/[0.08] focus:border-electric-purple/40 transition-all outline-none text-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg font-display text-xs font-bold uppercase tracking-widest transition-all ${category === cat
                    ? 'bg-electric-purple text-white shadow-lg'
                    : 'text-gray-500 hover:text-white'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort + Filter toggle */}
          <div className="flex items-center gap-3">
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="bg-white/5 border border-white/5 rounded-xl pl-4 pr-9 py-2.5 text-xs font-display font-semibold uppercase tracking-widest text-gray-400 outline-none focus:border-electric-purple/40 transition-all appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-charcoal text-white">
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-display font-semibold uppercase tracking-widest border transition-all ${showFilters || selectedTags.length > 0
                  ? 'bg-electric-purple/10 border-electric-purple/30 text-electric-purple'
                  : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                }`}
            >
              <SlidersHorizontal size={14} />
              Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-widest text-red-400/70 hover:text-red-400 hover:bg-red-400/10 border border-red-400/10 transition-all"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Expanded tag filter panel */}
        {showFilters && allTags.length > 0 && (
          <div className="glass-panel p-5 space-y-4 animate-fade-up">
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Filter by tags</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest border transition-all ${selectedTags.includes(tag.id)
                      ? 'bg-electric-purple border-electric-purple text-white shadow-[0_0_10px_rgba(124,58,237,0.3)]'
                      : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                    }`}
                >
                  <Hash size={9} />
                  {tag.name}
                  <span className="text-[8px] opacity-60">({tag.type})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-white/5" />
          <span className="font-mono text-[10px] text-gray-700 uppercase tracking-[0.4em]">
            {loading
              ? 'Scanning index...'
              : `${items.length} node${items.length !== 1 ? 's' : ''} resolved`}
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-white/5 rounded-3xl">
            <Rocket className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-white font-display font-bold text-lg mb-2">Sector Uncharted</h3>
            <p className="text-gray-500 text-sm italic font-body mb-6">
              No nodes match your current scanning parameters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-electric-purple font-mono text-xs uppercase tracking-widest hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {items.map((item, i) => (
              <ContentCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}