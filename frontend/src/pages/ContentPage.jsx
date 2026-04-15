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
  ArrowLeft,
  Calendar,
  Layers,
  Activity
} from 'lucide-react';

const CAT_STYLES = {
  Anime: 'bg-pink-500/10 text-pink-400 border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.15)]',
  Manga: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
  Movie: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
  TV: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
  Book: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
};

export default function ContentPage({ id, onNavigate }) {
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
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-12 h-12 text-electric-purple animate-spin" />
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
      await updateItem(item.id, status, entry?.rating || null);
    }
  };

  const handleRate = async (newRating) => {
    const status = entry?.status || 'COMPLETED'; // Assume COMPLETED if rating an unadded item
    await updateItem(item.id, status, newRating);
  };

  return (
    <div className="animate-fade-up relative w-full pt-16 pb-24 px-4 sm:px-6">
      {/* Immersive Background */}
      {item.coverImage && (
        <>
          <div 
            className="absolute inset-0 z-[-2] pointer-events-none"
            style={{
              backgroundImage: `url(${item.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(60px) brightness(0.2) saturate(150%)',
              opacity: 0.8
            }}
          />
          <div className="absolute inset-0 z-[-1] bg-black/70 pointer-events-none" />
        </>
      )}

      <div className="max-w-[90rem] mx-auto flex flex-col pt-10">
        
        <button 
          onClick={() => onNavigate ? onNavigate('dashboard') : window.history.back()} 
          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10 w-max px-4 py-2 bg-white/5 rounded-xl border border-white/5 backdrop-blur-md hover:bg-white/10"
        >
          <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
          <span className="font-mono text-sm tracking-widest uppercase">Go Back</span>
        </button>

        <div className="flex flex-col md:flex-row" style={{ gap: '4rem' }}>
          
          {/* Left Panel: Art & Meta */}
          <div className="flex-shrink-0 flex flex-col items-center md:items-start mx-auto md:mx-0" style={{ width: '280px', maxWidth: '100%' }}>
            <div className="w-full aspect-[2/3] rounded-[2rem] overflow-hidden bg-dark border border-white/10 shadow-2xl relative group">
              {item.coverImage ? (
                <>
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/10 to-transparent opacity-90" />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 text-gray-600 gap-4">
                  <Database size={64} />
                  <span className="font-mono text-xs uppercase tracking-widest">No Cover Found</span>
                </div>
              )}

              {/* Status/Category Overlay */}
              <div className="absolute top-5 left-5 flex flex-col gap-2.5">
                <span className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest backdrop-blur-md border ${style}`}>
                  {item.category}
                </span>
                
                {item.status && (
                  <span className="px-4 py-1.5 rounded-full bg-dark/80 text-gray-300 border border-white/10 text-xs font-mono font-bold uppercase tracking-widest backdrop-blur-md w-max shadow-lg">
                    {item.status}
                  </span>
                )}
              </div>
            </div>
            
            {item.discordLink && (
              <a
                href={item.discordLink}
                target="_blank"
                rel="noreferrer"
                className="mt-6 w-full flex items-center justify-center gap-3 text-discord-blue font-mono text-sm uppercase tracking-widest bg-discord-blue/10 hover:bg-discord-blue/20 hover:text-white px-6 py-4 rounded-xl transition-all border border-discord-blue/20"
              >
                <ExternalLink size={18} /> Join Discussion
              </a>
            )}
          </div>

          {/* Right Panel: Content Info */}
          <div className="flex-1 flex flex-col pt-2" style={{ minWidth: '0' }}>
            
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-display font-extrabold text-white tracking-tight leading-tight lg:leading-[1.1] mb-6 drop-shadow-xl">
              {item.title}
            </h1>

            {/* Quick Stats */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              {item.rating && (
                <div className="flex flex-col px-5 py-3 bg-amber-500/10 border border-amber-500/20 rounded-[1rem] shadow-lg">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs font-mono tracking-widest text-amber-500/80 uppercase">Global Scale</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-amber-400 font-display leading-none">{Number(item.rating).toFixed(1)}</span>
                      <span className="text-xs text-amber-400/60 font-mono">/10</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((idx) => {
                      const val = idx * 2;
                      const r = Number(item.rating);
                      const isFull = r >= val - 0.5;
                      const isHalf = !isFull && r >= val - 1.5;
                      return (
                        <Star 
                          key={idx} 
                          size={18} 
                          className={isFull ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : isHalf ? "text-amber-400 fill-amber-400/50" : "text-amber-400/20"} 
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {item.source && (
                <div className="flex items-center gap-2 text-white text-sm font-mono bg-white/10 border border-white/20 px-5 py-3 rounded-xl backdrop-blur-md shadow-lg">
                  <Layers size={18} className="text-electric-purple drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                  <span className="opacity-90 font-medium">SRC:</span> <span className="font-bold text-white tracking-wider">{item.source}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-3 mb-10">
              {item.tags?.map(t => (
                <span key={t.id} className="px-5 py-2.5 rounded-[1rem] bg-white/10 text-white text-xs font-mono font-bold tracking-widest uppercase border border-white/20 inline-flex items-center gap-2.5 hover:bg-white/20 transition-all shadow-lg backdrop-blur-md">
                  <span className={`w-2.5 h-2.5 rounded-full ${t.type === 'Genre' ? 'bg-electric-purple shadow-[0_0_12px_rgba(124,58,237,1)]' : t.type === 'Mood' ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,1)]' : 'bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,1)]'}`} />
                  {t.name}
                </span>
              ))}
            </div>

            {/* Synopsis */}
            <div className="relative mb-12">
              <div className="absolute top-0 left-0 w-16 h-1.5 bg-gradient-to-r from-electric-purple to-transparent rounded-full mb-6" />
              <p className="text-white font-body leading-[1.8] max-w-4xl text-[1.15rem] pt-8 drop-shadow-md">
                {item.description}
              </p>
            </div>

            {/* Personal Actions */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-[2rem] p-8 md:p-10 backdrop-blur-xl shadow-2xl mt-auto">
              <h3 className="text-lg font-display font-medium text-white mb-8 flex items-center gap-3">
                <Activity size={20} className="text-electric-purple" />
                Library Management
              </h3>

              <div className="flex flex-col xl:flex-row gap-10 items-start xl:items-center justify-between">
                
                {/* Status Toggle */}
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                  <button
                    onClick={() => handleAction('PLANNING')}
                    className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-display font-semibold transition-all ${entry?.status === 'PLANNING' ? 'bg-electric-purple text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-electric-purple' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'}`}
                  >
                    <Bookmark size={18} fill={entry?.status === 'PLANNING' ? 'currentColor' : 'none'} />
                    Watchlist
                  </button>
                  <button
                    onClick={() => handleAction('COMPLETED')}
                    className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-display font-semibold transition-all ${entry?.status === 'COMPLETED' ? 'bg-spotify-green text-white shadow-[0_0_20px_rgba(29,185,84,0.3)] border border-spotify-green' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'}`}
                  >
                    <Check size={18} />
                    Completed
                  </button>
                  <button
                    onClick={() => handleAction('CURRENT')}
                    className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-display font-semibold transition-all ${entry?.status === 'CURRENT' ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] border border-cyan-500' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'}`}
                  >
                    <Play size={18} fill={entry?.status === 'CURRENT' ? 'currentColor' : 'none'} />
                    Active
                  </button>
                </div>

                {/* Rating Input */}
                <div className="flex flex-col gap-3 w-full xl:w-auto border-t xl:border-t-0 border-white/10 pt-6 xl:pt-0">
                  <span className="text-xs font-mono tracking-widest uppercase text-gray-400">Your Rating</span>
                  <div className="flex items-center gap-1.5 px-6 py-4 bg-dark/40 rounded-xl border border-white/5 shadow-inner">
                    {[1, 2, 3, 4, 5].map((idx) => {
                      const ratingVal = idx * 2;
                      const currentRating = entry?.rating || 0;
                      const isFilled = currentRating >= ratingVal - 1;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleRate(ratingVal)}
                          className="group focus:outline-none transition-transform hover:scale-[1.15]"
                          title={`Rate ${ratingVal}/10`}
                        >
                          <Star 
                            size={28} 
                            className={`transition-colors duration-300 ${isFilled ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]' : 'text-gray-600 group-hover:text-amber-400/60'}`} 
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
