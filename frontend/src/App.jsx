import { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import DiscoverPage from './pages/DiscoverPage';
import LibraryPage from './pages/LibraryPage';
import CommunityPage from './pages/CommunityPage';
import OnboardingPage from './pages/OnboardingPage';
import AdminPage from './pages/AdminPage';
import Layout from './components/Layout';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');

  // Handle initial page based on auth state
  useEffect(() => {
    if (!loading) {
      if (user) {
        // If logged in and on landing, jump to dashboard. 
        // But don't block other pages.
        if (currentPage === 'landing') {
          setCurrentPage('dashboard');
        }
      } else {
        setCurrentPage('landing');
      }
    }
  }, [user, loading, !!user]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--void)'
      }}>
        <div style={{
          width: 40, height: 40,
          border: '2px solid var(--violet)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onNavigate={setCurrentPage} />;
      case 'onboarding':
        return <OnboardingPage onComplete={() => setCurrentPage('dashboard')} />;
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'discover':
        return <DiscoverPage />;
      case 'library':
        return <LibraryPage onNavigate={setCurrentPage} />;
      case 'community':
        return <CommunityPage />;
      case 'admin':
        return isAdmin ? <AdminPage /> : <DashboardPage onNavigate={setCurrentPage} />;
      default:
        return <LandingPage onNavigate={setCurrentPage} />;
    }
  };

  const isFullPage = ['landing', 'onboarding'].includes(currentPage);

  if (isFullPage) {
    return renderPage();
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;