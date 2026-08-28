import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Compass,
  User,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Hexagon,
  ChevronRight,
  Activity,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & picks' },
  { id: 'feed', label: 'Feed', icon: Activity, desc: 'Social stream' },
  { id: 'discover', label: 'Discover', icon: Compass, desc: 'Browse index' },
  { id: 'profile', label: 'My Profile', icon: User, desc: 'Library & stats' },
  { id: 'community', label: 'Community', icon: Users, desc: 'Events & members' },
];

function NavItem({ item, active, onClick, isCollapsed }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: isCollapsed ? 0 : 12,
        padding: isCollapsed ? '11px 0' : '11px 14px',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        borderRadius: 12,
        border: active ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
        background: active
          ? 'rgba(124,58,237,0.12)'
          : hovered
            ? 'rgba(255,255,255,0.04)'
            : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
      title={isCollapsed ? item.label : ''}
    >
      {/* Active glow */}
      {active && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(124,58,237,0.08) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Icon container */}
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: active
          ? 'rgba(124,58,237,0.2)'
          : hovered
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.04)',
        border: active ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.2s',
        boxShadow: active ? '0 0 12px rgba(124,58,237,0.3)' : 'none',
      }}>
        <Icon
          size={16}
          color={active ? '#7C3AED' : hovered ? '#d1d5db' : '#6b7280'}
          style={{ transition: 'color 0.2s' }}
        />
      </div>

      {!isCollapsed && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '0.82rem',
            color: active ? '#fff' : hovered ? '#e5e7eb' : '#9ca3af',
            transition: 'color 0.2s',
            lineHeight: 1,
            marginBottom: 2,
          }}>
            {item.label}
          </p>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.58rem',
            color: active ? 'rgba(124,58,237,0.8)' : '#4b5563',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            transition: 'color 0.2s',
          }}>
            {item.desc}
          </p>
        </div>
      )}

      {active && !isCollapsed && (
        <ChevronRight size={13} color="rgba(124,58,237,0.6)" style={{ flexShrink: 0 }} />
      )}
    </button>
  );
}

export default function Layout({ children, currentPage, onNavigate }) {
  const { user, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    logout();
    onNavigate('landing');
  };

  const handle = user?.username || 'user';
  const initial = handle[0]?.toUpperCase() || 'U';

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const Sidebar = () => (
    <aside 
      className="desktop-sidebar"
      style={{
        width: isCollapsed ? 80 : 240,
        height: '100vh',
        background: 'rgba(14,14,22,0.98)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Top gradient accent */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, #7C3AED, #22d3ee, #f472b6)', flexShrink: 0 }} />

      {/* Logo */}
      <div style={{
        padding: isCollapsed ? '20px 0' : '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isCollapsed ? 'center' : 'stretch',
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10, 
          marginBottom: isCollapsed ? 0 : 14,
          justifyContent: isCollapsed ? 'center' : 'flex-start'
        }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124,58,237,0.5)',
            flexShrink: 0,
          }}>
            <Hexagon size={18} color="#fff" fill="white" />
          </div>
          {!isCollapsed && (
            <div>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1.05rem',
                letterSpacing: '-0.03em',
                color: '#fff',
              }}>
                Log<span style={{ color: '#7C3AED' }}>Horizon</span>
              </span>
            </div>
          )}
        </div>

        {/* Live clock - hide when collapsed */}
        {!isCollapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399', animation: 'pulse 2s infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Online</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#9ca3af', lineHeight: 1.2 }}>{timeStr}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#4b5563', lineHeight: 1.2 }}>{dateStr}</p>
            </div>
          </div>
        )}
      </div>

      {/* User card */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: isCollapsed ? '10px 0' : '10px 12px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          background: 'rgba(124,58,237,0.06)',
          border: '1px solid rgba(124,58,237,0.12)',
          borderRadius: 12,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
          onClick={() => { onNavigate('profile'); setMobileOpen(false); }}
          title={isCollapsed ? `@${handle}` : ''}
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(124,58,237,0.4)' }} />
          ) : (
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(139,92,246,0.3))',
              border: '2px solid rgba(124,58,237,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '0.9rem',
              color: '#8B5CF6',
              flexShrink: 0,
              boxShadow: '0 0 12px rgba(124,58,237,0.3)',
            }}>
              {initial}
            </div>
          )}
          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: 2,
              }}>
                @{handle}
              </p>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                color: '#7C3AED',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                {isAdmin ? 'Administrator' : 'Member'}
              </p>
            </div>
          )}
          {!isCollapsed && <ChevronRight size={12} color="rgba(124,58,237,0.5)" />}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '14px 12px', overflowY: 'auto' }}>
        {!isCollapsed && (
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.55rem',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#374151',
            marginBottom: 8,
            paddingLeft: 4,
          }}>
            Navigation
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.id}
              item={item}
              active={currentPage === item.id}
              onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>

        {isAdmin && (
          <div style={{ marginTop: 20 }}>
            {!isCollapsed && (
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: '#374151',
                marginBottom: 8,
                paddingLeft: 4,
              }}>
                Systems
              </p>
            )}
            <NavItem
              item={{ id: 'admin', label: 'Content Studio', icon: ShieldCheck, desc: 'Admin panel' }}
              active={currentPage === 'admin'}
              onClick={() => { onNavigate('admin'); setMobileOpen(false); }}
              isCollapsed={isCollapsed}
            />
          </div>
        )}
      </nav>

      {/* Footer actions */}
      <div style={{
        padding: '12px 12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        flexShrink: 0,
        position: 'relative'
      }}>
        <button
          onClick={() => { onNavigate('onboarding'); setMobileOpen(false); }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: isCollapsed ? 0 : 10,
            padding: isCollapsed ? '9px 0' : '9px 14px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            borderRadius: 10,
            border: '1px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            color: '#6b7280',
          }}
          title={isCollapsed ? 'Preferences' : ''}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#9ca3af'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
        >
          <Settings size={15} color="currentColor" />
          {!isCollapsed && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.8rem' }}>Preferences</span>}
        </button>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: isCollapsed ? 0 : 10,
            padding: isCollapsed ? '9px 0' : '9px 14px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            borderRadius: 10,
            border: '1px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            color: 'rgba(248,113,113,0.6)',
          }}
          title={isCollapsed ? 'Sign Out' : ''}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(248,113,113,0.6)'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <LogOut size={15} color="currentColor" />
          {!isCollapsed && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.8rem' }}>Sign Out</span>}
        </button>

        {/* Retract Toggle symbol on the right edge */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="sidebar-toggle"
          style={{
            position: 'absolute',
            right: -12,
            top: -40,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#7C3AED',
            border: '3px solid #0f0f16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1001,
            boxShadow: '0 0 15px rgba(124,58,237,0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(124,58,237,0.4)'; }}
          title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
        >
          {isCollapsed ? <PanelLeftOpen size={10} color="#fff" /> : <PanelLeftClose size={10} color="#fff" />}
        </button>

        {!isCollapsed && (
          <div style={{ paddingTop: 10, paddingLeft: 4 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: '#2d2d3d', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              LogHorizon v2.0 · Spring '26
            </p>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'transparent', overflow: 'hidden', fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        
        @media (max-width: 1024px) {
          .main-content-area { padding-left: 0 !important; }
          .mobile-header { display: flex !important; }
          .mobile-menu-btn { display: flex !important; }
          .desktop-sidebar { transform: translateX(-100%); }
          .desktop-sidebar.mobile-open { transform: translateX(0) !important; }
          .sidebar-toggle { display: none !important; }
          .main-content-wrapper { padding: 24px 20px !important; }
        }
        @media (min-width: 1024px) {
          .mobile-header { border-bottom: none; background: transparent !important; height: 0 !important; overflow: hidden; }
          .mobile-nav { display: none !important; }
        }
      `}</style>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 98, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Sidebar — desktop always visible */}
      <div 
        className={`desktop-sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        paddingLeft: isCollapsed ? 80 : 240,
        transition: 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        paddingBottom: 70, // Space for mobile nav
      }} className="main-content-area">

        {/* Mobile header */}
        <header style={{
          height: 58,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(14,14,22,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }} className="mobile-header">
          <button
            onClick={() => setMobileOpen(true)}
            style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: 8, 
              padding: 8, 
              cursor: 'pointer', 
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="mobile-menu-btn"
          >
            <Menu size={20} color="#9ca3af" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Hexagon size={20} color="#7C3AED" fill="#7C3AED" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
              Log<span style={{ color: '#7C3AED' }}>Horizon</span>
            </span>
          </div>
          <button 
            onClick={() => onNavigate('profile')}
            style={{ 
              width: 32, height: 32, borderRadius: '50%', 
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <User size={16} color="#7C3AED" />
          </button>
        </header>

        <main 
          className="main-content-wrapper"
          style={{
            flex: 1,
            padding: '36px 40px',
            maxWidth: 1440,
            width: '100%',
            margin: '0 auto',
            animation: 'fadeUp 0.5s ease',
          }}
        >
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="mobile-nav" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 70,
          background: 'rgba(14,14,22,0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          zIndex: 90,
          animation: 'slideUp 0.3s ease-out'
        }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  color: active ? '#7C3AED' : '#6b7280',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                  transition: 'all 0.2s'
                }}>
                  <Icon size={20} />
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: active ? 700 : 500, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                  {item.label === 'Dashboard' ? 'Feed' : item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
