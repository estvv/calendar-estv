import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from './utils/auth';
import { SchedulesProvider } from './contexts/SchedulesContext';
import { LoginPage } from './components/auth/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { SchedulePage } from './pages/SchedulePage';
import { SharedPage } from './pages/SharedPage';

function Protected({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return (
    <SchedulesProvider>
      <MainLayout>{children}</MainLayout>
    </SchedulesProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated() ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/s/:token" element={<SharedPage />} />
        <Route path="/schedule/:id" element={<Protected><SchedulePage /></Protected>} />
        <Route path="/" element={<Protected><HomePage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
