import { useState, useEffect } from 'react';
import { content as contentApi } from '../api/client';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import {
  Star,
  Database,
  ExternalLink,
  Loader2,
  Bookmark,
  Check,
  Play,
  ArrowLeft
} from 'lucide-react';

const CAT_STYLES = {
  Anime: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Manga: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Movie: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  TV: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Book: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function ContentPage({ id }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const { updateItem, removeItem, isInLibrary } = useLibrary();
  const toast = useToast();

  useEffect(() => {
    contentApi.get(id)
      .then(res => setItem(res.content))
      .catch(() => toast('Neural link lost. Content unavailable.', 'error'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-10 h-10 text-electric-purple animate-spin" />
      </div>
    );
  }

  if (!item) return null;

  const entry = isInLibrary(item.id);
  const style = CAT_STYLES[item.category] || 'bg-white/5 text-gray-400 border-white/10';

  const handleAction = async (status) => {
    if (entry?.status === status) {
      await removeItem(item.id);
    } else {
      await updateItem(item.id, status);
    }
  };

  return (
    <div className="animate-fade-up max-w-5xl mx-auto min-h-[80vh] flex flex-col justify-center py-12">
      {/* Interactive Header */}
      <div className="relative rounded-3xl overflow-hidden bg-dark border border-white/5 shadow-2xl flex flex-col md:flex-row group">

        {/* Cover Art Wrapper */}
        <div className="md:w-1/3 aspect-[3/4] relative flex-shrink-0">
          {item.coverImage ? (
            <>
              <img
                src={item.coverImage}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/40 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5 text-gray-600">
              <Database size={64} />
            </div>
          )}

          {/* Top Left Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md outline outline-1 ${style}`}>
              {item.category}
            </span>
            {item.rating && (
              <div className="px-3 py-1 rounded-full bg-dark/80 backdrop-blur-md border border-white/10 flex items-center gap-1.5 w-max">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="text-xs font-mono font-bold text-amber-400">{item.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Details */}
        <div className="p-8 md:p-10 flex-1 flex flex-col relative bg-gradient-to-br from-charcoal to-dark/50">
          <div className="flex-1 space-y-6">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight leading-tight">
              {item.title}
            </h1>

            <div className="flex flex-wrap gap-2">
              {item.tags?.map(t => (
                <span key={t.id} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-[10px] font-mono tracking-widest uppercase border border-white/5 inline-flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${t.type === 'Genre' ? 'bg-electric-purple' : t.type === 'Mood' ? 'bg-cyan-400' : 'bg-pink-500'}`} />
                  {t.name}
                </span>
              ))}
            </div>

            <p className="text-gray-400 font-body leading-relaxed max-w-2xl text-sm md:text-base opacity-90 relative z-10">
              {item.description}
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Library Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAction('PLANNING')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-display font-semibold transition-all ${entry?.status === 'PLANNING' ? 'bg-electric-purple text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                <Bookmark size={18} fill={entry?.status === 'PLANNING' ? 'currentColor' : 'none'} />
                Watchlist
              </button>
              <button
                onClick={() => handleAction('COMPLETED')}
                className={`p-3 rounded-xl transition-all ${entry?.status === 'COMPLETED' ? 'bg-spotify-green text-white shadow-[0_0_20px_rgba(29,185,84,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                title="Mark Completed"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => handleAction('CURRENT')}
                className={`p-3 rounded-xl transition-all ${entry?.status === 'CURRENT' ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                title="Currently Playing/Watching"
              >
                <Play size={18} fill={entry?.status === 'CURRENT' ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* External App Link */}
            {item.discordLink && (
              <a
                href={item.discordLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-discord-blue hover:text-white font-mono text-[10px] uppercase tracking-widest bg-discord-blue/10 px-4 py-2 rounded-lg transition-colors border border-discord-blue/20"
              >
                <ExternalLink size={14} /> Open Portal
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
