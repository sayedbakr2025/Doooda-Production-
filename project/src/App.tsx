import { supabase } from './lib/supabaseClient';

if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
}

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { InstitutionAuthProvider } from './contexts/InstitutionAuthContext';
import { AffiliateAuthProvider } from './contexts/AffiliateAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import LanguageSelector from './components/LanguageSelector';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import ProjectWorkspace from './pages/ProjectWorkspace';
import LoglineEditor from './pages/LoglineEditor';
import PlotEditor from './pages/PlotEditor';
import ChapterView from './pages/ChapterView';
import SceneEditor from './pages/SceneEditor';
import AdminDashboard from './pages/AdminDashboard';
import Academy from './pages/Academy';
import AcademyCourse from './pages/AcademyCourse';
import AcademyLesson from './pages/AcademyLesson';
import AcademyCertificate from './pages/AcademyCertificate';
import Community from './pages/Community';
import CommunityTopic from './pages/CommunityTopic';
import Competitions from './pages/Competitions';
import NotificationsPage from './pages/NotificationsPage';
import Partners from './pages/Partners';
import PartnerApply from './pages/PartnerApply';
import PartnerLogin from './pages/PartnerLogin';
import PartnerDashboard from './pages/PartnerDashboard';
import AffiliateApply from './pages/AffiliateApply';
import AffiliateLogin from './pages/AffiliateLogin';
import AffiliateDashboard from './pages/AffiliateDashboard';
import DooodaTrigger from './components/doooda/DooodaTrigger';
import DooodaChatPanel from './components/doooda/DooodaChatPanel';

const AUTH_PATHS = ['/login', '/signup'];
const ADMIN_PATHS = ['/admin/login', '/admin/dashboard'];
const PARTNER_PATHS = ['/partners', '/partners/apply', '/partners/login', '/partners/dashboard', '/affiliate', '/affiliate/apply', '/affiliate/login', '/affiliate/dashboard'];

function useAffiliateRefTracking() {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref) return;

    trackedRef.current = true;
    sessionStorage.setItem('doooda_ref', ref);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    fetch(`${supabaseUrl}/functions/v1/affiliate-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
      body: JSON.stringify({
        action: 'track_click',
        referral_code: ref,
        ip_address: null,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        landing_page: window.location.pathname,
        country: null,
      }),
    }).catch(() => {});

    fetch(`${supabaseUrl}/functions/v1/track-referral-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
      body: JSON.stringify({ referral_code: ref }),
    }).catch(() => {});
  }, []);
}

function AppContent() {
  useAffiliateRefTracking();
  const location = useLocation();
  const showLanguageSelector = AUTH_PATHS.includes(location.pathname);
  const isPublic = location.pathname === '/' || AUTH_PATHS.includes(location.pathname) || PARTNER_PATHS.some(p => location.pathname.startsWith(p));
  const showDoooda = !isPublic && !ADMIN_PATHS.includes(location.pathname);

  return (
    <>
      {showLanguageSelector && <LanguageSelector />}
      {showDoooda && <DooodaTrigger />}
      {showDoooda && <DooodaChatPanel />}
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route path="/admin/login" element={<Login />} />

        <Route path="/partners" element={<Partners />} />
        <Route path="/partners/apply" element={<PartnerApply />} />
        <Route path="/partners/login" element={<PartnerLogin />} />
        <Route path="/partners/dashboard" element={<PartnerDashboard />} />

        <Route path="/affiliate" element={<AffiliateApply />} />
        <Route path="/affiliate/apply" element={<AffiliateApply />} />
        <Route path="/affiliate/login" element={<AffiliateLogin />} />
        <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/academy" element={<Academy />} />
          <Route path="/academy/course/:id" element={<AcademyCourse />} />
          <Route path="/academy/lesson/:id" element={<AcademyLesson />} />
          <Route path="/academy/certificate/:id" element={<AcademyCertificate />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/topic/:id" element={<CommunityTopic />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/inbox" element={<NotificationsPage />} />
          <Route path="/projects/:id" element={<ProjectWorkspace />} />
          <Route path="/projects/:projectId/plot" element={<PlotEditor />} />
          <Route path="/projects/:projectId/logline" element={<LoglineEditor />} />
          <Route path="/projects/:projectId/chapters/:chapterId" element={<ChapterView />} />
          <Route path="/projects/:projectId/chapters/:chapterId/scenes/:sceneId" element={<SceneEditor />} />
        </Route>

        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <LanguageProvider>
          <InstitutionAuthProvider>
            <AffiliateAuthProvider>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </AffiliateAuthProvider>
          </InstitutionAuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
