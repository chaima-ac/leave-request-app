import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleSelect from './pages/RoleSelect';
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import MyRequests from './pages/MyRequests';
import NewRequest from './pages/NewRequest';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import './i18n';

const HomeRedirect = () => {
  const { user } = useAuth();
  if (user) return <Navigate to={`/${user.role}`} replace />;
  return <RoleSelect />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login/:role" element={<LoginPage />} />

            {/* Employee */}
            <Route path="/employee" element={<ProtectedRoute role="employee"><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="/employee/requests" element={<ProtectedRoute role="employee"><MyRequests /></ProtectedRoute>} />
            <Route path="/employee/new" element={<ProtectedRoute role="employee"><NewRequest /></ProtectedRoute>} />

            {/* Manager */}
            <Route path="/manager" element={<ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/requests" element={<ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/team" element={<ProtectedRoute role="manager"><ManagerDashboard /></ProtectedRoute>} />

            {/* HR */}
            <Route path="/hr" element={<ProtectedRoute role="hr"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/hr/requests" element={<ProtectedRoute role="hr"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/hr/analytics" element={<ProtectedRoute role="hr"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/hr/users" element={<ProtectedRoute role="hr"><AdminDashboard /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/requests" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;