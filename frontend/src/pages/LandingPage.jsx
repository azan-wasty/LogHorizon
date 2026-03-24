import { useState, useEffect, useRef } from 'react';
import AuthModal from '../components/AuthModal';
import { 
  Search, 
  Zap, 
  Target, 
  Trophy, 
  Link as LinkIcon, 
  ChevronRight, 
  ShieldCheck,
  Hexagon,
  Sparkles,
  Flame,
  Gamepad2,
  BookOpen
} from 'lucide-react';

// Animated star field for that "WOW" factor
function StarField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random(),
      speed: Math.random() * 0.005 + 0.002,
    }));

    let raf;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed;
        if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 58, 237, ${s.alpha * 0.6})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

export default function LandingPage({ onNavigate }) {
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register'
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { icon: Flame, label: 'Anime', color: 'text-orange-400' },
    { icon: Sparkles, label: 'Fantasy', color: 'text-purple-400' },
    { icon: Gamepad2, label: 'Manga', color: 'text-blue-400' },
    { icon: BookOpen, label: 'Light Novels', color: 'text-emerald-400' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    onNavigate('discover');
  };

  const handleAuthSuccess = (user) => {
    setAuthModal(null);
    onNavigate(user.newUser ? 'onboarding' : 'discover');
  };

  return (
    <div className="min-h-screen bg-dark text-white selection:bg-electric-purple selection:text-white relative flex flex-col overflow-hidden font-body">
      <StarField />

      {/* Dynamic Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-[600px] h-[600px] bg-electric-purple/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-accent-violet/5 blur-[100px] rounded-full" />
      </div>

      {/* Top Navigation */}
      <nav className="relative z-[50] flex items-center justify-between px-8 py-6 backdrop-blur-xl border-b border-white/5 bg-dark/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-electric-purple to-accent-violet flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            <Hexagon className="text-white w-6 h-6" fill="white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tighter">
            Log<span className="text-electric-purple">Horizon</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4 lg:gap-8">
          <button 
            onClick={() => setAuthModal('login')}
            className="text-sm font-display font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={() => setAuthModal('register')}
            className="bg-white text-black px-6 py-2.5 rounded-full font-display font-bold text-sm hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-electric-purple/10 border border-electric-purple/20 text-[10px] font-mono font-bold uppercase tracking-widest text-electric-purple mb-10 shadow-[0_0_15px_rgba(124,58,237,0.1)]">
            <ShieldCheck size={14} />
            The Ultimate Digital Frontier
          </div>
        </div>

        <h1 className="text-5xl lg:text-8xl font-display font-bold mb-8 tracking-tighter leading-[0.9] animate-fade-up" style={{ animationDelay: '100ms' }}>
          Discover the <br /> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-purple via-accent-violet to-cyan-400">Void Codex.</span>
        </h1>

        <p className="text-gray-400 text-lg lg:text-xl max-w-2xl mb-12 font-body italic animate-fade-up leading-relaxed" style={{ animationDelay: '200ms' }}>
          A cross-media sanctuary for those who seek the extraordinary. Anime, Manga, and community-driven discovery — all in one dashboard.
        </p>

        {/* Global Search Bar */}
        <form 
          onSubmit={handleSearch}
          className="w-full max-w-2xl relative mb-16 animate-fade-up"
          style={{ animationDelay: '300ms' }}
        >
          <div className="absolute inset-0 bg-electric-purple/10 blur-[40px] -z-10" />
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-electric-purple transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Search the index..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-lg font-body focus:bg-white/[0.08] focus:border-electric-purple/40 outline-none transition-all shadow-2xl backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-electric-purple rounded-xl text-white hover:bg-accent-violet transition-all shadow-lg active:scale-90"
            >
              <ChevronRight size={20} strokeWidth={3} />
            </button>
          </div>
        </form>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3 mb-24 animate-fade-up" style={{ animationDelay: '400ms' }}>
          {categories.map((cat, i) => (
            <button 
              key={i}
              onClick={() => setAuthModal('register')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all font-display text-sm font-semibold tracking-wide group"
            >
              <cat.icon size={16} className={`${cat.color} group-hover:scale-110 transition-transform`} />
              <span className="text-gray-400 group-hover:text-white">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full animate-fade-up" style={{ animationDelay: '500ms' }}>
          {[
            { icon: Target, title: 'Neural Curation', desc: 'Predictive algorithms that match your taste profile across all media sectors.' },
            { icon: Trophy, title: 'Elite Community', desc: 'Participate in secure tournaments and community-led events.' },
            { icon: LinkIcon, title: 'Discord Sync', desc: 'Seamlessly connect with your squad and join verified social hubs.' },
          ].map((feat, i) => (
            <div key={i} className="glass-panel p-10 text-left hover:border-electric-purple/20 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-electric-purple/10 flex items-center justify-center text-electric-purple mb-6 group-hover:bg-electric-purple group-hover:text-white transition-all">
                <feat.icon size={24} />
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-3 tracking-tight">{feat.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-dark/40 backdrop-blur-xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-600">
           LOGHORIZON PROTOCOL // v2.0-STABLE
        </p>
        <div className="flex gap-8 text-[10px] font-mono uppercase tracking-widest text-gray-700">
          <button className="hover:text-white transition-colors">Documentation</button>
          <button className="hover:text-white transition-colors">Terms of Entry</button>
          <button className="hover:text-white transition-colors">Privacy Shield</button>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-600">
          EST. 2026 // SPRING SPRINT
        </p>
      </footer>

      {/* Authentication */}
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={(mode) => setAuthModal(mode)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
