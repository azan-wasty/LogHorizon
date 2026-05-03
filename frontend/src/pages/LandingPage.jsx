import { useState, useEffect, useRef } from 'react';
import { GridScan } from '../components/GridScan';
import AuthModal from '../components/AuthModal';
import {
  Search, Zap, Target, Trophy, Link as LinkIcon,
  ChevronRight, ShieldCheck, Hexagon, Sparkles, Flame, Gamepad2
} from 'lucide-react';

function StarField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.5, alpha: Math.random(), speed: Math.random() * 0.005 + 0.002,
    }));
    let raf;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed;
        if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 58, 237, ${s.alpha * 0.6})`; ctx.fill();
      });
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

export default function LandingPage({ onNavigate }) {
  const [authModal, setAuthModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { icon: Flame, label: 'Anime', color: '#f472b6' },
    { icon: Sparkles, label: 'Fantasy', color: '#8B5CF6' },
    { icon: Gamepad2, label: 'Manga', color: '#60a5fa' },
  ];

  const features = [
    { icon: Target, title: 'Neural Curation', desc: 'Predictive algorithms that match your taste profile across all media sectors.' },
    { icon: Trophy, title: 'Elite Community', desc: 'Participate in secure tournaments and community-led events.' },
    { icon: LinkIcon, title: 'Discord Sync', desc: 'Seamlessly connect with your squad and join verified social hubs.' },
  ];

  const handleSearch = (e) => { e.preventDefault(); onNavigate('discover'); };
  const handleAuthSuccess = (user) => { setAuthModal(null); onNavigate(user.newUser ? 'onboarding' : 'discover'); };

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes gradientShift { 0% { background-position:0% 50%; } 50% { background-position:100% 50%; } 100% { background-position:0% 50%; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--dark)', color: 'var(--text-primary)', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>
        <StarField />

        {/* Grid Scan */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          <GridScan sensitivity={0.55} lineThickness={1} linesColor="#7f67ac" gridScale={0.1} scanColor="#bc7cfc" scanOpacity={0.4} enablePost bloomIntensity={0.6} chromaticAberration={0.002} noiseIntensity={0.01} />
        </div>

        {/* Ambient blobs */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}>
          <div style={{ position: 'absolute', top: '10%', left: '5%', width: 600, height: 600, background: 'rgba(124,58,237,0.1)', filter: 'blur(120px)', borderRadius: '50%', animation: 'pulse 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 500, height: 500, background: 'rgba(139,92,246,0.05)', filter: 'blur(100px)', borderRadius: '50%' }} />
        </div>

        {/* Navigation */}
        <nav style={{ position: 'relative', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(12,12,18,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
              <Hexagon size={22} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>
              Log<span style={{ color: '#7C3AED' }}>Horizon</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setAuthModal('login')} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
              Sign In
            </button>
            <button onClick={() => setAuthModal('register')} style={{
              padding: '10px 24px', borderRadius: 99, background: '#fff', color: '#000',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem',
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(255,255,255,0.1)',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'none'; }}>
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero */}
        <main style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 60px', textAlign: 'center', zIndex: 10 }}>

          {/* Badge */}
          <div style={{ animation: 'fadeUp 0.4s ease', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 99, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', marginBottom: 36, boxShadow: '0 0 15px rgba(124,58,237,0.1)' }}>
            <ShieldCheck size={14} color="#7C3AED" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7C3AED' }}>The Ultimate Digital Frontier</span>
          </div>

          {/* Heading */}
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.8rem, 8vw, 5.5rem)', letterSpacing: '-0.04em', lineHeight: 0.9, marginBottom: 28, animation: 'fadeUp 0.5s 0.1s ease both' }}>
            Discover the <br />
            <span style={{ background: 'linear-gradient(90deg, #7C3AED, #8B5CF6, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% auto', animation: 'gradientShift 4s ease infinite' }}>Void Codex.</span>
          </h1>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.1rem', color: '#6b7280', maxWidth: 560, marginBottom: 48, fontStyle: 'italic', lineHeight: 1.7, animation: 'fadeUp 0.5s 0.2s ease both' }}>
            A cross-media sanctuary for those who seek the extraordinary. Anime, Manga, and community-driven discovery — all in one dashboard.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ width: '100%', maxWidth: 580, position: 'relative', marginBottom: 56, animation: 'fadeUp 0.5s 0.3s ease both' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(124,58,237,0.1)', filter: 'blur(40px)', zIndex: -1 }} />
            <div style={{ position: 'relative' }}>
              <Search size={20} color="#6b7280" style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Search the index..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '18px 60px 18px 56px', fontSize: '1.05rem', fontFamily: 'var(--font-body)', color: '#fff', outline: 'none', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              <button type="submit" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 12, background: '#7C3AED', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#8B5CF6'} onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}>
                <ChevronRight size={20} strokeWidth={3} />
              </button>
            </div>
          </form>

          {/* Category pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 80, animation: 'fadeUp 0.5s 0.4s ease both' }}>
            {categories.map((cat, i) => (
              <button key={i} onClick={() => setAuthModal('register')} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600,
                color: '#9ca3af', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#9ca3af'; }}>
                <cat.icon size={16} color={cat.color} />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 900, width: '100%', animation: 'fadeUp 0.5s 0.5s ease both' }}>
            {features.map((feat, i) => (
              <div key={i} style={{
                padding: '36px 28px', borderRadius: 20,
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'left', transition: 'all 0.3s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, transition: 'all 0.3s' }}>
                  <feat.icon size={22} color="#7C3AED" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: '#fff', marginBottom: 10, letterSpacing: '-0.02em' }}>{feat.title}</h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer style={{ position: 'relative', zIndex: 10, padding: '36px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20, background: 'rgba(12,12,18,0.4)', backdropFilter: 'blur(20px)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.25em', color: '#374151' }}>LOGHORIZON PROTOCOL // v2.0-STABLE</p>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Documentation', 'Terms of Entry', 'Privacy Shield'].map(t => (
              <button key={t} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#374151', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#374151'}>
                {t}
              </button>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.25em', color: '#374151' }}>EST. 2026 // SPRING SPRINT</p>
        </footer>

        {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSwitch={(mode) => setAuthModal(mode)} onSuccess={handleAuthSuccess} />}
      </div>
    </>
  );
}