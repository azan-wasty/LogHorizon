import { useState, useEffect, useCallback, useRef } from 'react';
import { content as contentApi, tags as tagsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import {
  Search, Star, ExternalLink, Database, Hash,
  Loader2, SlidersHorizontal, X, Bookmark,
  Check, Play, ChevronDown, Rocket, Filter,
} from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';

const CATEGORIES = ['All', 'Anime', 'Manga', 'Movie', 'TV'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'title', label: 'A → Z' },
];
const CAT = {
  Anime: { color: '#f472b6', dim: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)' },
  Manga: { color: '#60a5fa', dim: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
  Movie: { color: '#fbbf24', dim: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
  TV: { color: '#34d399', dim: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
};
const fallbackCat = { color: '#7C3AED', dim: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)' };
const PAGE_SIZE = 24;

function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ── Content Card ───────────────────────────────────
function ContentCard({ item, index, onNavigate }) {
  const { updateItem, removeItem, isInLibrary } = useLibrary();
  const [hovered, setHovered] = useState(false);
  const entry = isInLibrary(item.id);
  const cat = CAT[item.category] || fallbackCat;

  const handleAction = async (e, status) => {
    e.stopPropagation();
    if (entry?.status === status) await removeItem(item.id);
    else await updateItem(item.id, status);
  };

  return (
    <div
      onClick={() => onNavigate(`content/${item.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        background: 'rgba(255,255,255,0.025)',
        border: hovered ? `1px solid ${cat.color}30` : '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.3s',
        transform: hovered ? 'translateY(-5px)' : 'none',
        boxShadow: hovered ? `0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px ${cat.color}15` : 'none',
        animation: `fadeUp 0.4s ${index * 30}ms ease both`,
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Cover */}
      <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', flexShrink: 0 }}>
        {item.isSuggested && (
          <div style={{
            position: 'absolute', top: 8, left: 8, zIndex: 20,
            padding: '3px 8px', borderRadius: 6,
            background: '#f59e0b', color: '#000',
            fontFamily: 'var(--font-display)', fontSize: '0.58rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: 4, animation: 'pulse 2s infinite',
          }}>
            <Star size={8} fill="currentColor" /> Suggested
          </div>
        )}

        {item.coverImage ? (
          <img
            src={item.coverImage} alt={item.title}
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s', transform: hovered ? 'scale(1.08)' : 'scale(1)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={36} color="#374151" />
          </div>
        )}

        {/* Hover action overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.25s',
        }}>
          {[
            { status: 'PLANNING', icon: Bookmark, activeColor: '#7C3AED', label: 'Watchlist' },
            { status: 'CURRENT', icon: Play, activeColor: '#22d3ee', label: 'Watching' },
            { status: 'COMPLETED', icon: Check, activeColor: '#34d399', label: 'Done' },
          ].map(({ status, icon: Icon, activeColor, label }) => (
            <button
              key={status}
              onClick={e => handleAction(e, status)}
              title={label}
              style={{
                width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: entry?.status === status ? activeColor : 'rgba(255,255,255,0.12)',
                border: entry?.status === status ? 'none' : '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: entry?.status === status ? `0 0 16px ${activeColor}60` : 'none',
              }}
            >
              <Icon size={18} color={entry?.status === status ? '#fff' : '#d1d5db'} fill={entry?.status === status && status !== 'CURRENT' ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,14,22,0.9) 0%, transparent 55%)', opacity: hovered ? 0.4 : 0.8, transition: 'opacity 0.3s' }} />

        {/* Category */}
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
            position: 'absolute', bottom: 8, left: 8, zIndex: 20,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 20,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <Star size={9} color="#fbbf24" fill="#fbbf24" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, color: '#fbbf24' }}>
              {item.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem',
          color: hovered ? cat.color : '#fff',
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', minHeight: 36, lineHeight: 1.35,
          transition: 'color 0.2s',
        }}>
          {item.title}
        </h3>

        {/* Library status indicator */}
        {entry && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: entry.status === 'COMPLETED' ? '#34d399' : entry.status === 'PLANNING' ? '#7C3AED' : '#22d3ee',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
            {entry.status === 'PLANNING' ? 'Watchlist' : entry.status === 'CURRENT' ? 'Watching' : 'Completed'}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(124,58,237,0.5)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {item.tags?.[0]?.name || 'Untagged'}
            </span>
          </div>
          {item.discordLink && (
            <a
              href={item.discordLink} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#5865F2', fontSize: '0.58rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em' }}
            >
              <ExternalLink size={9} /> Portal
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────
export default function DiscoverPage({ onNavigate }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const debouncedSearch = useDebounce(search, 350);
  const firstLoad = useRef(true);
  const offsetRef = useRef(0);

  useEffect(() => {
    tagsApi.list()
      .then(d => setAllTags(Object.values(d.tags || {}).flat()))
      .catch(() => { });
  }, []);

  const fetchContent = useCallback(async ({ reset = false } = {}) => {
    const requestOffset = reset ? 0 : offsetRef.current;
    if (firstLoad.current) { setLoading(true); firstLoad.current = false; }
    else if (reset) setSearching(true);
    else setLoadingMore(true);
    try {
      const params = { limit: PAGE_SIZE, offset: requestOffset };
      if (category !== 'All') params.category = category;
      if (selectedTags.length > 0) params.tagIds = selectedTags.join(',');
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      if (sort) params.sort = sort;
      const data = await contentApi.list(params);
      const nextItems = data.content || [];
      setTotal(data.total ?? nextItems.length);
      setHasMore(Boolean(data.hasMore));
      if (reset) {
        setItems(nextItems);
        offsetRef.current = nextItems.length;
      } else {
        setItems(prev => [...prev, ...nextItems]);
        offsetRef.current = requestOffset + nextItems.length;
      }
    } catch {
      toast('Failed to load content index', 'error');
      if (reset) {
        setItems([]);
        setTotal(0);
        setHasMore(false);
        offsetRef.current = 0;
      }
    } finally {
      setLoading(false);
      setSearching(false);
      setLoadingMore(false);
    }
  }, [category, selectedTags, debouncedSearch, sort, toast]);

  useEffect(() => { fetchContent({ reset: true }); }, [fetchContent]);

  const toggleTag = id => setSelectedTags(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const clearFilters = () => { setCategory('All'); setSearch(''); setSelectedTags([]); setSort('newest'); };
  const hasFilters = category !== 'All' || selectedTags.length > 0 || search.trim() || sort !== 'newest';

  // Group tags by type
  const tagsByType = allTags.reduce((acc, t) => {
    if (!acc[t.type]) acc[t.type] = [];
    acc[t.type].push(t);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} className="discover-content">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .discover-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
          gap: 16px;
        }

        @media (max-width: 768px) {
          .discover-content { gap: 24px !important; }
          .discover-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
          .discover-header h1 { font-size: 1.6rem !important; }
          .filter-controls { gap: 8px !important; }
          .search-box { max-width: none !important; width: 100% !important; order: -1; }
          .category-scroll { overflow-x: auto; padding-bottom: 4px; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <header style={{ animation: 'fadeUp 0.4s ease' }} className="discover-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
            fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#7C3AED',
            textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
          }}>
            Transmission Feed
          </span>
          {!loading && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#374151',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              {total || items.length} nodes
            </span>
          )}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.2rem', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 8 }}>
          Discover
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
          Explore the synchronized global library across all media sectors.
        </p>
      </header>

      {/* Controls bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.4s 0.05s ease both' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }} className="filter-controls">
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 400 }} className="search-box">
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
              {searching
                ? <Loader2 size={16} color="#7C3AED" style={{ animation: 'spin 0.8s linear infinite' }} />
                : <Search size={16} color="#6b7280" />
              }
            </div>
            <input
              type="text"
              placeholder="Search titles and descriptions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: search ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '11px 14px 11px 42px',
                fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#fff',
                outline: 'none', transition: 'all 0.2s',
              }}
              onFocus={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.borderColor = 'rgba(124,58,237,0.4)'; }}
              onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.borderColor = search ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.07)'; }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <X size={13} color="#6b7280" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div style={{
            display: 'flex', gap: 3, padding: 4,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, flexWrap: 'wrap',
          }} className="category-scroll">
            {CATEGORIES.map(cat => {
              const cfg = CAT[cat];
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '7px 14px', borderRadius: 9,
                    fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: active
                      ? (cfg ? cfg.dim : 'rgba(124,58,237,0.15)')
                      : 'transparent',
                    color: active
                      ? (cfg ? cfg.color : '#7C3AED')
                      : '#6b7280',
                    boxShadow: active && cfg ? `0 0 10px ${cfg.color}20` : 'none',
                    flexShrink: 0
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div style={{ position: 'relative' }}>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '11px 36px 11px 14px',
                fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
                color: '#9ca3af', outline: 'none', cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
              }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} style={{ background: '#1E1E1E', color: '#fff' }}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Tags toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '11px 16px', borderRadius: 12,
              background: showFilters || selectedTags.length > 0 ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)',
              border: showFilters || selectedTags.length > 0 ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.07)',
              color: showFilters || selectedTags.length > 0 ? '#7C3AED' : '#6b7280',
              fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Filter size={14} />
            Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '11px 14px', borderRadius: 12,
                background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)',
                color: '#f87171', fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Tag filter panel */}
        {showFilters && allTags.length > 0 && (
          <div style={{
            padding: '20px 22px',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            animation: 'fadeUp 0.25s ease',
          }}>
            {Object.entries(tagsByType).map(([type, typeTags]) => (
              <div key={type} style={{ marginBottom: 14 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#7C3AED' }} />
                  {type}s
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {typeTags.map(tag => {
                    const active = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 12px', borderRadius: 20,
                          fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                          background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                          color: active ? '#a78bfa' : '#6b7280',
                          outline: active ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
                        }}
                      >
                        <Hash size={8} />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider with count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.2em', flexShrink: 0 }}>
          {loading ? 'Scanning index...' : `Showing ${items.length} of ${total || items.length} nodes`}
        </span>
        <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="discover-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '3/4', borderRadius: 16, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{
          padding: '80px 32px', textAlign: 'center',
          border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 20,
          animation: 'fadeUp 0.4s ease',
        }}>
          <Rocket size={44} color="#374151" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: '#fff', marginBottom: 8 }}>Sector Uncharted</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic', marginBottom: 20 }}>
            No nodes match your current scanning parameters.
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#7C3AED',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="discover-grid">
            {items.map((item, i) => (
              <ContentCard key={item.id} item={item} index={i} onNavigate={onNavigate} />
            ))}
          </div>
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => fetchContent({ reset: false })}
                disabled={loadingMore}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 12,
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(124,58,237,0.25)',
                  color: '#a78bfa',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem',
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  opacity: loadingMore ? 0.7 : 1,
                }}
              >
                {loadingMore ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <ChevronDown size={14} />}
                {loadingMore ? 'Loading more...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}