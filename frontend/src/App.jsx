import { useState, useEffect, useMemo } from 'react';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import DiscoverPage from './pages/DiscoverPage';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import OnboardingPage from './pages/OnboardingPage';
import AdminPage from './pages/AdminPage';
import ContentPage from './pages/ContentPage';
import Layout from './components/Layout';
import Hyperspeed from './components/Hyperspeed';
import { useAuth } from './hooks/useAuth';

const HYPERSPEED_OPTIONS = {
  distortion: 'turbulentDistortion',
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 80],
  movingCloserSpeed: [-120, -160],
  carLightsLength: [400 * 0.03, 400 * 0.2],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0xffffff,
    brokenLines: 0xffffff,
    leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
    rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
    sticks: 0x03b3c3,
  }
};

function App() {
  const { user, loading, isAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');
  const [historyStack, setHistoryStack] = useState([]);

  const navigate = (page) => {
    setHistoryStack(prev => [...prev, currentPage]);
    setCurrentPage(page);
  };

  const goBack = () => {
    setHistoryStack(prev => {
      if (prev.length === 0) return prev;
      const lastPage = prev[prev.length - 1];
      setCurrentPage(lastPage);
      return prev.slice(0, -1);
    });
  };

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (currentPage === 'landing') setCurrentPage('dashboard');
      } else {
        setCurrentPage('landing');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--void)', overflow: 'hidden' }}>
        <Hyperspeed effectOptions={HYPERSPEED_OPTIONS} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          zIndex: 10,
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
      </div>
    );
  }

  const renderPage = () => {
    if (currentPage.startsWith('content/')) {
      const id = parseInt(currentPage.split('/')[1]);
      return <ContentPage id={id} goBack={goBack} />;
    }
    switch (currentPage) {
      case 'landing': return <LandingPage onNavigate={navigate} />;
      case 'onboarding': return <OnboardingPage onComplete={() => navigate('dashboard')} />;
      case 'dashboard': return <DashboardPage onNavigate={navigate} />;
      case 'discover': return <DiscoverPage onNavigate={navigate} />;
      case 'profile': return <ProfilePage onNavigate={navigate} />;
      case 'community': return <CommunityPage onNavigate={navigate} />;
      case 'admin': return isAdmin ? <AdminPage /> : <DashboardPage onNavigate={navigate} />;
      default: return <LandingPage onNavigate={navigate} />;
    }
  };

  const isFullPage = ['landing', 'onboarding'].includes(currentPage);
  if (isFullPage) return renderPage();

  return (
    <Layout currentPage={currentPage} onNavigate={navigate}>
      {renderPage()}
    </Layout>
  );
}

export default App;