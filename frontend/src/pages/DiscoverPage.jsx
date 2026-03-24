import { useState, useEffect } from 'react';
import { content as contentApi, tags as tagsApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { 
  Search, 
  Filter, 
  Map as MapIcon, 
  Star, 
  ExternalLink, 
  Database,
  Hash,
  Loader2,
  Rocket
} from 'lucide-react';

const CATEGORIES = ['All', 'Anime', 'Manga', 'Movie', 'TV', 'Book'];

const CAT_STYLES = {
  Anime: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Manga: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Movie: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  TV: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Book: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

function ContentCard({ item, index }) {
  const style = CAT_STYLES[item.category] || 'bg-white/5 text-gray-400 border-white/10';
  
  return (
    <div 
      className="premium-card overflow-hidden group animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
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
            <Database size={48} />
          </div>
        )}
        
        {/* Overlays */}
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

      <div className="p-4 space-y-3">
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
              className="text-discord-blue hover:text-white transition-colors flex items-center gap-1"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={10} />
              Portal
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);

  useEffect(() => {
    tagsApi.list().then(d => {
      const flat = Object.values(d.tags || {}).flat();
      setAllTags(flat);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category !== 'All') params.category = category;
    if (selectedTag) params.tagId = selectedTag;

    contentApi.list(params)
      .then(d => setItems(d.content || []))
      .catch(() => toast('Failed to load transmission from index', 'error'))
      .finally(() => setLoading(false));
  }, [category, selectedTag]);

  const filtered = items.filter(item =>
    !search || item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 lg:space-y-12">
      {/* Header */}
      <header>
        <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">Transmission Feed</h1>
        <p className="text-gray-500 italic font-body">Explore the global synchronized library across all media sectors.</p>
      </header>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-6 lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Scan for specific titles..."
            className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm font-body focus:bg-white/[0.08] focus:border-electric-purple/40 transition-all outline-none text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-lg font-display text-xs font-bold uppercase tracking-widest transition-all ${
                category === cat 
                  ? 'bg-electric-purple text-white shadow-lg' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tag Filtering */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-4 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest border transition-all ${
              !selectedTag 
                ? 'bg-electric-purple/10 border-electric-purple/30 text-electric-purple' 
                : 'border-white/5 text-gray-600 hover:text-gray-400'
            }`}
          >
            All Protocols
          </button>
          {allTags.slice(0, 15).map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest border transition-all ${
                selectedTag === tag.id 
                  ? 'bg-electric-purple border-electric-purple text-white' 
                  : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
              }`}
            >
              <Hash size={10} />
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Results Mesh */}
      <section>
        <div className="flex items-center gap-4 mb-8">
           <div className="h-px flex-1 bg-white/5" />
           <span className="font-mono text-[10px] text-gray-700 uppercase tracking-[0.4em]">
             {loading ? 'Initializing Mesh...' : `${filtered.length} Nodes Resolved`}
           </span>
           <div className="h-px flex-1 bg-white/5" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-white/5 rounded-3xl">
            <Rocket className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-white font-display font-bold text-lg mb-2">Sector Uncharted</h3>
            <p className="text-gray-500 text-sm italic font-body">No nodes match your current scanning parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filtered.map((item, i) => (
              <ContentCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
