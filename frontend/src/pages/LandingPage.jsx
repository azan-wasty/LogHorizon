import { useState, useEffect, useRef } from 'react';
import AuthModal from '../components/AuthModal';
import { ShieldCheck, Hexagon, ArrowUpRight } from 'lucide-react';

const CATEGORY_COLORS = {
  Anime: '#f472b6',
  Manga: '#60a5fa',
  Movie: '#fbbf24',
  TV: '#34d399',
};

// High-resolution poster pool spawned along the mouse trajectory
const MEDIA_POOL = [
  { id: '1', title: 'Cyberpunk: Edgerunners', category: 'Anime', coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80' },
  { id: '2', title: 'Chainsaw Man', category: 'Manga', coverImage: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80' },
  { id: '3', title: 'Akira', category: 'Movie', coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80' },
  { id: '4', title: 'Dune: Part Two', category: 'Movie', coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80' },
  { id: '5', title: 'Berserk', category: 'Manga', coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80' },
  { id: '6', title: 'Arcane', category: 'TV', coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80' },
];

export default function LandingPage({ onNavigate }) {
  const [authModal, setAuthModal] = useState(null);
  const [trailCards, setTrailCards] = useState([]);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const cardIndexRef = useRef(0);

  // Mouse path poster trail generation
  useEffect(() => {
    const handleMouseMove = (e) => {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Spawn a new poster card every 80px traveled by cursor
      if (dist > 80) {
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        const randomMedia = MEDIA_POOL[cardIndexRef.current % MEDIA_POOL.length];
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
          font-size: clamp(3.2rem, 9.5vw, 7.5rem);
          line-height: 0.9;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          max-width: 1050px;
          margin: 0 auto;
          pointer-events: none;
        }

        .lh-title-gradient {
          background: linear-gradient(90deg, #FFFFFF, var(--accent-violet), var(--cyan));
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
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7), 0 0 25px rgba(124, 58, 237, 0.25);
          pointer-events: none;
          animation: trailSpawn 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          will-change: transform, opacity;
        }

        @media (max-width: 768px) {
          .lh-trail-card { display: none; }
          .lh-nav { padding: 20px !important; }
          .lh-footer { padding: 20px !important; flex-direction: column !important; gap: 16px !important; text-align: center; }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, var(--electric-purple), var(--accent-violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
              <Hexagon size={20} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
              LOG<span style={{ color: 'var(--electric-purple)' }}>HORIZON</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
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
              className="btn-primary"
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
            padding: '40px 24px',
            margin: 'auto 0',
          }}
        >


          <h1 className="lh-hero-title" style={{ marginBottom: 36 }}>
            Organize Your Taste <br />
            <span className="lh-title-gradient">All In One Place</span>
          </h1>

          <div style={{ display: 'flex', gap: 16 }}>
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