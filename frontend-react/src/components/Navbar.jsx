import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, Globe, Bell, LogOut, User, LayoutDashboard, FileText, PlusCircle, Users, BarChart3, Settings } from 'lucide-react';

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { dark, setDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleLang = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = {
    employee: [
      { path: '/employee', icon: <LayoutDashboard size={18} />, label: t('dashboard') },
      { path: '/employee/requests', icon: <FileText size={18} />, label: t('myRequests') },
      { path: '/employee/new', icon: <PlusCircle size={18} />, label: t('newRequest') },
    ],
    manager: [
      { path: '/manager', icon: <LayoutDashboard size={18} />, label: t('dashboard') },
      { path: '/manager/team', icon: <Users size={18} />, label: t('team') },
      { path: '/manager/requests', icon: <FileText size={18} />, label: t('allRequests') },
    ],
    hr: [
      { path: '/hr', icon: <LayoutDashboard size={18} />, label: t('dashboard') },
      { path: '/hr/requests', icon: <FileText size={18} />, label: t('allRequests') },
      { path: '/hr/analytics', icon: <BarChart3 size={18} />, label: t('analytics') },
      { path: '/hr/users', icon: <Users size={18} />, label: t('users') },
    ],
    admin: [
      { path: '/admin', icon: <LayoutDashboard size={18} />, label: t('dashboard') },
      { path: '/admin/requests', icon: <FileText size={18} />, label: t('allRequests') },
      { path: '/admin/analytics', icon: <BarChart3 size={18} />, label: t('analytics') },
      { path: '/admin/users', icon: <Users size={18} />, label: t('users') },
      { path: '/admin/settings', icon: <Settings size={18} />, label: t('settings') },
    ],
  };

  const links = navLinks[user?.role] || [];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">

        {/* Logo */}
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer"
            onClick={() => navigate(`/${user?.role || ''}`)}>
            🏢 LeaveDesk
          </span>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === link.path
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
              >
                {link.icon}
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button onClick={toggleLang}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Globe size={18} />
            {i18n.language.toUpperCase()}
          </button>

          {/* Theme toggle */}
          <button onClick={() => setDark(!dark)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;