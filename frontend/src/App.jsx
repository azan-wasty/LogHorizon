import { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import DiscoverPage from './pages/DiscoverPage';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import OnboardingPage from './pages/OnboardingPage';
import AdminPage from './pages/AdminPage';
import ContentPage from './pages/ContentPage';
import Layout from './components/Layout';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading, isAdmin } = useAuth();

  const [currentPage, setCurrentPage] = useState('landing');
  const [historyStack, setHistoryStack] = useState([]);

  // ✅ Custom navigate (push to history)
  const navigate = (page) => {
    setHistoryStack(prev => [...prev, currentPage]);
    setCurrentPage(page);
  };

  // ✅ Custom back
  const goBack = () => {
    setHistoryStack(prev => {
      if (prev.length === 0) return prev;

      const lastPage = prev[prev.length - 1];
      setCurrentPage(lastPage);
      return prev.slice(0, -1);
    });
  };

  // Handle initial page based on auth state
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (currentPage === 'landing') {
          setCurrentPage('dashboard');
        }
      } else {
        setCurrentPage('landing');
      }
    }
  }, [user, loading]);

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
    if (currentPage.startsWith('content/')) {
      const id = parseInt(currentPage.split('/')[1]);
      return <ContentPage id={id} goBack={goBack} />;
    }

    switch (currentPage) {
      case 'landing':
        return <LandingPage onNavigate={navigate} />;
      case 'onboarding':
        return <OnboardingPage onComplete={() => navigate('dashboard')} />;
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case 'discover':
        return <DiscoverPage onNavigate={navigate} />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} />;
      case 'community':
        return <CommunityPage />;
      case 'admin':
        return isAdmin ? <AdminPage /> : <DashboardPage onNavigate={navigate} />;
      default:
        return <LandingPage onNavigate={navigate} />;
    }
  };

  const isFullPage = ['landing', 'onboarding'].includes(currentPage);

  if (isFullPage) {
    return renderPage();
  }

  return (
    <Layout currentPage={currentPage} onNavigate={navigate}>
      {renderPage()}
    </Layout>
  );
}

export default App;