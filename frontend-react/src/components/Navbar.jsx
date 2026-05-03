import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sun, Moon, Globe, LogOut, LayoutDashboard, FileText,
  PlusCircle, Users, BarChart3, Menu, X, Layers, Settings,
} from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { dark, setDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleLang = () => {
    const nl = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(nl);
    localStorage.setItem('language', nl);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLinks = {
    employee: [
      { path: '/employee',          icon: <LayoutDashboard size={16} />, label: t('dashboard') },
      { path: '/employee/requests', icon: <FileText size={16} />,        label: t('myRequests') },
      { path: '/employee/new',      icon: <PlusCircle size={16} />,      label: t('newRequest') },
    ],
    manager: [
      { path: '/manager',           icon: <LayoutDashboard size={16} />, label: t('dashboard') },
      { path: '/manager/team',      icon: <Users size={16} />,           label: t('team') },
      { path: '/manager/requests',  icon: <FileText size={16} />,        label: t('allRequests') },
      { path: '/manager/analytics', icon: <BarChart3 size={16} />,       label: t('analytics') },
    ],
    hr: [
      { path: '/hr',           icon: <LayoutDashboard size={16} />, label: t('dashboard') },
      { path: '/hr/requests',  icon: <FileText size={16} />,        label: t('allRequests') },
      { path: '/hr/analytics', icon: <BarChart3 size={16} />,       label: t('analytics') },
      { path: '/hr/users',     icon: <Users size={16} />,           label: t('users') },
    ],
    admin: [
      { path: '/admin',           icon: <LayoutDashboard size={16} />, label: t('dashboard') },
      { path: '/admin/requests',  icon: <FileText size={16} />,        label: t('allRequests') },
      { path: '/admin/analytics', icon: <BarChart3 size={16} />,       label: t('analytics') },
      { path: '/admin/users',     icon: <Users size={16} />,           label: t('users') },
      { path: '/admin/settings',  icon: <Settings size={16} />,        label: t('settings') },
    ],
  };

  const links = navLinks[user?.role] || [];
  const initial = user?.name?.charAt(0).toUpperCase() || '?';

  // Second line under the name: department if it exists, otherwise role
  const roleLine = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
  const userSubtitle = user?.department ? user.department : roleLine;

  return (
    <>
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

          {/* Logo + nav links */}
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(`/${user?.role || 'login'}`)}
              className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity flex-shrink-0">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Layers size={14} className="text-white" />
              </div>
              <span className="font-bold text-base text-slate-900 dark:text-white">LeaveDesk</span>
            </button>

            <div className="hidden md:flex items-center gap-0.5">
              {links.map(link => (
                <button key={link.path} onClick={() => navigate(link.path)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${location.pathname === link.path
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                  {link.icon}
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <button onClick={toggleLang}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Globe size={14} /> {i18n.language.toUpperCase()}
            </button>
            <button onClick={() => setDark(!dark)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <NotificationsDropdown />

            {/* User chip — shows name + dept·role */}
            <div className="hidden md:flex items-center gap-2.5 pl-3 ml-1 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {initial}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{user?.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 capitalize mt-0.5">{roleLine}{user?.department ? ` · ${user.department}` : ''}</p>
              </div>
            </div>

            <button onClick={handleLogout} title={t('logout')}
              className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors ml-1">
              <LogOut size={16} />
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1">
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {initial}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-slate-400 capitalize">{roleLine}{user?.department ? ` · ${user.department}` : ''}</p>
              </div>
            </div>
            {links.map(link => (
              <button key={link.path} onClick={() => { navigate(link.path); setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left
                  ${location.pathname === link.path
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {link.icon} {link.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button onClick={toggleLang}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Globe size={13} /> {i18n.language.toUpperCase()}
              </button>
              <button onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <LogOut size={13} /> {t('logout')}
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;