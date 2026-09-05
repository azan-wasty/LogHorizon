import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import AuthModal from '../components/AuthModal';
import { content as contentApi } from '../api/client';
import { ShieldCheck, Layers, ArrowUpRight } from 'lucide-react';

const CATEGORY_COLORS = {
  Anime: '#f472b6',
  Manga: '#60a5fa',
  Movie: '#fbbf24',
  TV: '#34d399',
};

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function LandingPage({ onNavigate }) {
  const [authModal, setAuthModal] = useState(null);
  const [trailCards, setTrailCards] = useState([]);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const cardIndexRef = useRef(0);
  const mediaPoolRef = useRef([]);

  const { data: contentData } = useQuery({
    queryKey: ['landing-trail-media'],
    queryFn: () => contentApi.list({ limit: 60, offset: 0, sort: 'rating' }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const items = contentData?.content || [];
    const withCovers = items.filter((item) => !!item.coverImage);
    mediaPoolRef.current = shuffleArray(withCovers);
  }, [contentData]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const pool = mediaPoolRef.current;
      if (pool.length === 0) return;

      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 80) {
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        const randomMedia = pool[cardIndexRef.current % pool.length];
        cardIndexRef.current += 1;

        const newCard = {
          id: Date.now() + Math.random(),
          x: e.clientX,
          y: e.clientY,
          rotation: (Math.random() - 0.5) * 26,
          scale: 0.85 + Math.random() * 0.25,
          media: randomMedia,
        };

        setTrailCards((prev) => [...prev.slice(-12), newCard]);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleAuthSuccess = (user) => {
    setAuthModal(null);
    onNavigate(user.newUser ? 'onboarding' : 'dashboard');
  };

  return (
    <>
      <style>{`
        @keyframes trailSpawn {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3) rotate(var(--rot));
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(var(--sc)) rotate(var(--rot));
          }
          75% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -90px) scale(calc(var(--sc) * 0.85)) rotate(calc(var(--rot) + 8deg));
          }
        }

        .lh-landing {
          min-height: 100vh;
          background: var(--dark);
          color: var(--text-primary);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .lh-hero-title {
          font-family: var(--font-superhead);
          font-size: clamp(2.8rem, 12vw, 7.5rem);
          line-height: 0.95;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          max-width: 1050px;
          margin: 0 auto;
          pointer-events: none;
        }

        .lh-title-gradient {
          background: linear-gradient(90deg, #FFFFFF 25%, var(--accent-violet) 70%, var(--accent-amber) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .lh-trail-card {
          position: absolute;
          width: 130px;
          aspect-ratio: 2/3;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--charcoal);
          border: 1px solid var(--glass-border);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7), 0 0 25px rgba(147, 51, 234, 0.22);
          pointer-events: none;
          animation: trailSpawn 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          will-change: transform, opacity;
        }

        .lh-hero-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          width: 100%;
          max-width: 420px;
        }

        @media (max-width: 768px) {
          .lh-trail-card { display: none; }
          .lh-nav { 
            padding: 16px 20px !important; 
          }
          .lh-brand-text {
            font-size: 1.05rem !important;
          }
          .lh-nav-actions {
            gap: 10px !important;
          }
          .lh-nav-signin {
            font-size: 0.75rem !important;
            white-space: nowrap !important;
          }
          .lh-nav-getstarted {
            padding: 8px 16px !important;
            font-size: 0.75rem !important;
            white-space: nowrap !important;
          }
          .lh-hero-actions {
            flex-direction: column;
            padding: 0 16px;
            gap: 12px;
          }
          .lh-hero-actions button {
            width: 100%;
            justify-content: center;
          }
          .lh-footer { 
            padding: 20px !important; 
            flex-direction: column !important; 
            gap: 8px !important; 
            text-align: center; 
          }
        }
      `}</style>

      <div className="lh-landing">
        {/* Navigation */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '28px 48px',
            position: 'relative',
            zIndex: 30,
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(10,10,15,0.6)',
          }}
          className="lh-nav"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, var(--electric-purple), var(--accent-violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(147,51,234,0.4)', flexShrink: 0 }}>
              <Layers size={18} color="#fff" />
            </div>
            <span className="lh-brand-text" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              LOG<span style={{ color: 'var(--electric-purple)' }}>HORIZON</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} className="lh-nav-actions">
            <button
              className="lh-nav-signin"
              onClick={() => setAuthModal('login')}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              Sign In
            </button>
            <button
              className="btn-primary lh-nav-getstarted"
              onClick={() => setAuthModal('register')}
              style={{ padding: '10px 22px', fontSize: '0.8rem' }}
            >
              Get Started
            </button>
          </div>
        </nav>

        {/* Mouse Trail Posters Layer */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
          {trailCards.map((card) => {
            const catColor = CATEGORY_COLORS[card.media?.category] || 'var(--electric-purple)';
            return (
              <div
                key={card.id}
                className="lh-trail-card"
                style={{
                  left: `${card.x}px`,
                  top: `${card.y}px`,
                  '--rot': `${card.rotation}deg`,
                  '--sc': card.scale,
                }}
              >
                <img
                  src={card.media?.coverImage}
                  alt={card.media?.title || 'Media Item'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.2) 60%, transparent 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: 8,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.55rem', textTransform: 'uppercase', color: catColor, fontWeight: 700 }}>
                    {card.media?.category || 'Media'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.7rem', color: '#fff', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {card.media?.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hero Section */}
        <main
          style={{
            position: 'relative',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '32px 20px',
            margin: 'auto 0',
          }}
        >
          <h1 className="lh-hero-title" style={{ marginBottom: 32 }}>
            Log Your Taste <br />
            <span className="lh-title-gradient">All In One Place</span>
          </h1>

          <div className="lh-hero-actions">
            <button className="btn-primary" onClick={() => setAuthModal('register')}>
              Get Started <ArrowUpRight size={18} />
            </button>
            <button className="btn-ghost" onClick={() => setAuthModal('login')}>
              Explore Index
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer
          style={{
            position: 'relative',
            zIndex: 30,
            padding: '24px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-body)',
            fontSize: '0.7rem',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(10,10,15,0.6)',
            backdropFilter: 'blur(16px)',
          }}
          className="lh-footer"
        >
          <div style={{ color: 'var(--text-muted)' }}>LOGHORIZON PROTOCOL // v2.0</div>
          <div style={{ color: 'var(--text-muted)' }}>EST. 2026 // SPRING SPRINT</div>
        </footer>

        {authModal && (
          <AuthModal
            mode={authModal}
            onClose={() => setAuthModal(null)}
            onSwitch={(mode) => setAuthModal(mode)}
            onSuccess={handleAuthSuccess}
          />
        )}
      </div>
    </>
  );
}