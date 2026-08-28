import { useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import FeedPage from './pages/FeedPage';
import DiscoverPage from './pages/DiscoverPage';
import ProfilePage from './pages/ProfilePage';
import AchievementsPage from './pages/AchievementsPage';
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

function pageToPath(page) {
  if (page.startsWith('content/')) {
    const id = page.split('/')[1];
    return `/content/${id}`;
  }
  const map = {
    landing: '/',
    onboarding: '/onboarding',
    dashboard: '/dashboard',
    feed: '/feed',
    discover: '/discover',
    profile: '/profile',
    achievements: '/profile/achievements',
    community: '/community',
    admin: '/admin',
  };
  return map[page] || '/';
}

function useLegacyNavigate() {
  const navigate = useNavigate();
  return (page) => navigate(pageToPath(page));
}

function pathToPage(pathname) {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/feed')) return 'feed';
  if (pathname.startsWith('/discover')) return 'discover';
  if (pathname.startsWith('/profile/achievements')) return 'achievements';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/onboarding')) return 'onboarding';
  if (pathname.startsWith('/content/')) return 'content';
  return 'landing';
}

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function ContentRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <ContentPage id={Number(id)} goBack={() => navigate(-1)} />;
}

function AppShell({ children }) {
  const location = useLocation();
  const legacyNavigate = useLegacyNavigate();
  const currentPage = useMemo(() => pathToPage(location.pathname), [location.pathname]);
  return (
    <Layout currentPage={currentPage} onNavigate={legacyNavigate}>
      {children}
    </Layout>
  );
}

function App() {
  const { user, loading } = useAuth();
  const legacyNavigate = useLegacyNavigate();

  if (loading) {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--void)', overflow: 'hidden' }}>
        <Hyperspeed effectOptions={HYPERSPEED_OPTIONS} />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <LandingPage onNavigate={legacyNavigate} />}
      />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage onComplete={() => legacyNavigate('dashboard')} />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AppShell>
              <DashboardPage onNavigate={legacyNavigate} />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/feed"
        element={
          <RequireAuth>
            <AppShell>
              <FeedPage onNavigate={legacyNavigate} />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/discover"
        element={
          <RequireAuth>
            <AppShell>
              <DiscoverPage onNavigate={legacyNavigate} />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <AppShell>
              <ProfilePage onNavigate={legacyNavigate} />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/profile/achievements"
        element={
          <RequireAuth>
            <AppShell>
              <AchievementsPage onNavigate={legacyNavigate} />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/community"
        element={
          <RequireAuth>
            <AppShell>
              <CommunityPage onNavigate={legacyNavigate} />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AppShell>
                <AdminPage />
              </AppShell>
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/content/:id"
        element={
          <RequireAuth>
            <AppShell>
              <ContentRoute />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

export default App;