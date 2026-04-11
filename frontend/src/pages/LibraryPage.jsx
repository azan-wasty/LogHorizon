import { useState, useEffect } from 'react';
import { preferences as prefApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import { 
  Swords, 
  Compass, 
  Laugh, 
  Drama, 
  Sparkles, 
  Rocket, 
  Palmtree, 
  Zap, 
  Moon, 
  Droplet, 
  Users, 
  Sprout, 
  Skull, 
  Search,
  Settings2,
  Bookmark,
  ChevronRight,
  Loader2,
  Hexagon,
  Star,
  ExternalLink,
  CheckCircle2,
  PlayCircle,
  LayoutGrid
} from 'lucide-react';

const ICONS = {
  Action: Swords, 
  Adventure: Compass, 
  Comedy: Laugh, 
  Drama: Drama,
  Fantasy: Sparkles, 
  'Sci-Fi': Rocket,
  Chill: Palmtree, 
  Hype: Zap, 
  Dark: Moon, 
  Emotional: Droplet,
  Friendship: Users, 
  'Coming of Age': Sprout, 
  Revenge: Skull, 
  Mystery: Search,
};

const STAT_COLORS = {
  PLANNING: 'text-electric-purple',
  COMPLETED: 'text-spotify-green',
  CURRENT: 'text-cyan-400'
};

export default function LibraryPage({ onNavigate }) {
  const { user } = useAuth();
  const { library, loading: libLoading, removeItem, updateItem } = useLibrary();
  const toast = useToast();
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    prefApi.getMine()
      .then((pd) => setPrefs(pd.preferences || {}))
      .catch(() => toast('Failed to load neural profile', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const allPrefs = Object.values(prefs).flat();
  const hasPrefs = allPrefs.length > 0;

  const filteredLibrary = filter === 'ALL' 
    ? library 
    : library.filter(item => item.status === filter);

  if (loading || libLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-10 h-10 text-electric-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">Personal Hub</h1>
          <p className="text-gray-500 font-body italic">
            Synchronizing data for <span className="text-electric-purple font-semibold">@{user?.username}</span>
          </p>
        </div>
      </header>

      {/* Taste Resonance Card */}
      <section className="glass-panel p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-electric-purple/5 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-electric-purple/10 text-electric-purple border border-electric-purple/20">
              <Zap size={24} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white">Neural Resonance</h2>
              <p className="text-xs font-mono uppercase tracking-widest text-gray-500">Your taste profile parameters</p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('onboarding')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/5 text-sm font-display font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-all group"
          >
            <Settings2 size={16} />
            Update Profile
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {!hasPrefs ? (
          <div className="py-12 flex flex-col items-center text-center space-y-6">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
               <Hexagon size={32} />
             </div>
             <p className="text-gray-400 font-body max-w-sm">No neural data detected. Initialize your taste profile to unlock deep curation.</p>
             <button 
              onClick={() => onNavigate('onboarding')}
              className="bg-electric-purple text-white px-8 py-3 rounded-xl font-display font-bold shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:scale-105 transition-all"
             >
               Start Initialization
             </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(prefs).map(([type, opts]) => (
              <div key={type} className="space-y-4">
                <h4 className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-gray-600">
                  <div className="w-1 h-1 rounded-full bg-electric-purple/40" />
                  {type} Nodes
                </h4>
                <div className="flex flex-wrap gap-3">
                  {opts.map(opt => {
                    const Icon = ICONS[opt.value] || Hexagon;
                    return (
                      <div 
                        key={opt.id}
                        className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/5 border border-white/5 hover:border-electric-purple/30 transition-all group"
                      >
                        <Icon size={14} className="text-electric-purple group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-display font-medium text-gray-300 group-hover:text-white uppercase tracking-wider">{opt.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Library Collection Section */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Bookmark className="text-electric-purple" />
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Neural Library</h2>
          </div>
          
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 self-start">
            {[
              { id: 'ALL', label: 'All', icon: LayoutGrid },
              { id: 'PLANNING', label: 'Watchlist', icon: Bookmark },
              { id: 'CURRENT', label: 'In Progress', icon: PlayCircle },
              { id: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-display text-xs font-bold uppercase tracking-widest transition-all ${filter === tab.id 
                  ? 'bg-electric-purple text-white shadow-lg' 
                  : 'text-gray-500 hover:text-white'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredLibrary.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-white/5 rounded-3xl">
            <Search className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Your {filter.toLowerCase()} archive is empty.</p>
            <button 
              onClick={() => onNavigate('discover')}
              className="mt-6 text-electric-purple font-mono text-[10px] items-center gap-2 hover:underline uppercase tracking-widest"
            >
              Scan Index for Media <ChevronRight size={10} className="inline" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLibrary.map((entry, i) => {
              const item = entry.content;
              return (
                <div 
                  key={entry.id} 
                  className="premium-card p-6 flex gap-5 group animate-fade-up relative overflow-hidden"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="w-20 h-28 bg-white/5 rounded-xl overflow-hidden flex-shrink-0 shadow-lg group-hover:shadow-electric-purple/10 transition-all border border-white/5">
                    {item.coverImage ? (
                      <img src={item.coverImage} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700 px-4 text-center text-[10px] font-mono">
                        NO IMAGE
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-display font-bold text-white text-sm truncate group-hover:text-electric-purple transition-colors">
                        {item.title}
                      </h3>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1"
                      >
                        <Search size={14} className="rotate-45" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-mono font-bold text-gray-500 uppercase">
                        {item.category}
                      </span>
                      <span className={`text-[8px] font-mono font-bold uppercase tracking-widest ${STAT_COLORS[entry.status]}`}>
                        • {entry.status === 'PLANNING' ? 'Watchlist' : entry.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="pt-2 flex items-center gap-4">
                      {item.discordLink && (
                        <a 
                          href={item.discordLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-discord-blue hover:text-white transition-colors text-[9px] font-mono font-bold uppercase tracking-widest"
                        >
                          <ExternalLink size={10} />
                          Portal
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
