import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Compass, 
  Library, 
  Users, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Hexagon
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'library', label: 'My Library', icon: Library },
  { id: 'community', label: 'Community', icon: Users },
];

export default function Layout({ children, currentPage, onNavigate }) {
  const { user, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    onNavigate('landing');
  };

  return (
    <div className="flex min-h-screen bg-dark overflow-hidden font-body">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 z-[99] backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-charcoal border-r border-white/5 flex flex-col z-[100] transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-purple to-accent-violet flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)]">
              <Hexagon className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">
              Log<span className="text-electric-purple">Horizon</span>
            </span>
          </div>
        </div>

        {/* User context info */}
        <div className="p-4 mx-4 my-4 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-electric-purple/20 to-accent-violet/20 flex items-center justify-center text-electric-purple font-display font-bold border border-electric-purple/30">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                {user?.role || 'User'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <p className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-gray-500">Platform</p>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
              className={`nav-item w-full ${currentPage === item.id ? 'nav-item-active' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}

          {isAdmin && (
            <div className="pt-4">
              <p className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-gray-500">Systems</p>
              <button
                onClick={() => { onNavigate('admin'); setMobileOpen(false); }}
                className={`nav-item w-full ${currentPage === 'admin' ? 'nav-item-active' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <ShieldCheck size={18} />
                Content Studio
              </button>
            </div>
          )}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/5 space-y-1">
          <button
            onClick={() => { onNavigate('preferences'); setMobileOpen(false); }}
            className={`nav-item w-full ${currentPage === 'preferences' ? 'nav-item-active' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Settings size={18} />
            Preferences
          </button>
          <button
            onClick={handleLogout}
            className="nav-item w-full text-red-400/80 hover:text-red-400 hover:bg-red-400/10"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <header className="h-16 flex items-center px-6 border-b border-white/5 bg-dark/50 backdrop-blur-md sticky top-0 z-[50] lg:hidden">
          <button 
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 text-gray-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <div className="flex-1 text-center">
             <span className="font-display font-bold text-lg tracking-tight text-white">
              Log<span className="text-electric-purple">Horizon</span>
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          <div className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
