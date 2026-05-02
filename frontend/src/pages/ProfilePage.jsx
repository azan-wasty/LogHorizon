import { useState, useEffect } from 'react';
import { me as meApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useLibrary } from '../hooks/useLibrary';
import { useToast } from '../hooks/useToast';
import {
  Camera, Edit3, Bookmark, PlayCircle, CheckCircle2, LayoutGrid, Search, ExternalLink, ChevronRight, Loader2, User, Flame, Compass, Hexagon, Star, Zap, Sparkles
} from 'lucide-react';

const STAT_COLORS = {
  PLANNING: 'text-electric-purple bg-electric-purple/10 border-electric-purple/20',
  COMPLETED: 'text-spotify-green bg-spotify-green/10 border-spotify-green/20',
  CURRENT: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
};

export default function ProfilePage({ onNavigate }) {
  const { user, achievements, refetch } = useAuth();
  const { library, loading: libLoading, removeItem } = useLibrary();
  const toast = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (user && !isEditing) {
      setBioInput(user.bio || '');
      setAvatarUrlInput(user.avatarUrl || '');
    }
  }, [user, isEditing]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await meApi.update({ bio: bioInput, avatarUrl: avatarUrlInput });
      await refetch();
      toast('Profile updated successfully', 'success');
      setIsEditing(false);
    } catch (err) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredLibrary = filter === 'ALL' 
    ? library 
    : library.filter(item => item.status === filter);

  if (libLoading || !user) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-10 h-10 text-electric-purple animate-spin" />
      </div>
    );
  }

  const planningCount = library.filter(i => i.status === 'PLANNING').length;
  const completedCount = library.filter(i => i.status === 'COMPLETED').length;
  const currentCount = library.filter(i => i.status === 'CURRENT').length;

  return (
    <div className="space-y-12">
      {/* Dynamic Profile Header */}
      <section className="relative overflow-hidden rounded-3xl p-1 bg-gradient-to-br from-electric-purple/20 via-dark to-accent-violet/20 shadow-[0_0_40px_rgba(124,58,237,0.15)] group animate-fade-up">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-electric-purple/30 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="bg-dark/80 backdrop-blur-xl rounded-[22px] p-8 md:p-12 border border-white/5 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar Section */}
            <div className="relative group/avatar cursor-pointer flex-shrink-0" onClick={() => !isEditing && setIsEditing(true)}>
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr from-electric-purple to-cyan-400 p-1 shadow-[0_0_30px_rgba(124,58,237,0.4)] transition-transform duration-500 hover:scale-105 hover:rotate-3">
                <div className="w-full h-full rounded-full bg-dark overflow-hidden flex items-center justify-center relative">
                  {avatarUrlInput && !isEditing ? (
                    <img src={avatarUrlInput} alt="Avatar" className="w-full h-full object-cover" />
                  ) : user?.avatarUrl && !isEditing ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={64} className="text-gray-500" />
                  )}
                  
                  {!isEditing && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                      <Camera size={24} className="text-white mb-1" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white">Edit Profile</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left space-y-4">
              {isEditing ? (
                <div className="space-y-4 animate-fade-up">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">Avatar URL</label>
                    <input 
                      type="text" 
                      value={avatarUrlInput} 
                      onChange={e => setAvatarUrlInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-sm focus:border-electric-purple outline-none transition-colors"
                      placeholder="https://example.com/avatar.png"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">Bio</label>
                    <textarea 
                      value={bioInput} 
                      onChange={e => setBioInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-body text-sm focus:border-electric-purple outline-none transition-colors resize-none"
                      rows="3"
                      placeholder="Tell us about your media interests..."
                    ></textarea>
                  </div>
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <button 
                      onClick={handleSaveProfile} 
                      disabled={saving}
                      className="bg-electric-purple text-white px-6 py-2 rounded-lg font-display font-bold text-sm shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:bg-electric-purple/80 transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Profile'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setBioInput(user.bio || '');
                        setAvatarUrlInput(user.avatarUrl || '');
                      }}
                      className="px-6 py-2 rounded-lg font-display font-bold text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h1 className="text-4xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
                      {user.username}
                    </h1>
                    <p className="text-sm font-mono text-electric-purple uppercase tracking-widest mt-1">Level 1 • Media Connoisseur</p>
                  </div>
                  
                  <p className="text-gray-300 font-body leading-relaxed max-w-2xl text-lg italic">
                    "{user.bio || 'A mysterious individual exploring the vast horizons of media.'}"
                  </p>
                  
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                  >
                    <Edit3 size={14} /> Edit Profile
                  </button>
                </div>
              )}
              
              {/* Quick Stats */}
              {!isEditing && (
                <div className="flex items-center justify-center md:justify-start gap-4 pt-4">
                  <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm flex flex-col items-center">
                    <span className="text-2xl font-display font-bold text-white">{completedCount}</span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Completed</span>
                  </div>
                  <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm flex flex-col items-center">
                    <span className="text-2xl font-display font-bold text-white">{currentCount}</span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Watching</span>
                  </div>
                  <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm flex flex-col items-center">
                    <span className="text-2xl font-display font-bold text-white">{planningCount}</span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Watchlist</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Achievements ── */}
      {achievements && achievements.length > 0 && (
        <section className="space-y-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3">
                <Sparkles className="text-amber-400" size={22} fill="currentColor" />
                <h2 className="text-2xl font-display font-bold text-white tracking-tight">Unlocked Badges</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                    {achievements.length} Earned
                </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {achievements.map((ach) => (
                    <div key={ach.title} className="premium-card p-4 flex gap-4 items-center group hover:border-amber-500/30 transition-all cursor-default">
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
                            <Star size={20} fill="currentColor" />
                        </div>
                        <div>
                            <h4 className="font-display font-bold text-sm text-white group-hover:text-amber-400 transition-colors">{ach.title}</h4>
                            <p className="text-[10px] text-gray-400 font-mono tracking-wide mt-0.5">{ach.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      )}

      {/* Media Collection Section */}
      <section className="space-y-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LayoutGrid className="text-electric-purple" />
            <h2 className="text-2xl font-display font-bold text-white tracking-tight">Media Arsenal</h2>
          </div>
          
          <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5 self-start backdrop-blur-sm">
            {[
              { id: 'ALL', label: 'All', icon: LayoutGrid },
              { id: 'PLANNING', label: 'Watchlist', icon: Bookmark },
              { id: 'CURRENT', label: 'In Progress', icon: PlayCircle },
              { id: 'COMPLETED', label: 'Masterpieces', icon: CheckCircle2 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-display text-xs font-bold uppercase tracking-widest transition-all duration-300 ${filter === tab.id 
                  ? 'bg-electric-purple text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredLibrary.length === 0 ? (
          <div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm">
            <div className="w-20 h-20 bg-dark rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <Search className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 font-body text-lg mb-2">No media found in this section.</p>
            <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest mb-8">Your {filter.toLowerCase()} archive is currently empty.</p>
            <button 
              onClick={() => onNavigate('discover')}
              className="bg-electric-purple text-white px-8 py-3 rounded-xl font-display font-bold text-sm hover:scale-105 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            >
              Explore Horizon
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLibrary.map((entry, i) => {
              const item = entry.content;
              const statusStyle = STAT_COLORS[entry.status] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
              return (
                <div 
                  key={entry.id} 
                  onClick={() => onNavigate(`content/${item.id}`)}
                  className="group relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer animate-fade-up transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(124,58,237,0.15)]"
                  style={{ animationDelay: `${(i % 10) * 50}ms` }}
                >
                  <div className="aspect-[3/4] w-full relative">
                    {item.coverImage ? (
                      <img src={item.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.title} />
                    ) : (
                      <div className="w-full h-full bg-dark flex flex-col items-center justify-center text-gray-700">
                        <Hexagon size={48} className="mb-4 opacity-50" />
                        <span className="text-[10px] font-mono tracking-widest">NO SIGNAL</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                    
                    {/* Tags overlay */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className={`px-2.5 py-1 rounded-md border text-[9px] font-mono font-bold uppercase tracking-widest backdrop-blur-md ${statusStyle}`}>
                        {entry.status === 'PLANNING' ? 'Watchlist' : entry.status}
                      </span>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/20 border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                      <Search size={14} className="rotate-45" />
                    </button>
                    
                    {/* Content Info */}
                    <div className="absolute bottom-0 left-0 w-full p-5 flex flex-col justify-end transform transition-transform duration-300">
                      <span className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-widest mb-1.5 line-clamp-1">
                        {item.category}
                      </span>
                      <h3 className="font-display font-bold text-white text-lg leading-tight line-clamp-2 group-hover:text-electric-purple transition-colors mb-2">
                        {item.title}
                      </h3>
                      {item.rating && (
                        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono font-bold">
                          <Star size={12} fill="currentColor" />
                          {item.rating}
                        </div>
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
