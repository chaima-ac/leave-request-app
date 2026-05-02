import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import MyRequests from './pages/MyRequests';
import NewRequest from './pages/NewRequest';
import AdminDashboard from './pages/AdminDashboard';
import HRDashboard from './pages/HRDashboard';
import AdminRequests from './pages/AdminRequests';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerRequests from './pages/ManagerRequests';
import ManagerTeam from './pages/ManagerTeam';
import UsersPage from './pages/Userspage';
import AnalyticsPage from './pages/AnalyticsPage';
import './i18n';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role) return <Navigate to={`/${user.role}`} replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Employee */}
            <Route path="/employee" element={<ProtectedRoute role="employee"><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="/employee/requests" element={<ProtectedRoute role="employee"><MyRequests /></ProtectedRoute>} />
            <Route path="/employee/new" element={<ProtectedRoute role="employee"><NewRequest /></ProtectedRoute>} />

            {/* Manager */}
            <Route path="/manager" element={<ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/requests" element={<ProtectedRoute role="manager"><ManagerRequests /></ProtectedRoute>} />
            <Route path="/manager/team" element={<ProtectedRoute role="manager"><ManagerTeam /></ProtectedRoute>} />
            <Route path="/manager/analytics" element={<ProtectedRoute role="manager"><AnalyticsPage /></ProtectedRoute>} />

            {/* HR */}
            <Route path="/hr" element={<ProtectedRoute role="hr"><HRDashboard /></ProtectedRoute>} />
            <Route path="/hr/requests" element={<ProtectedRoute role="hr"><AdminRequests /></ProtectedRoute>} />
            <Route path="/hr/analytics" element={<ProtectedRoute role="hr"><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/hr/users" element={<ProtectedRoute role="hr"><UsersPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/requests" element={<ProtectedRoute role="admin"><AdminRequests /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute role="admin"><UsersPage /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;